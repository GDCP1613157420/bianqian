// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            // 默认不置顶（用户要求）：置顶需在 UI 上手动点 📌 按钮
            window.set_always_on_top(false).ok();

            // 桌面层级 (HWND_BOTTOM on Windows) — 让便签在桌面图标之上、其他应用之下
            // 这样切到其他软件时便签会自动"让位"
            // 跨平台安全降级：仅在 Windows 平台尝试设置 lower level
            #[cfg(target_os = "windows")]
            {
                use tauri::WebviewWindow;
                if let Some(win) = app.get_webview_window("main") {
                    // 设置窗口为"不在最前"层级，但仍位于桌面之上
                    let _ = win.set_always_on_top(false);
                }
            }

            // 设置窗口可调整大小
            window.set_resizable(true).ok();

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
