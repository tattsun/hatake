// デモモード用のダミーデータ。録画時にリアルに見えるよう作り込んだ固定データ。
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
} from "../types";

const nowSec = () => Math.floor(Date.now() / 1000);
const h = (hours: number) => nowSec() - hours * 3600;

type Spec = {
  project: string | null;
  service: string;
  image: string;
  state: "running" | "exited";
  ports: string[];
  ageH: number;
};

const SPECS: Spec[] = [
  // shop（フル稼働の compose プロジェクト）
  { project: "shop", service: "web", image: "nginx:1.27-alpine", state: "running", ports: ["8080->80/tcp"], ageH: 5 },
  { project: "shop", service: "api", image: "ghcr.io/acme/shop-api:1.4.2", state: "running", ports: ["3000->3000/tcp"], ageH: 5 },
  { project: "shop", service: "worker", image: "ghcr.io/acme/shop-api:1.4.2", state: "running", ports: [], ageH: 5 },
  { project: "shop", service: "postgres", image: "postgres:16-alpine", state: "running", ports: ["5432->5432/tcp"], ageH: 5 },
  { project: "shop", service: "redis", image: "redis:7-alpine", state: "running", ports: ["6379->6379/tcp"], ageH: 5 },
  // blog（一部停止）
  { project: "blog", service: "wordpress", image: "wordpress:6.7-php8.3-apache", state: "running", ports: ["8081->80/tcp"], ageH: 28 },
  { project: "blog", service: "mysql", image: "mysql:8.4", state: "running", ports: ["3306->3306/tcp"], ageH: 28 },
  { project: "blog", service: "adminer", image: "adminer:4.8.1", state: "exited", ports: [], ageH: 28 },
  // analytics（停止中）
  { project: "analytics", service: "grafana", image: "grafana/grafana:11.3.0", state: "exited", ports: ["3001->3000/tcp"], ageH: 72 },
  { project: "analytics", service: "prometheus", image: "prom/prometheus:v3.0.1", state: "exited", ports: ["9090->9090/tcp"], ageH: 72 },
  // standalone
  { project: null, service: "registry", image: "registry:2.8.3", state: "running", ports: ["5000->5000/tcp"], ageH: 120 },
  { project: null, service: "vault", image: "hashicorp/vault:1.18", state: "running", ports: ["8200->8200/tcp"], ageH: 96 },
  { project: null, service: "playground", image: "node:22-slim", state: "exited", ports: [], ageH: 200 },
];

const HEX = "0123456789abcdef";
function fakeId(seed: number): string {
  let s = "";
  let x = seed * 2654435761;
  for (let i = 0; i < 64; i++) {
    x = (x * 48271) % 0x7fffffff;
    s += HEX[x & 0xf];
  }
  return s;
}

export function mockContainers(): ContainerInfo[] {
  return SPECS.map((spec, i) => {
    const name = spec.project
      ? `${spec.project}-${spec.service}-1`
      : spec.service;
    return {
      id: fakeId(i + 1),
      name,
      image: spec.image,
      state: spec.state,
      status:
        spec.state === "running"
          ? `Up ${spec.ageH < 24 ? `${spec.ageH} hours` : `${Math.floor(spec.ageH / 24)} days`}`
          : "Exited (0) 2 hours ago",
      created: h(spec.ageH),
      ports: spec.ports,
      composeProject: spec.project,
      composeService: spec.project ? spec.service : null,
    };
  });
}

export function mockImages(): ImageInfo[] {
  const imgs: [string, number, number][] = [
    ["nginx:1.27-alpine", 48_300_000, 5],
    ["postgres:16-alpine", 251_000_000, 5],
    ["redis:7-alpine", 41_200_000, 6],
    ["ghcr.io/acme/shop-api:1.4.2", 184_600_000, 5],
    ["wordpress:6.7-php8.3-apache", 712_000_000, 28],
    ["mysql:8.4", 588_000_000, 28],
    ["grafana/grafana:11.3.0", 426_000_000, 72],
    ["prom/prometheus:v3.0.1", 289_000_000, 72],
    ["node:22-slim", 221_000_000, 200],
    ["registry:2.8.3", 25_400_000, 120],
  ];
  return imgs.map(([tag, size, ageH], i) => ({
    id: `sha256:${fakeId(i + 100)}`,
    tags: [tag],
    size,
    created: h(ageH),
  }));
}

export function mockSummary(): DockerSummary {
  const c = mockContainers();
  return {
    containersRunning: c.filter((x) => x.state === "running").length,
    containersTotal: c.length,
    images: mockImages().length,
    serverVersion: "27.4.0",
  };
}

export function mockHealth(): Health {
  return { docker: true, kubernetes: true };
}

export function mockRdStatus(): RdStatus {
  return {
    running: true,
    containerEngine: "moby",
    kubernetesEnabled: true,
    kubernetesVersion: "v1.31.4",
    rdVersion: "1.22.0",
  };
}

