use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_log::{Target, TargetKind};
use tauri::{Manager, State};
use std::sync::Mutex;

// 1. Trạng thái để kiểm soát việc khởi động Sidecar
struct AppState {
    sidecar_started: Mutex<bool>,
}

#[tauri::command]
async fn start_sidecar(app_handle: tauri::AppHandle, state: State<'_, AppState>) -> Result<String, String> {
    let mut started = state.sidecar_started.lock().unwrap();
    
    // Nếu đã khởi động rồi thì không làm gì thêm
    if *started {
        return Ok("Sidecar already running".into());
    }

    let handle = app_handle.clone();
    
    // 2. Spawn Sidecar trong một luồng riêng
    tauri::async_runtime::spawn(async move {
        let sidecar_command = handle.shell().sidecar("bridge-ai-backend").unwrap();
        let (mut rx, _child) = sidecar_command.spawn().expect("Failed to spawn sidecar");

        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    let text = String::from_utf8_lossy(&line);
                    log::info!(target: "python", "{}", text.trim());
                }
                CommandEvent::Stderr(line) => {
                    let text = String::from_utf8_lossy(&line);
                    log::error!(target: "python", "{}", text.trim());
                }
                _ => {}
            }
        }
    });

    *started = true;
    Ok("Sidecar start command issued".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState { sidecar_started: Mutex::new(false) }) // Đăng ký State
        .plugin(tauri_plugin_log::Builder::new()
            .targets([Target::new(TargetKind::Stdout), Target::new(TargetKind::Webview)])
            .build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 3. Hiện cửa sổ ngay lập tức, không block setup
            let window = app.get_webview_window("main").unwrap();
            window.maximize().unwrap(); 
            window.show().unwrap(); 
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![start_sidecar]) // Đăng ký Command
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}