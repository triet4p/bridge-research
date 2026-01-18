// src-tauri/src/lib.rs
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Spawn the Python Sidecar
            let sidecar_command = app.shell().sidecar("bridge-ai-backend").unwrap();
            let (mut rx, _child) = sidecar_command
                .spawn()
                .expect("Failed to spawn sidecar");


            tauri::async_runtime::spawn(async move {
                // rx phải là mut để gọi .recv()
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            let text = String::from_utf8_lossy(&line);
                            println!("[PY]: {}", text.trim());
                        }
                        CommandEvent::Stderr(line) => {
                            let text = String::from_utf8_lossy(&line);
                            eprintln!("[PY ERR]: {}", text.trim());
                        }
                        _ => {
                            // Các event khác như Terminated, Error...
                        }
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}