export function mockNamespaces(): string[] {
  return ["default", "kube-system", "ingress-nginx", "monitoring"];
}

export function mockPods(): PodInfo[] {
  const iso = (hAgo: number) => new Date(Date.now() - hAgo * 3600_000).toISOString();
  const rows: [string, string, string, string, number, string][] = [
    ["web-5f9c8b7d4-2xk9p", "default", "Running", "node-01", 0, "1/1"],
    ["web-5f9c8b7d4-mq7rt", "default", "Running", "node-02", 0, "1/1"],
    ["api-6d4b9f7c8-lp2wz", "default", "Running", "node-01", 1, "1/1"],
    ["postgres-0", "default", "Running", "node-02", 0, "1/1"],
    ["coredns-7db6d8ff4d-abcde", "kube-system", "Running", "node-01", 0, "1/1"],
    ["ingress-nginx-controller-xkq9m", "ingress-nginx", "Running", "node-02", 2, "1/1"],
    ["prometheus-0", "monitoring", "Pending", "node-01", 0, "0/1"],
  ];
  return rows.map(([name, namespace, phase, node, restarts, ready], i) => ({
    name,
    namespace,
    phase,
    node,
    restarts,
    ready,
    age: iso(6 + i * 4),
  }));
}

export function mockDeployments(): DeploymentInfo[] {
  const iso = (hAgo: number) => new Date(Date.now() - hAgo * 3600_000).toISOString();
  const rows: [string, string, string][] = [
    ["web", "default", "2/2"],
    ["api", "default", "1/1"],
    ["coredns", "kube-system", "2/2"],
    ["ingress-nginx-controller", "ingress-nginx", "1/1"],
  ];
  return rows.map(([name, namespace, ready], i) => ({
    name,
    namespace,
    ready,
    age: iso(20 + i * 6),
  }));
}

export function mockServices(): ServiceInfo[] {
  const rows: [string, string, string, string, string[]][] = [
    ["web", "default", "ClusterIP", "10.43.0.21", ["80"]],
    ["api", "default", "ClusterIP", "10.43.0.45", ["3000"]],
    ["postgres", "default", "ClusterIP", "10.43.0.88", ["5432"]],
    ["kube-dns", "kube-system", "ClusterIP", "10.43.0.10", ["53"]],
    ["ingress-nginx", "ingress-nginx", "LoadBalancer", "10.43.0.100", ["80:30080", "443:30443"]],
  ];
  return rows.map(([name, namespace, kind, clusterIp, ports]) => ({
    name,
    namespace,
    kind,
    clusterIp,
    ports,
  }));
}

export function mockNodes(): NodeInfo[] {
  return [
    { name: "node-01", status: "Ready", version: "v1.31.4+k3s1" },
    { name: "node-02", status: "Ready", version: "v1.31.4+k3s1" },
  ];
}

export function mockSnapshots(): Snapshot[] {
  const iso = (dAgo: number) => new Date(Date.now() - dAgo * 86400_000).toISOString();
  return [
    { name: "baseline", created: iso(7), description: "Clean install" },
    { name: "before-upgrade", created: iso(2), description: "k8s 1.30 → 1.31" },
  ];
}

export function mockSettings(): unknown {
  return {
    version: 11,
    application: { adminAccess: false, telemetry: { enabled: false } },
    containerEngine: { name: "moby", allowedImages: { enabled: false, patterns: [] } },
    kubernetes: { version: "1.31.4", enabled: true, options: { traefik: true } },
    virtualMachine: { memoryInGB: 6, numberCPUs: 4 },
  };
}

export function mockLogs(container: string): string {
  const base = h(0);
  const ts = (off: number) => new Date((base - off) * 1000).toISOString();
  return [
    `${ts(40)} [info] starting ${container}`,
    `${ts(38)} [info] loading configuration from /etc/app/config.yaml`,
    `${ts(36)} [info] connected to database (pool size=10)`,
    `${ts(30)} [info] cache warmed: 1284 entries`,
    `${ts(24)} [info] listening on 0.0.0.0:3000`,
    `${ts(18)} [info] GET /healthz 200 1ms`,
    `${ts(12)} [info] GET /api/products 200 23ms`,
    `${ts(6)} [warn] slow query (148ms): SELECT * FROM orders WHERE ...`,
    `${ts(2)} [info] POST /api/checkout 201 64ms`,
  ].join("\n");
}

/** デモ用のライブログ 1 行を生成する */
let logSeq = 0;
export function mockLogLine(): string {
  const lines = [
    "[info] GET /api/products 200 19ms",
    "[info] GET /healthz 200 1ms",
    "[info] POST /api/cart 200 31ms",
    "[debug] cache hit ratio 0.94",
    "[info] GET /api/products/42 200 12ms",
    "[warn] retrying upstream request (attempt 2)",
    "[info] worker processed job #" + (1000 + logSeq),
  ];
  const line = lines[logSeq % lines.length];
  logSeq++;
  return `${new Date().toISOString()} ${line}\n`;
}
