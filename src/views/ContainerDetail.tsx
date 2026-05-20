import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  FileText,
  Play,
  Radio,
  RefreshCw,
  RotateCw,
  Square,
  Trash2,
} from "lucide-react";
import { Channel } from "@tauri-apps/api/core";
import { api } from "../api";
import { useFetch } from "../lib/useFetch";
import { Empty, Pill, Spinner } from "../components/ui";
import { useI18n } from "../i18n";
import type { TKey } from "../i18n";
import { isDemo } from "../lib/demo";
import { mockLogLine } from "../lib/mock";
import { relativeTime, shortId, stateClass } from "../lib/format";
import type { ContainerInfo } from "../types";

export function ContainerDetail({
  container: c,
  busy,
  backLabel,
  onBack,
  projectName,
  act,
}: {
  container: ContainerInfo;
  busy: boolean;
  backLabel: string;
  onBack: () => void;
  projectName: string;
  act: (id: string, msgKey: TKey, fn: () => Promise<void>) => Promise<void>;
}) {
  const { t } = useI18n();
  const running = c.state === "running";
  const logs = useFetch(() => api.containerLogs(c.id, "500"), [c.id]);

  // ログの tail（follow）モード
  const [following, setFollowing] = useState(false);
  const [liveLogs, setLiveLogs] = useState("");
  const preRef = useRef<HTMLPreElement>(null);
  const streamId = useRef(Math.floor(Math.random() * 2_000_000_000));

  useEffect(() => {
    if (!following) return;
    setLiveLogs("");
    const append = (msg: string) =>
      setLiveLogs((prev) => {
        const next = prev + msg;
        // メモリ肥大を防ぐため末尾 200KB に制限
        return next.length > 200_000 ? next.slice(next.length - 200_000) : next;
      });

    // デモモードはダミーログを定期生成する
    if (isDemo()) {
      append(mockLogLine());
      const timer = setInterval(() => append(mockLogLine()), 900);
      return () => clearInterval(timer);
    }

    const channel = new Channel<string>();
    channel.onmessage = append;
    const sid = streamId.current;
    api.startLogStream(sid, c.id, channel);
    return () => {
      api.stopLogStream(sid);
    };
  }, [following, c.id]);

  // 追従中は常に最下部へスクロール
  useEffect(() => {
    if (following && preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [liveLogs, following]);

  return (
    <>
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <button className="crumb" onClick={onBack}>
            {backLabel}
          </button>
          <ChevronRight size={14} className="crumb-sep" />
          <h2>{c.composeService || c.name}</h2>
          <Pill kind={stateClass(c.state)}>{c.state}</Pill>
          <span className="spacer" />
          <div className="row-actions">
            {running ? (
              <>
                <button
                  className="btn sm"
                  disabled={busy}
                  onClick={() =>
                    act(c.id, "containers.toast.restarted", () => api.restartContainer(c.id))
                  }
                >
                  <RotateCw size={14} /> {t("containers.action.restart")}
                </button>
                <button
                  className="btn sm"
                  disabled={busy}
                  onClick={() =>
                    act(c.id, "containers.toast.stopped", () => api.stopContainer(c.id))
                  }
                >
                  <Square size={14} /> {t("containers.action.stop")}
                </button>
              </>
            ) : (
              <button
                className="btn sm"
                disabled={busy}
                onClick={() =>
                  act(c.id, "containers.toast.started", () => api.startContainer(c.id))
                }
              >
                <Play size={14} /> {t("containers.action.start")}
              </button>
            )}
            <button
              className="btn sm danger"
              disabled={busy}
              onClick={() =>
                act(c.id, "containers.toast.removed", () => api.removeContainer(c.id, true))
              }
            >
              <Trash2 size={14} /> {t("containers.action.remove")}
            </button>
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <div className="field-grid">
            <span className="k">{t("common.name")}</span>
            <span className="v mono">{c.name}</span>
            <span className="k">{t("detail.project")}</span>
            <span className="v">{projectName}</span>
            {c.composeService && (
              <>
                <span className="k">{t("detail.service")}</span>
                <span className="v">{c.composeService}</span>
              </>
            )}
            <span className="k">{t("common.image")}</span>
            <span className="v mono">{c.image}</span>
            <span className="k">{t("detail.statusText")}</span>
            <span className="v">{c.status || "—"}</span>
            <span className="k">{t("common.ports")}</span>
            <span className="v mono">{c.ports.join(", ") || "—"}</span>
            <span className="k">{t("common.created")}</span>
            <span className="v">{relativeTime(c.created)}</span>
            <span className="k">{t("detail.containerId")}</span>
            <span className="v mono">{shortId(c.id)}</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <FileText size={15} />
          <h2>{t("detail.logs")}</h2>
          {following && (
            <span className="live">
              <span className="dot on" />
              {t("detail.live")}
            </span>
          )}
          <span className="spacer" />
          <button
            className={`btn sm ${following ? "primary" : ""}`}
            onClick={() => setFollowing((f) => !f)}
          >
            <Radio size={13} /> {t("detail.follow")}
          </button>
          {!following && (
            <button className="btn sm" onClick={() => logs.reload()}>
              <RefreshCw size={13} className={logs.loading ? "spin" : ""} />{" "}
              {t("common.reload")}
            </button>
          )}
        </div>
        {following ? (
          <pre className="logs" ref={preRef}>
            {liveLogs || t("common.loading")}
          </pre>
        ) : logs.loading && !logs.data ? (
          <Empty icon={<Spinner />} text={t("common.loading")} />
        ) : (
          <pre className="logs">{logs.data || t("containers.logsEmpty")}</pre>
        )}
      </div>
    </>
  );
}
