use crate::error::AppResult;
use k8s_openapi::api::apps::v1::Deployment;
use k8s_openapi::api::core::v1::{Namespace, Node, Pod, Service};
use kube::api::ListParams;
use kube::{Api, Client};
use serde::Serialize;

async fn client() -> AppResult<Client> {
    Ok(Client::try_default().await?)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PodInfo {
    pub name: String,
    pub namespace: String,
    pub phase: String,
    pub node: String,
    pub restarts: i32,
    pub ready: String,
    pub age: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeploymentInfo {
    pub name: String,
    pub namespace: String,
    pub ready: String,
    pub age: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceInfo {
    pub name: String,
    pub namespace: String,
    pub kind: String,
    pub cluster_ip: String,
    pub ports: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeInfo {
    pub name: String,
    pub status: String,
    pub version: String,
}

fn age_of(ts: Option<&k8s_openapi::apimachinery::pkg::apis::meta::v1::Time>) -> Option<String> {
    ts.map(|t| t.0.to_rfc3339())
}

pub async fn list_namespaces() -> AppResult<Vec<String>> {
    let api: Api<Namespace> = Api::all(client().await?);
    let list = api.list(&ListParams::default()).await?;
    Ok(list
        .into_iter()
        .filter_map(|n| n.metadata.name)
        .collect())
}

pub async fn list_pods(namespace: Option<String>) -> AppResult<Vec<PodInfo>> {
    let c = client().await?;
    let api: Api<Pod> = match namespace.as_deref() {
        Some(ns) if !ns.is_empty() && ns != "all" => Api::namespaced(c, ns),
        _ => Api::all(c),
    };
    let list = api.list(&ListParams::default()).await?;
    Ok(list
        .into_iter()
        .map(|p| {
            let status = p.status.unwrap_or_default();
            let cs = status.container_statuses.unwrap_or_default();
            let restarts: i32 = cs.iter().map(|s| s.restart_count).sum();
            let ready_n = cs.iter().filter(|s| s.ready).count();
            PodInfo {
                name: p.metadata.name.unwrap_or_default(),
                namespace: p.metadata.namespace.unwrap_or_default(),
                phase: status.phase.unwrap_or_else(|| "Unknown".into()),
                node: p.spec.and_then(|s| s.node_name).unwrap_or_default(),
                restarts,
                ready: format!("{}/{}", ready_n, cs.len()),
                age: age_of(p.metadata.creation_timestamp.as_ref()),
            }
        })
        .collect())
}

pub async fn list_deployments(namespace: Option<String>) -> AppResult<Vec<DeploymentInfo>> {
    let c = client().await?;
    let api: Api<Deployment> = match namespace.as_deref() {
        Some(ns) if !ns.is_empty() && ns != "all" => Api::namespaced(c, ns),
        _ => Api::all(c),
    };
    let list = api.list(&ListParams::default()).await?;
    Ok(list
        .into_iter()
        .map(|d| {
            let status = d.status.unwrap_or_default();
            let desired = d
                .spec
                .as_ref()
                .and_then(|s| s.replicas)
                .unwrap_or(0);
            DeploymentInfo {
                name: d.metadata.name.unwrap_or_default(),
                namespace: d.metadata.namespace.unwrap_or_default(),
                ready: format!("{}/{}", status.ready_replicas.unwrap_or(0), desired),
                age: age_of(d.metadata.creation_timestamp.as_ref()),
            }
        })
        .collect())
}

pub async fn list_services(namespace: Option<String>) -> AppResult<Vec<ServiceInfo>> {
    let c = client().await?;
    let api: Api<Service> = match namespace.as_deref() {
        Some(ns) if !ns.is_empty() && ns != "all" => Api::namespaced(c, ns),
        _ => Api::all(c),
    };
    let list = api.list(&ListParams::default()).await?;
    Ok(list
        .into_iter()
        .map(|s| {
            let spec = s.spec.unwrap_or_default();
            let ports = spec
                .ports
                .unwrap_or_default()
                .into_iter()
                .map(|p| match p.node_port {
                    Some(np) => format!("{}:{}", p.port, np),
                    None => format!("{}", p.port),
                })
                .collect();
            ServiceInfo {
                name: s.metadata.name.unwrap_or_default(),
                namespace: s.metadata.namespace.unwrap_or_default(),
                kind: spec.type_.unwrap_or_else(|| "ClusterIP".into()),
                cluster_ip: spec.cluster_ip.unwrap_or_default(),
                ports,
            }
        })
        .collect())
}

pub async fn list_nodes() -> AppResult<Vec<NodeInfo>> {
    let api: Api<Node> = Api::all(client().await?);
    let list = api.list(&ListParams::default()).await?;
    Ok(list
        .into_iter()
        .map(|n| {
            let status = n.status.unwrap_or_default();
            let ready = status
                .conditions
                .unwrap_or_default()
                .into_iter()
                .find(|c| c.type_ == "Ready")
                .map(|c| if c.status == "True" { "Ready" } else { "NotReady" })
                .unwrap_or("Unknown")
                .to_string();
            let version = status
                .node_info
                .map(|i| i.kubelet_version)
                .unwrap_or_default();
            NodeInfo {
                name: n.metadata.name.unwrap_or_default(),
                status: ready,
                version,
            }
        })
        .collect())
}

/// k8s API サーバが到達可能かを確認する。
pub async fn reachable() -> bool {
    match client().await {
        Ok(c) => {
            let api: Api<Node> = Api::all(c);
            api.list(&ListParams::default().limit(1)).await.is_ok()
        }
        Err(_) => false,
    }
}
