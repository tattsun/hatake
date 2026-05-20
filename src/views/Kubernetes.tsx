import { useState } from "react";
import type { ReactElement } from "react";
import { Cpu } from "lucide-react";
import { api } from "../api";
import { useFetch } from "../lib/useFetch";
import { Empty, Pill, Spinner } from "../components/ui";
import { useI18n } from "../i18n";
import type { TKey } from "../i18n";
import { phaseClass, relativeTime } from "../lib/format";
import type { RdStatus } from "../types";

type Tab = "pods" | "deployments" | "services" | "nodes";
const TAB_KEY: Record<Tab, TKey> = {
  pods: "k8s.tab.pods",
  deployments: "k8s.tab.deployments",
  services: "k8s.tab.services",
  nodes: "k8s.tab.nodes",
};

export function Kubernetes({ rd }: { rd: RdStatus | null }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("pods");
  const [ns, setNs] = useState<string>("all");
  const namespaces = useFetch(() => api.k8sNamespaces(), []);

  if (rd && !rd.kubernetesEnabled) {
    return <div className="banner warn">{t("k8s.disabledNotice")}</div>;
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <Cpu size={15} />
        <h2>{t("k8s.title")}</h2>
        <div className="tabs" style={{ marginLeft: 12 }}>
          {(["pods", "deployments", "services", "nodes"] as Tab[]).map((tb) => (
            <button
              key={tb}
              className={`tab ${tab === tb ? "active" : ""}`}
              onClick={() => setTab(tb)}
            >
              {t(TAB_KEY[tb])}
            </button>
          ))}
        </div>
        <span className="spacer" />
        {tab !== "nodes" && (
          <select value={ns} onChange={(e) => setNs(e.target.value)}>
            <option value="all">{t("k8s.allNamespaces")}</option>
            {namespaces.data?.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        )}
      </div>

      {tab === "pods" && <Pods ns={ns} />}
      {tab === "deployments" && <Deployments ns={ns} />}
      {tab === "services" && <Services ns={ns} />}
      {tab === "nodes" && <Nodes />}
    </div>
  );
}

/** ロード中・エラー・空のときは表示用ノードを返し、データ表示すべきときは null を返す */
function gate(
  t: (key: TKey) => string,
  error: string | null,
  loading: boolean,
  empty: boolean,
): ReactElement | null {
  if (error) return <div className="banner err" style={{ margin: 14 }}>{error}</div>;
  if (loading) return <Empty icon={<Spinner />} text={t("common.loading")} />;
  if (empty) return <Empty text={t("k8s.empty")} />;
  return null;
}

function Pods({ ns }: { ns: string }) {
  const { t } = useI18n();
  const { data, error, loading } = useFetch(() => api.k8sPods(ns), [ns], 5000);
  const g = gate(t, error, loading && !data, !!data && data.length === 0);
  if (g) return g;
  return (
    <table>
      <thead>
        <tr>
          <th>{t("common.name")}</th>
          <th>{t("k8s.col.namespace")}</th>
          <th>{t("common.state")}</th>
          <th>{t("k8s.col.ready")}</th>
          <th>{t("k8s.col.restarts")}</th>
          <th>{t("k8s.col.node")}</th>
          <th>{t("k8s.col.age")}</th>
        </tr>
      </thead>
      <tbody>
        {data?.map((p) => (
          <tr key={`${p.namespace}/${p.name}`}>
            <td className="strong">{p.name}</td>
            <td>{p.namespace}</td>
            <td><Pill kind={phaseClass(p.phase)}>{p.phase}</Pill></td>
            <td className="mono">{p.ready}</td>
            <td>{p.restarts}</td>
            <td className="mono">{p.node || "—"}</td>
            <td>{relativeTime(p.age)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Deployments({ ns }: { ns: string }) {
  const { t } = useI18n();
  const { data, error, loading } = useFetch(() => api.k8sDeployments(ns), [ns], 5000);
  const g = gate(t, error, loading && !data, !!data && data.length === 0);
  if (g) return g;
  return (
    <table>
      <thead>
        <tr>
          <th>{t("common.name")}</th>
          <th>{t("k8s.col.namespace")}</th>
          <th>{t("k8s.col.ready")}</th>
          <th>{t("k8s.col.age")}</th>
        </tr>
      </thead>
      <tbody>
        {data?.map((d) => (
          <tr key={`${d.namespace}/${d.name}`}>
            <td className="strong">{d.name}</td>
            <td>{d.namespace}</td>
            <td className="mono">{d.ready}</td>
            <td>{relativeTime(d.age)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Services({ ns }: { ns: string }) {
  const { t } = useI18n();
  const { data, error, loading } = useFetch(() => api.k8sServices(ns), [ns], 5000);
  const g = gate(t, error, loading && !data, !!data && data.length === 0);
  if (g) return g;
  return (
    <table>
      <thead>
        <tr>
          <th>{t("common.name")}</th>
          <th>{t("k8s.col.namespace")}</th>
          <th>{t("k8s.col.kind")}</th>
          <th>{t("k8s.col.clusterIp")}</th>
          <th>{t("common.ports")}</th>
        </tr>
      </thead>
      <tbody>
        {data?.map((s) => (
          <tr key={`${s.namespace}/${s.name}`}>
            <td className="strong">{s.name}</td>
            <td>{s.namespace}</td>
            <td>{s.kind}</td>
            <td className="mono">{s.clusterIp}</td>
            <td className="mono">{s.ports.join(", ") || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Nodes() {
  const { t } = useI18n();
  const { data, error, loading } = useFetch(() => api.k8sNodes(), [], 10000);
  const g = gate(t, error, loading && !data, !!data && data.length === 0);
  if (g) return g;
  return (
    <table>
      <thead>
        <tr>
          <th>{t("common.name")}</th>
          <th>{t("common.state")}</th>
          <th>{t("k8s.col.version")}</th>
        </tr>
      </thead>
      <tbody>
        {data?.map((n) => (
          <tr key={n.name}>
            <td className="strong">{n.name}</td>
            <td><Pill kind={n.status === "Ready" ? "ready" : "failed"}>{n.status}</Pill></td>
            <td className="mono">{n.version}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
