use crate::error::{AppError, AppResult};
use serde::Serialize;
use serde_json::Value;
use std::path::PathBuf;
use tokio::process::Command;

/// rdctl のパスを解決する。~/.rd/bin/rdctl を優先し、無ければ PATH 上の rdctl。
fn rdctl_path() -> String {
    if let Some(home) = dirs::home_dir() {
        let p: PathBuf = home.join(".rd/bin/rdctl");
        if p.exists() {
            return p.to_string_lossy().into_owned();
        }
    }
    "rdctl".to_string()
}

async fn run(args: &[&str]) -> AppResult<String> {
    let output = Command::new(rdctl_path())
        .args(args)
        .output()
        .await
        .map_err(|e| AppError::Rdctl(e.to_string()))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::Rdctl(stderr.trim().to_string()));
    }
    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RdStatus {
    /// バックエンドが稼働しているか
    pub running: bool,
    pub container_engine: String,
    pub kubernetes_enabled: bool,
    pub kubernetes_version: String,
    pub rd_version: String,
}

pub async fn status() -> AppResult<RdStatus> {
    // list-settings が成功すれば稼働中とみなす
    let settings_raw = run(&["list-settings"]).await;
    let running = settings_raw.is_ok();

    let version_raw = run(&["version"]).await.unwrap_or_default();
    let rd_version = version_raw
        .lines()
        .find(|l| l.contains("client version"))
        .and_then(|l| l.split(':').nth(1))
        .map(|s| s.trim().trim_end_matches(", targeting server version").to_string())
        .unwrap_or_default();

    if !running {
        return Ok(RdStatus {
            running: false,
            container_engine: String::new(),
            kubernetes_enabled: false,
            kubernetes_version: String::new(),
            rd_version,
        });
    }

    let settings: Value = serde_json::from_str(&settings_raw.unwrap())?;
    let container_engine = settings
        .pointer("/containerEngine/name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let kubernetes_enabled = settings
        .pointer("/kubernetes/enabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let kubernetes_version = settings
        .pointer("/kubernetes/version")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    Ok(RdStatus {
        running: true,
        container_engine,
        kubernetes_enabled,
        kubernetes_version,
        rd_version,
    })
}

pub async fn settings() -> AppResult<Value> {
    let raw = run(&["list-settings"]).await?;
    Ok(serde_json::from_str(&raw)?)
}

pub async fn start() -> AppResult<()> {
    run(&["start"]).await.map(|_| ())
}

pub async fn shutdown() -> AppResult<()> {
    run(&["shutdown"]).await.map(|_| ())
}

pub async fn set_kubernetes(enabled: bool) -> AppResult<()> {
    let flag = if enabled {
        "--kubernetes.enabled=true"
    } else {
        "--kubernetes.enabled=false"
    };
    run(&["set", flag]).await.map(|_| ())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub name: String,
    pub created: String,
    pub description: String,
}

pub async fn list_snapshots() -> AppResult<Vec<Snapshot>> {
    let raw = run(&["snapshot", "list", "--json"]).await?;
    // 各行が 1 つの JSON オブジェクト（json-lines）で返る
    let mut snaps = Vec::new();
    for line in raw.lines().filter(|l| !l.trim().is_empty()) {
        if let Ok(v) = serde_json::from_str::<Value>(line) {
            snaps.push(Snapshot {
                name: v.get("name").and_then(|x| x.as_str()).unwrap_or("").to_string(),
                created: v.get("created").and_then(|x| x.as_str()).unwrap_or("").to_string(),
                description: v
                    .get("description")
                    .and_then(|x| x.as_str())
                    .unwrap_or("")
                    .to_string(),
            });
        }
    }
    Ok(snaps)
}

pub async fn create_snapshot(name: &str, description: &str) -> AppResult<()> {
    let mut args = vec!["snapshot", "create", name];
    if !description.is_empty() {
        args.push("--description");
        args.push(description);
    }
    run(&args).await.map(|_| ())
}

pub async fn delete_snapshot(name: &str) -> AppResult<()> {
    run(&["snapshot", "delete", name]).await.map(|_| ())
}
