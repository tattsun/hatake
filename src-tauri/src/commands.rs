use crate::docker;
use crate::error::AppResult;
use crate::k8s;
use crate::rd;
use serde::Serialize;
use serde_json::Value;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Health {
    pub docker: bool,
    pub kubernetes: bool,
}

// ---- 全体状態 -------------------------------------------------------------

#[tauri::command]
pub async fn health() -> Health {
    Health {
        docker: docker::ping().await,
        kubernetes: k8s::reachable().await,
    }
}

#[tauri::command]
pub async fn rd_status() -> AppResult<rd::RdStatus> {
    rd::status().await
}

#[tauri::command]
pub async fn rd_settings() -> AppResult<Value> {
    rd::settings().await
}

#[tauri::command]
pub async fn rd_start() -> AppResult<()> {
    rd::start().await
}

#[tauri::command]
pub async fn rd_shutdown() -> AppResult<()> {
    rd::shutdown().await
}

#[tauri::command]
pub async fn rd_set_kubernetes(enabled: bool) -> AppResult<()> {
    rd::set_kubernetes(enabled).await
}

// ---- Docker ---------------------------------------------------------------

#[tauri::command]
pub async fn docker_summary() -> AppResult<docker::DockerSummary> {
    docker::summary().await
}

#[tauri::command]
pub async fn list_containers() -> AppResult<Vec<docker::ContainerInfo>> {
    docker::list_containers().await
}

#[tauri::command]
pub async fn start_container(id: String) -> AppResult<()> {
    docker::start_container(&id).await
}

#[tauri::command]
pub async fn stop_container(id: String) -> AppResult<()> {
    docker::stop_container(&id).await
}

#[tauri::command]
pub async fn restart_container(id: String) -> AppResult<()> {
    docker::restart_container(&id).await
}

#[tauri::command]
pub async fn remove_container(id: String, force: bool) -> AppResult<()> {
    docker::remove_container(&id, force).await
}

#[tauri::command]
pub async fn container_logs(id: String, tail: Option<String>) -> AppResult<String> {
    docker::container_logs(&id, &tail.unwrap_or_else(|| "500".into())).await
}

#[tauri::command]
pub async fn list_images() -> AppResult<Vec<docker::ImageInfo>> {
    docker::list_images().await
}

#[tauri::command]
pub async fn remove_image(id: String, force: bool) -> AppResult<()> {
    docker::remove_image(&id, force).await
}

// ---- Kubernetes -----------------------------------------------------------

#[tauri::command]
pub async fn k8s_namespaces() -> AppResult<Vec<String>> {
    k8s::list_namespaces().await
}

#[tauri::command]
pub async fn k8s_pods(namespace: Option<String>) -> AppResult<Vec<k8s::PodInfo>> {
    k8s::list_pods(namespace).await
}

#[tauri::command]
pub async fn k8s_deployments(namespace: Option<String>) -> AppResult<Vec<k8s::DeploymentInfo>> {
    k8s::list_deployments(namespace).await
}

#[tauri::command]
pub async fn k8s_services(namespace: Option<String>) -> AppResult<Vec<k8s::ServiceInfo>> {
    k8s::list_services(namespace).await
}

#[tauri::command]
pub async fn k8s_nodes() -> AppResult<Vec<k8s::NodeInfo>> {
    k8s::list_nodes().await
}

// ---- Snapshots ------------------------------------------------------------

#[tauri::command]
pub async fn snapshot_list() -> AppResult<Vec<rd::Snapshot>> {
    rd::list_snapshots().await
}

#[tauri::command]
pub async fn snapshot_create(name: String, description: Option<String>) -> AppResult<()> {
    rd::create_snapshot(&name, &description.unwrap_or_default()).await
}

#[tauri::command]
pub async fn snapshot_delete(name: String) -> AppResult<()> {
    rd::delete_snapshot(&name).await
}
