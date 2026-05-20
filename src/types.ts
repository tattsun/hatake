// Rust 側 DTO に対応する TypeScript 型

export interface Health {
  docker: boolean;
  kubernetes: boolean;
}

export interface RdStatus {
  running: boolean;
  containerEngine: string;
  kubernetesEnabled: boolean;
  kubernetesVersion: string;
  rdVersion: string;
}

export interface DockerSummary {
  containersRunning: number;
  containersTotal: number;
  images: number;
  serverVersion: string;
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  created: number;
  ports: string[];
  composeProject: string | null;
  composeService: string | null;
}

export interface ImageInfo {
  id: string;
  tags: string[];
  size: number;
  created: number;
}

export interface PodInfo {
  name: string;
  namespace: string;
  phase: string;
  node: string;
  restarts: number;
  ready: string;
  age: string | null;
}

export interface DeploymentInfo {
  name: string;
  namespace: string;
  ready: string;
  age: string | null;
}

export interface ServiceInfo {
  name: string;
  namespace: string;
  kind: string;
  clusterIp: string;
  ports: string[];
}

export interface NodeInfo {
  name: string;
  status: string;
  version: string;
}

export interface Snapshot {
  name: string;
  created: string;
  description: string;
}
