import { Boxes, Layers, Power, Server, Cpu } from "lucide-react";
import { api } from "../api";
import { useFetch } from "../lib/useFetch";
import { Spinner, StatusDot } from "../components/ui";
import { useI18n } from "../i18n";
import type { RdStatus } from "../types";

export function Dashboard({ rd }: { rd: RdStatus | null }) {
  const { t } = useI18n();
  const summary = useFetch(() => api.dockerSummary(), [], 5000);

  return (
    <div className="cards">
      <div className="card">
        <div className="label">
          <Power size={14} /> {t("dashboard.rd")}
        </div>
        <div className="value" style={{ fontSize: 18 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <StatusDot on={rd?.running} />
            {t(rd?.running ? "status.running" : "status.stopped")}
          </span>
        </div>
        <div className="sub">{rd?.rdVersion || "—"}</div>
      </div>

      <div className="card">
        <div className="label">
          <Boxes size={14} /> {t("dashboard.containers")}
        </div>
        <div className="value">
          {summary.data ? summary.data.containersRunning : <Spinner />}
          <span style={{ fontSize: 15, color: "var(--text-faint)" }}>
            {" "}
            / {summary.data?.containersTotal ?? 0}
          </span>
        </div>
        <div className="sub">{t("dashboard.runningTotal")}</div>
      </div>

      <div className="card">
        <div className="label">
          <Layers size={14} /> {t("dashboard.images")}
        </div>
        <div className="value">
          {summary.data ? summary.data.images : <Spinner />}
        </div>
        <div className="sub">{t("dashboard.localImages")}</div>
      </div>

      <div className="card">
        <div className="label">
          <Cpu size={14} /> {t("dashboard.kubernetes")}
        </div>
        <div className="value" style={{ fontSize: 18 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <StatusDot on={rd?.kubernetesEnabled} />
            {t(rd?.kubernetesEnabled ? "status.enabled" : "status.disabled")}
          </span>
        </div>
        <div className="sub">{rd?.kubernetesVersion || "—"}</div>
      </div>

      <div className="card">
        <div className="label">
          <Server size={14} /> {t("dashboard.engine")}
        </div>
        <div className="value" style={{ fontSize: 18, textTransform: "capitalize" }}>
          {rd?.containerEngine || "—"}
        </div>
        <div className="sub">
          {t("dashboard.dockerServer", { version: summary.data?.serverVersion || "—" })}
        </div>
      </div>
    </div>
  );
}
