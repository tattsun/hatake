mod commands;
mod docker;
mod error;
mod k8s;
mod logs;
mod rd;

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(logs::LogStreams::default())
        .setup(|app| {
            setup_tray(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // ウィンドウを閉じてもアプリは常駐させ、トレイから復帰できるようにする
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::health,
            commands::rd_status,
            commands::rd_settings,
            commands::rd_start,
            commands::rd_shutdown,
            commands::rd_set_kubernetes,
            commands::docker_summary,
            commands::list_containers,
            commands::start_container,
            commands::stop_container,
            commands::restart_container,
            commands::remove_container,
            commands::container_logs,
            commands::list_images,
            commands::remove_image,
            commands::k8s_namespaces,
            commands::k8s_pods,
            commands::k8s_deployments,
            commands::k8s_services,
            commands::k8s_nodes,
            commands::snapshot_list,
            commands::snapshot_create,
            commands::snapshot_delete,
            logs::start_log_stream,
            logs::stop_log_stream,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "ウィンドウを表示", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let rd_start = MenuItem::with_id(app, "rd_start", "Rancher Desktop を起動", true, None::<&str>)?;
    let rd_stop = MenuItem::with_id(app, "rd_stop", "Rancher Desktop を停止", true, None::<&str>)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Hatake を終了", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show, &sep1, &rd_start, &rd_stop, &sep2, &quit])?;

    let _tray = TrayIconBuilder::with_id("main-tray")
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("Hatake — Rancher Desktop")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "rd_start" => {
                tauri::async_runtime::spawn(async {
                    let _ = rd::start().await;
                });
            }
            "rd_stop" => {
                tauri::async_runtime::spawn(async {
                    let _ = rd::shutdown().await;
                });
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    Ok(())
}
