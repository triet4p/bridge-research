// src-tauri/src/lib.rs
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_log::{Target, TargetKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new()
            .targets([
                Target::new(TargetKind::Stdout),
                Target::new(TargetKind::Webview),
            ])
            .build())
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
                            let text = text.trim();
                            if !text.is_empty() {
                                log::info!(target: "python", "{}", text);
                            }
                        }
                        CommandEvent::Stderr(line) => {
                            let text = String::from_utf8_lossy(&line);
                            let text = text.trim();
                            if !text.is_empty() {
                                log::error!(target: "python", "{}", text);
                            }
                        }
                        _ => {
                            // Other event
                        }
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}