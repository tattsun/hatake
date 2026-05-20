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
import { isDemo } from "./lib/demo";
import * as mock from "./lib/mock";

const D = <T>(value: T) => Promise.resolve(value);
const nsFilter = (ns: string | undefined) => (item: { namespace: string }) =>
  !ns || ns === "all" || item.namespace === ns;

export const api = {
  // 全体状態
  health: () => (isDemo() ? D(mock.mockHealth()) : invoke<Health>("health")),
  rdStatus: () => (isDemo() ? D(mock.mockRdStatus()) : invoke<RdStatus>("rd_status")),
  rdSettings: () => (isDemo() ? D(mock.mockSettings()) : invoke<unknown>("rd_settings")),
  rdStart: () => (isDemo() ? D(undefined) : invoke<void>("rd_start")),
  rdShutdown: () => (isDemo() ? D(undefined) : invoke<void>("rd_shutdown")),
  rdSetKubernetes: (enabled: boolean) =>
    isDemo() ? D(undefined) : invoke<void>("rd_set_kubernetes", { enabled }),

  // Docker
  dockerSummary: () =>
    isDemo() ? D(mock.mockSummary()) : invoke<DockerSummary>("docker_summary"),
  listContainers: () =>
    isDemo() ? D(mock.mockContainers()) : invoke<ContainerInfo[]>("list_containers"),
  startContainer: (id: string) =>
    isDemo() ? D(undefined) : invoke<void>("start_container", { id }),
  stopContainer: (id: string) =>
    isDemo() ? D(undefined) : invoke<void>("stop_container", { id }),
  restartContainer: (id: string) =>
    isDemo() ? D(undefined) : invoke<void>("restart_container", { id }),
  removeContainer: (id: string, force: boolean) =>
    isDemo() ? D(undefined) : invoke<void>("remove_container", { id, force }),
  containerLogs: (id: string, tail?: string) =>
    isDemo() ? D(mock.mockLogs(id)) : invoke<string>("container_logs", { id, tail }),
  startLogStream: (id: number, container: string, channel: Channel<string>) =>
    isDemo() ? D(undefined) : invoke<void>("start_log_stream", { id, container, channel }),
  stopLogStream: (id: number) =>
    isDemo() ? D(undefined) : invoke<void>("stop_log_stream", { id }),
  listImages: () =>
    isDemo() ? D(mock.mockImages()) : invoke<ImageInfo[]>("list_images"),
  removeImage: (id: string, force: boolean) =>
    isDemo() ? D(undefined) : invoke<void>("remove_image", { id, force }),

  // Kubernetes
  k8sNamespaces: () =>
    isDemo() ? D(mock.mockNamespaces()) : invoke<string[]>("k8s_namespaces"),
  k8sPods: (namespace?: string) =>
    isDemo()
      ? D(mock.mockPods().filter(nsFilter(namespace)))
      : invoke<PodInfo[]>("k8s_pods", { namespace }),
  k8sDeployments: (namespace?: string) =>
    isDemo()
      ? D(mock.mockDeployments().filter(nsFilter(namespace)))
      : invoke<DeploymentInfo[]>("k8s_deployments", { namespace }),
  k8sServices: (namespace?: string) =>
    isDemo()
      ? D(mock.mockServices().filter(nsFilter(namespace)))
      : invoke<ServiceInfo[]>("k8s_services", { namespace }),
  k8sNodes: () => (isDemo() ? D(mock.mockNodes()) : invoke<NodeInfo[]>("k8s_nodes")),

  // Snapshots
  snapshotList: () =>
    isDemo() ? D(mock.mockSnapshots()) : invoke<Snapshot[]>("snapshot_list"),
  snapshotCreate: (name: string, description?: string) =>
    isDemo() ? D(undefined) : invoke<void>("snapshot_create", { name, description }),
  snapshotDelete: (name: string) =>
    isDemo() ? D(undefined) : invoke<void>("snapshot_delete", { name }),
};
