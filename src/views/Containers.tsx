import { useMemo, useState } from "react";
import {
  Box,
  Boxes,
  Layers,
  Play,
  RefreshCw,
  RotateCw,
  Square,
  Trash2,
} from "lucide-react";
import { api } from "../api";
import { useFetch } from "../lib/useFetch";
import { Empty, Pill, Spinner, useToast } from "../components/ui";
import { useI18n } from "../i18n";
import type { TKey } from "../i18n";
import { STANDALONE } from "../lib/compose";
import { relativeTime, shortId, shortImage, stateClass } from "../lib/format";
import type { ContainerInfo } from "../types";
import { ContainerDetail } from "./ContainerDetail";

export function Containers({ initialProject }: { initialProject?: string }) {
  const { t } = useI18n();
  const { data, error, loading, reload } = useFetch(
    () => api.listContainers(),
    [],
    5000,
  );
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [selContainerId, setSelContainerId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>(initialProject ?? "all");

  const projName = (key: string) =>
    key === STANDALONE ? t("containers.standalone") : key;

  // 状態ごとの件数（フィルタチップ用）
  const stateCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of data ?? []) m.set(c.state, (m.get(c.state) ?? 0) + 1);
    return m;
  }, [data]);

  // compose プロジェクト一覧（セレクト用）
  const projectOptions = useMemo(() => {
    const set = new Set<string>();
    let hasStandalone = false;
    for (const c of data ?? []) {
      if (c.composeProject) set.add(c.composeProject);
      else hasStandalone = true;
    }
    return { list: [...set].sort(), hasStandalone };
  }, [data]);

  const filtered = useMemo(
    () =>
      (data ?? []).filter((c) => {
        if (filter !== "all" && c.state !== filter) return false;
        if (projectFilter === "all") return true;
        if (projectFilter === STANDALONE) return !c.composeProject;
        return c.composeProject === projectFilter;
      }),
    [data, filter, projectFilter],
  );

  // compose プロジェクトでグルーピング（プロジェクト無しは standalone）
  const groups = useMemo(() => {
    const m = new Map<string, ContainerInfo[]>();
    for (const c of filtered) {
      const key = c.composeProject || STANDALONE;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(c);
    }
    const entries = [...m.entries()];
    entries.sort(([a], [b]) => {
      if (a === STANDALONE) return 1;
      if (b === STANDALONE) return -1;
      return a.localeCompare(b);
    });
    for (const [, list] of entries) {
      list.sort((x, y) =>
        (x.composeService || x.name).localeCompare(y.composeService || y.name),
      );
    }
    return entries;
  }, [filtered]);

  async function act(id: string, msgKey: TKey, fn: () => Promise<void>) {
    setBusy(id);
    try {
      await fn();
      toast(t(msgKey));
      await reload(true);
    } catch (e) {
      toast(String(e), true);
    } finally {
      setBusy(null);
    }
  }

  // --- コンテナ詳細 ---
  const selContainer = selContainerId
    ? (data ?? []).find((c) => c.id === selContainerId) ?? null
    : null;
  if (selContainerId && selContainer) {
    return (
      <ContainerDetail
        container={selContainer}
        busy={busy === selContainer.id}
        backLabel={t("nav.containers")}
        onBack={() => setSelContainerId(null)}
        projectName={projName(selContainer.composeProject || STANDALONE)}
        act={act}
      />
    );
  }

  const filterOptions = ["all", ...[...stateCounts.keys()].sort()];

  return (
    <div className="panel">
      <div className="panel-head">
        <Boxes size={15} />
        <h2>{t("containers.title")}</h2>
        <div className="tabs" style={{ marginLeft: 12 }}>
          {filterOptions.map((opt) => (
            <button
              key={opt}
              className={`tab ${filter === opt ? "active" : ""}`}
              onClick={() => setFilter(opt)}
            >
              {opt === "all" ? t("containers.all") : opt}
              <span style={{ color: "var(--text-faint)", marginLeft: 5 }}>
                {opt === "all" ? data?.length ?? 0 : stateCounts.get(opt) ?? 0}
              </span>
            </button>
          ))}
        </div>
        <span className="spacer" />
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          title={t("containers.filterByProject")}
        >
          <option value="all">{t("containers.allProjects")}</option>
          {projectOptions.list.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
          {projectOptions.hasStandalone && (
            <option value={STANDALONE}>{t("containers.standalone")}</option>
          )}
        </select>
        <button className="btn sm" onClick={() => reload()}>
          <RefreshCw size={13} className={loading ? "spin" : ""} /> {t("common.refresh")}
        </button>
      </div>

      {error && (
        <div className="banner err" style={{ margin: 14 }}>
          {error}
        </div>
      )}

      {!data && loading ? (
        <Empty icon={<Spinner />} text={t("common.loading")} />
      ) : filtered.length === 0 ? (
        <Empty
          icon={<Boxes size={28} />}
          text={data && data.length ? t("containers.emptyFiltered") : t("containers.empty")}
        />
      ) : (
        <table className="fixed">
          <colgroup>
            <col style={{ width: "24%" }} />
            <col style={{ width: "28%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "19%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>{t("common.name")}</th>
              <th>{t("common.image")}</th>
              <th>{t("common.state")}</th>
              <th>{t("common.ports")}</th>
              <th>{t("common.created")}</th>
              <th style={{ textAlign: "right" }}>{t("common.actions")}</th>
            </tr>
          </thead>
          {groups.map(([groupKey, list]) => {
            const composed = groupKey !== STANDALONE;
            return (
              <tbody key={groupKey}>
                <tr className="group-row">
                  <td colSpan={6}>
                    {composed ? <Layers size={13} /> : <Box size={13} />}
                    <span className="proj">
                      {composed ? groupKey : t("containers.standalone")}
                    </span>
                    <span className="cnt">{list.length}</span>
                  </td>
                </tr>
                {list.map((c) => {
                  const running = c.state === "running";
                  const b = busy === c.id;
                  return (
                    <tr
                      key={c.id}
                      className="clickable"
                      onClick={() => setSelContainerId(c.id)}
                    >
                      <td className="wrap">
                        <div className="strong">
                          {composed ? c.composeService || c.name : c.name}
                        </div>
                        <div className="mono" style={{ color: "var(--text-faint)" }}>
                          {composed ? c.name : shortId(c.id)}
                        </div>
                      </td>
                      <td className="mono wrap" title={c.image}>
                        {shortImage(c.image)}
                      </td>
                      <td>
                        <Pill kind={stateClass(c.state)}>{c.state}</Pill>
                      </td>
                      <td className="mono wrap">{c.ports.join(", ") || "—"}</td>
                      <td>{relativeTime(c.created)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          {running ? (
                            <>
                              <button
                                className="btn icon sm"
                                title={t("containers.action.restart")}
                                disabled={b}
                                onClick={() =>
                                  act(c.id, "containers.toast.restarted", () =>
                                    api.restartContainer(c.id),
                                  )
                                }
                              >
                                <RotateCw size={14} />
                              </button>
                              <button
                                className="btn icon sm"
                                title={t("containers.action.stop")}
                                disabled={b}
                                onClick={() =>
                                  act(c.id, "containers.toast.stopped", () =>
                                    api.stopContainer(c.id),
                                  )
                                }
                              >
                                <Square size={14} />
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn icon sm"
                              title={t("containers.action.start")}
                              disabled={b}
                              onClick={() =>
                                act(c.id, "containers.toast.started", () =>
                                  api.startContainer(c.id),
                                )
                              }
                            >
                              <Play size={14} />
                            </button>
                          )}
                          <button
                            className="btn icon sm danger"
                            title={t("containers.action.remove")}
                            disabled={b}
                            onClick={() =>
                              act(c.id, "containers.toast.removed", () =>
                                api.removeContainer(c.id, true),
                              )
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            );
          })}
        </table>
      )}
    </div>
  );
}
