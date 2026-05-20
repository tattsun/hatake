use crate::docker;
use bollard::container::LogsOptions;
use futures_util::stream::StreamExt;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::ipc::Channel;
use tauri::async_runtime::JoinHandle;

/// 進行中のログ follow ストリームを id ごとに保持し、停止できるようにする。
#[derive(Default)]
pub struct LogStreams(pub Mutex<HashMap<u32, JoinHandle<()>>>);

fn stop_inner(state: &tauri::State<'_, LogStreams>, id: u32) {
    if let Some(handle) = state.0.lock().unwrap().remove(&id) {
        handle.abort();
    }
}

/// コンテナのログを follow（tail -f 相当）し、受信した行を Channel 経由でフロントに送る。
#[tauri::command]
pub async fn start_log_stream(
    state: tauri::State<'_, LogStreams>,
    id: u32,
    container: String,
    channel: Channel<String>,
) -> Result<(), String> {
    // 同 id の既存ストリームがあれば止める
    stop_inner(&state, id);

    let handle = tauri::async_runtime::spawn(async move {
        let docker = match docker::connect() {
            Ok(d) => d,
            Err(e) => {
                let _ = channel.send(format!("[hatake] 接続エラー: {e}\n"));
                return;
            }
        };
        let opts = LogsOptions::<String> {
            stdout: true,
            stderr: true,
            follow: true,
            tail: "200".to_string(),
            ..Default::default()
        };
        let mut stream = docker.logs(&container, Some(opts));
        while let Some(item) = stream.next().await {
            match item {
                // フロント側が受信をやめたら送信に失敗するのでループを抜ける
                Ok(out) => {
                    if channel.send(out.to_string()).is_err() {
                        break;
                    }
                }
                Err(e) => {
                    let _ = channel.send(format!("[hatake] ストリームエラー: {e}\n"));
                    break;
                }
            }
        }
    });

    state.0.lock().unwrap().insert(id, handle);
    Ok(())
}

/// follow ストリームを停止する。
#[tauri::command]
pub fn stop_log_stream(state: tauri::State<'_, LogStreams>, id: u32) {
    stop_inner(&state, id);
}
