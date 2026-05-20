use crate::error::{AppError, AppResult};
use bollard::container::{
    ListContainersOptions, LogsOptions, RemoveContainerOptions, StopContainerOptions,
};
use bollard::image::{ListImagesOptions, RemoveImageOptions};
use bollard::Docker;
use futures_util::stream::StreamExt;
use serde::Serialize;
use std::path::PathBuf;

/// Rancher Desktop (moby) の docker.sock に接続する。
/// DOCKER_HOST > ~/.rd/docker.sock > /var/run/docker.sock の順で試す。
pub fn connect() -> AppResult<Docker> {
    if std::env::var("DOCKER_HOST").is_ok() {
        return Ok(Docker::connect_with_defaults()?);
    }

    let rd_sock = dirs::home_dir()
        .map(|h| h.join(".rd/docker.sock"))
        .filter(|p| p.exists());

    let sock: PathBuf = rd_sock.unwrap_or_else(|| PathBuf::from("/var/run/docker.sock"));

    Ok(Docker::connect_with_unix(
        &sock.to_string_lossy(),
        120,
        bollard::API_DEFAULT_VERSION,
    )?)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContainerInfo {
    pub id: String,
    pub name: String,
    pub image: String,
    pub state: String,
    pub status: String,
    pub created: i64,
    pub ports: Vec<String>,
    /// docker-compose プロジェクト名（com.docker.compose.project ラベル）
    pub compose_project: Option<String>,
    /// docker-compose サービス名（com.docker.compose.service ラベル）
    pub compose_service: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageInfo {
    pub id: String,
    pub tags: Vec<String>,
    pub size: i64,
    pub created: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerSummary {
    pub containers_running: i64,
    pub containers_total: i64,
    pub images: i64,
    pub server_version: String,
}

pub async fn list_containers() -> AppResult<Vec<ContainerInfo>> {
    let docker = connect()?;
    let options = ListContainersOptions::<String> {
        all: true,
        ..Default::default()
    };
    let containers = docker.list_containers(Some(options)).await?;

    let infos = containers
        .into_iter()
        .map(|c| {
            let name = c
                .names
                .as_ref()
                .and_then(|n| n.first().cloned())
                .map(|n| n.trim_start_matches('/').to_string())
                .unwrap_or_default();
            // ポートは `25432->5432/tcp` 形式。IPv4/IPv6 で重複するので除去する。
            let mut seen = std::collections::HashSet::new();
            let ports = c
                .ports
                .unwrap_or_default()
                .into_iter()
                .map(|p| {
                    let proto = p
                        .typ
                        .map(|t| format!("{:?}", t).to_lowercase())
                        .unwrap_or_else(|| "tcp".into());
                    match p.public_port {
                        Some(pub_p) => format!("{}->{}/{}", pub_p, p.private_port, proto),
                        None => format!("{}/{}", p.private_port, proto),
                    }
                })
                .filter(|s| seen.insert(s.clone()))
                .collect();
            let labels = c.labels.unwrap_or_default();
            ContainerInfo {
                id: c.id.unwrap_or_default(),
                name,
                image: c.image.unwrap_or_default(),
                state: c.state.unwrap_or_default(),
                status: c.status.unwrap_or_default(),
                created: c.created.unwrap_or_default(),
                ports,
                compose_project: labels.get("com.docker.compose.project").cloned(),
                compose_service: labels.get("com.docker.compose.service").cloned(),
            }
        })
        .collect();
    Ok(infos)
}

pub async fn start_container(id: &str) -> AppResult<()> {
    let docker = connect()?;
    docker
        .start_container::<String>(id, None)
        .await
        .map_err(AppError::from)
}

pub async fn stop_container(id: &str) -> AppResult<()> {
    let docker = connect()?;
    docker
        .stop_container(id, Some(StopContainerOptions { t: 10 }))
        .await
        .map_err(AppError::from)
}

pub async fn restart_container(id: &str) -> AppResult<()> {
    let docker = connect()?;
    docker
        .restart_container(id, None)
        .await
        .map_err(AppError::from)
}

pub async fn remove_container(id: &str, force: bool) -> AppResult<()> {
    let docker = connect()?;
    docker
        .remove_container(
            id,
            Some(RemoveContainerOptions {
                force,
                ..Default::default()
            }),
        )
        .await
        .map_err(AppError::from)
}

pub async fn container_logs(id: &str, tail: &str) -> AppResult<String> {
    let docker = connect()?;
    let options = LogsOptions::<String> {
        stdout: true,
        stderr: true,
        timestamps: false,
        tail: tail.to_string(),
        ..Default::default()
    };
    let mut stream = docker.logs(id, Some(options));
    let mut out = String::new();
    while let Some(item) = stream.next().await {
        match item {
            Ok(log) => out.push_str(&log.to_string()),
            Err(e) => return Err(AppError::from(e)),
        }
    }
    Ok(out)
}

pub async fn list_images() -> AppResult<Vec<ImageInfo>> {
    let docker = connect()?;
    let options = ListImagesOptions::<String> {
        all: false,
        ..Default::default()
    };
    let images = docker.list_images(Some(options)).await?;
    let infos = images
        .into_iter()
        .map(|i| ImageInfo {
            id: i.id,
            tags: i
                .repo_tags
                .into_iter()
                .filter(|t| t != "<none>:<none>")
                .collect(),
            size: i.size,
            created: i.created,
        })
        .collect();
    Ok(infos)
}

pub async fn remove_image(id: &str, force: bool) -> AppResult<()> {
    let docker = connect()?;
    docker
        .remove_image(
            id,
            Some(RemoveImageOptions {
                force,
                ..Default::default()
            }),
            None,
        )
        .await?;
    Ok(())
}

pub async fn summary() -> AppResult<DockerSummary> {
    let docker = connect()?;
    let info = docker.info().await?;
    let version = docker.version().await?;
    let images = list_images().await?;
    Ok(DockerSummary {
        containers_running: info.containers_running.unwrap_or(0),
        containers_total: info.containers.unwrap_or(0),
        images: images.len() as i64,
        server_version: version.version.unwrap_or_default(),
    })
}

/// docker が到達可能かを ping で確認する。
pub async fn ping() -> bool {
    match connect() {
        Ok(d) => d.ping().await.is_ok(),
        Err(_) => false,
    }
}
