import { useState } from "react";
import {
  Camera,
  Globe,
  Clapperboard,
  Play,
  Plus,
  Power,
  RefreshCw,
  Settings as Cog,
  Trash2,
} from "lucide-react";
import { api } from "../api";
import { useFetch } from "../lib/useFetch";
import { Empty, Modal, Spinner, StatusDot, useToast } from "../components/ui";
import { useI18n, LANGS } from "../i18n";
import type { TKey } from "../i18n";
import { useDemo, setDemo } from "../lib/demo";
import { relativeTime } from "../lib/format";
import type { RdStatus } from "../types";

export function Settings({
  rd,
  reloadRd,
}: {
  rd: RdStatus | null;
  reloadRd: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function run(msgKey: TKey, fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      toast(t(msgKey));
      setTimeout(reloadRd, 1500);
    } catch (e) {
      toast(String(e), true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <LanguagePanel />
      <DemoPanel />

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <Power size={15} />
          <h2>{t("settings.rdTitle")}</h2>
          <span className="spacer" />
          <div className="health-chip">
            <StatusDot on={rd?.running} />
            {t(rd?.running ? "status.running" : "status.stopped")}
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <div className="field-grid" style={{ marginBottom: 16 }}>
            <span className="k">{t("settings.version")}</span>
            <span className="v mono">{rd?.rdVersion || "—"}</span>
            <span className="k">{t("settings.containerEngine")}</span>
            <span className="v" style={{ textTransform: "capitalize" }}>
              {rd?.containerEngine || "—"}
            </span>
            <span className="k">{t("settings.kubernetes")}</span>
            <span className="v">
              {rd?.kubernetesEnabled
                ? t("settings.kubeEnabled", { version: rd.kubernetesVersion })
                : t("settings.kubeDisabled")}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="btn primary"
              disabled={busy}
              onClick={() => run("settings.toast.started", () => api.rdStart())}
            >
              <Play size={14} /> {t("settings.start")}
            </button>
            <button
              className="btn danger"
              disabled={busy}
              onClick={() => run("settings.toast.shutdown", () => api.rdShutdown())}
            >
              <Power size={14} /> {t("settings.shutdown")}
            </button>
            <button
              className="btn"
              disabled={busy}
              onClick={() =>
                run(
                  rd?.kubernetesEnabled
                    ? "settings.toast.kubeDisabled"
                    : "settings.toast.kubeEnabled",
                  () => api.rdSetKubernetes(!rd?.kubernetesEnabled),
                )
              }
            >
              {t(rd?.kubernetesEnabled ? "settings.disableKube" : "settings.enableKube")}
            </button>
          </div>
        </div>
      </div>

      <Snapshots />
      <SettingsJson />
    </>
  );
}

function DemoPanel() {
  const { t } = useI18n();
  const demo = useDemo();
  return (
    <div className="panel" style={{ marginBottom: 18 }}>
      <div className="panel-head">
        <Clapperboard size={15} />
        <h2>{t("demo.title")}</h2>
        <span className="spacer" />
        <button
          className={`btn sm ${demo ? "primary" : ""}`}
          onClick={() => setDemo(!demo)}
        >
          {demo ? t("demo.on") : t("demo.off")}
        </button>
      </div>
      <div style={{ padding: 16, fontSize: 12.5, color: "var(--text-dim)" }}>
        {t("demo.desc")}
      </div>
    </div>
  );
}

function LanguagePanel() {
  const { t, lang, setLang } = useI18n();
  return (
    <div className="panel" style={{ marginBottom: 18 }}>
      <div className="panel-head">
        <Globe size={15} />
        <h2>{t("lang.label")}</h2>
      </div>
      <div style={{ padding: 16 }}>
        <div className="tabs">
          {LANGS.map((l) => (
            <button
              key={l.value}
              className={`tab ${lang === l.value ? "active" : ""}`}
              onClick={() => setLang(l.value)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Snapshots() {
  const { t } = useI18n();
  const { data, error, loading, reload } = useFetch(() => api.snapshotList(), []);
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  async function create() {
    setBusy("__create");
    try {
      await api.snapshotCreate(name.trim(), desc.trim() || undefined);
      toast(t("snapshots.toast.created"));
      setShowCreate(false);
      setName("");
      setDesc("");
      await reload(true);
    } catch (e) {
      toast(String(e), true);
    } finally {
      setBusy(null);
    }
  }

  async function remove(n: string) {
    setBusy(n);
    try {
      await api.snapshotDelete(n);
      toast(t("snapshots.toast.deleted"));
      await reload(true);
    } catch (e) {
      toast(String(e), true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="panel" style={{ marginBottom: 18 }}>
      <div className="panel-head">
        <Camera size={15} />
        <h2>{t("snapshots.title")}</h2>
        <span className="spacer" />
        <button className="btn sm" onClick={() => reload()}>
          <RefreshCw size={13} className={loading ? "spin" : ""} />
        </button>
        <button className="btn sm primary" onClick={() => setShowCreate(true)}>
          <Plus size={13} /> {t("common.create")}
        </button>
      </div>

      {error && (
        <div className="banner err" style={{ margin: 14 }}>
          {error}
        </div>
      )}

      {!data && loading ? (
        <Empty icon={<Spinner />} text={t("common.loading")} />
      ) : data && data.length === 0 ? (
        <Empty icon={<Camera size={26} />} text={t("snapshots.empty")} />
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t("common.name")}</th>
              <th>{t("snapshots.colDescription")}</th>
              <th>{t("common.created")}</th>
              <th style={{ textAlign: "right" }}>{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((s) => (
              <tr key={s.name}>
                <td className="strong">{s.name}</td>
                <td>{s.description || "—"}</td>
                <td>{relativeTime(s.created)}</td>
                <td>
                  <div className="row-actions">
                    <button
                      className="btn icon sm danger"
                      disabled={busy === s.name}
                      onClick={() => remove(s.name)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showCreate && (
        <Modal
          title={t("snapshots.createTitle")}
          onClose={() => setShowCreate(false)}
          footer={
            <>
              <button className="btn" onClick={() => setShowCreate(false)}>
                {t("common.cancel")}
              </button>
              <button
                className="btn primary"
                disabled={!name.trim() || busy === "__create"}
                onClick={create}
              >
                {busy === "__create" ? <Spinner /> : t("common.create")}
              </button>
            </>
          }
        >
          <div className="form-row">
            <label>{t("snapshots.fieldName")}</label>
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("snapshots.namePlaceholder")}
            />
          </div>
          <div className="form-row">
            <label>{t("snapshots.fieldDescription")}</label>
            <input
              className="field"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>
            {t("snapshots.note")}
          </div>
        </Modal>
      )}
    </div>
  );
}

function SettingsJson() {
  const { t } = useI18n();
  const { data, loading, reload } = useFetch(() => api.rdSettings(), []);
  const [open, setOpen] = useState(false);
  return (
    <div className="panel">
      <div className="panel-head">
        <Cog size={15} />
        <h2>{t("settingsJson.title")}</h2>
        <span className="spacer" />
        <button className="btn sm" onClick={() => reload()}>
          <RefreshCw size={13} className={loading ? "spin" : ""} />
        </button>
        <button className="btn sm" onClick={() => setOpen((v) => !v)}>
          {t(open ? "common.hide" : "common.show")}
        </button>
      </div>
      {open &&
        (loading && !data ? (
          <Empty icon={<Spinner />} text={t("common.loading")} />
        ) : (
          <pre className="logs" style={{ maxHeight: "50vh" }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        ))}
    </div>
  );
}
