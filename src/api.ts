import { Channel, invoke } from "@tauri-apps/api/core";
import type {
  ContainerInfo,
  DeploymentInfo,
  DockerSummary,
  Health,
  ImageInfo,
  NodeInfo,
  PodInfo,
  RdStatus,
  ServiceInfo,
  Snapshot,
} from "./types";

export const api = {
  // 全体状態
  health: () => invoke<Health>("health"),
  rdStatus: () => invoke<RdStatus>("rd_status"),
  rdSettings: () => invoke<unknown>("rd_settings"),
  rdStart: () => invoke<void>("rd_start"),
  rdShutdown: () => invoke<void>("rd_shutdown"),
  rdSetKubernetes: (enabled: boolean) =>
    invoke<void>("rd_set_kubernetes", { enabled }),

  // Docker
  dockerSummary: () => invoke<DockerSummary>("docker_summary"),
  listContainers: () => invoke<ContainerInfo[]>("list_containers"),
  startContainer: (id: string) => invoke<void>("start_container", { id }),
  stopContainer: (id: string) => invoke<void>("stop_container", { id }),
  restartContainer: (id: string) => invoke<void>("restart_container", { id }),
  removeContainer: (id: string, force: boolean) =>
    invoke<void>("remove_container", { id, force }),
  containerLogs: (id: string, tail?: string) =>
    invoke<string>("container_logs", { id, tail }),
  startLogStream: (id: number, container: string, channel: Channel<string>) =>
    invoke<void>("start_log_stream", { id, container, channel }),
  stopLogStream: (id: number) => invoke<void>("stop_log_stream", { id }),
  listImages: () => invoke<ImageInfo[]>("list_images"),
  removeImage: (id: string, force: boolean) =>
    invoke<void>("remove_image", { id, force }),

  // Kubernetes
  k8sNamespaces: () => invoke<string[]>("k8s_namespaces"),
  k8sPods: (namespace?: string) => invoke<PodInfo[]>("k8s_pods", { namespace }),
  k8sDeployments: (namespace?: string) =>
    invoke<DeploymentInfo[]>("k8s_deployments", { namespace }),
  k8sServices: (namespace?: string) =>
    invoke<ServiceInfo[]>("k8s_services", { namespace }),
  k8sNodes: () => invoke<NodeInfo[]>("k8s_nodes"),

  // Snapshots
  snapshotList: () => invoke<Snapshot[]>("snapshot_list"),
  snapshotCreate: (name: string, description?: string) =>
    invoke<void>("snapshot_create", { name, description }),
  snapshotDelete: (name: string) => invoke<void>("snapshot_delete", { name }),
};
