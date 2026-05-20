import { useState } from "react";
import {
  Boxes,
  Cpu,
  LayoutDashboard,
  Layers,
  Network,
  Settings as Cog,
  Sprout,
} from "lucide-react";
import { api } from "./api";
import { useFetch } from "./lib/useFetch";
import { StatusDot } from "./components/ui";
import { useI18n } from "./i18n";
import type { TKey } from "./i18n";
import { Dashboard } from "./views/Dashboard";
import { Projects } from "./views/Projects";
import { Containers } from "./views/Containers";
import { Images } from "./views/Images";
import { Kubernetes } from "./views/Kubernetes";
import { Settings } from "./views/Settings";
import "./styles.css";

type View = "dashboard" | "projects" | "containers" | "images" | "k8s" | "settings";

const NAV: { id: View; labelKey: TKey; icon: typeof Boxes }[] = [
  { id: "dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { id: "projects", labelKey: "nav.projects", icon: Network },
  { id: "containers", labelKey: "nav.containers", icon: Boxes },
  { id: "images", labelKey: "nav.images", icon: Layers },
  { id: "k8s", labelKey: "nav.kubernetes", icon: Cpu },
  { id: "settings", labelKey: "nav.settings", icon: Cog },
];

const TITLE_KEY: Record<View, TKey> = {
  dashboard: "nav.dashboard",
  projects: "nav.projects",
  containers: "nav.containers",
  images: "nav.images",
  k8s: "nav.kubernetes",
  settings: "nav.settings",
};

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  // Projects から遷移したときの Containers の初期プロジェクト絞り込み
  const [containersProject, setContainersProject] = useState<string | undefined>();
  const { t } = useI18n();
  const health = useFetch(() => api.health(), [], 8000);
  const rd = useFetch(() => api.rdStatus(), [], 8000);

  const navigate = (v: View) => {
    setContainersProject(undefined);
    setView(v);
  };

  const openProject = (key: string) => {
    setContainersProject(key);
    setView("containers");
  };

  return (
    <div className="app">
      <aside className="sidebar" data-tauri-drag-region>
        <div className="brand" data-tauri-drag-region>
          <div className="brand-mark" data-tauri-drag-region>
            <Sprout size={18} />
          </div>
          <div data-tauri-drag-region>
            <div className="brand-name" data-tauri-drag-region>
              Hatake
            </div>
            <div className="brand-sub" data-tauri-drag-region>
              {t("brand.subtitle")}
            </div>
          </div>
        </div>

        <nav className="nav">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <button
                key={n.id}
                className={`nav-item ${view === n.id ? "active" : ""}`}
                onClick={() => navigate(n.id)}
              >
                <Icon size={16} />
                {t(n.labelKey)}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
            <StatusDot on={health.data?.docker} />
            {t(health.data?.docker ? "sidebar.dockerConnected" : "sidebar.dockerDisconnected")}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <StatusDot on={health.data?.kubernetes} />
            {t(health.data?.kubernetes ? "sidebar.k8sConnected" : "sidebar.k8sDisconnected")}
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="header" data-tauri-drag-region>
          <h1 data-tauri-drag-region>{t(TITLE_KEY[view])}</h1>
          <span className="spacer" data-tauri-drag-region />
          <div className="health-chip">
            <StatusDot on={rd.data?.running} />
            {t(rd.data?.running ? "header.rdRunning" : "header.rdStopped")}
          </div>
        </header>

        <div className="content">
          {view === "dashboard" && <Dashboard rd={rd.data} />}
          {view === "projects" && <Projects onOpenProject={openProject} />}
          {view === "containers" && <Containers initialProject={containersProject} />}
          {view === "images" && <Images />}
          {view === "k8s" && <Kubernetes rd={rd.data} />}
          {view === "settings" && (
            <Settings rd={rd.data} reloadRd={() => rd.reload()} />
          )}
        </div>
      </main>
    </div>
  );
}
