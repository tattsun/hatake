import { useMemo, useState } from "react";
import { Box, ChevronDown, ChevronRight, ChevronUp, Layers, Network, RefreshCw } from "lucide-react";
import { api } from "../api";
import { useFetch } from "../lib/useFetch";
import { Empty, SearchInput, Spinner, StatusDot } from "../components/ui";
import { useI18n } from "../i18n";
import { STANDALONE } from "../lib/compose";
import type { ContainerInfo } from "../types";

type Project = {
  key: string;
  running: number;
  total: number;
  services: number;
};

type SortKey = "name" | "containers" | "services";
type SortDir = "asc" | "desc";

export function Projects({ onOpenProject }: { onOpenProject: (key: string) => void }) {
  const { t } = useI18n();
  const { data, loading, reload } = useFetch(() => api.listContainers(), [], 5000);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [query, setQuery] = useState("");

  const projName = (key: string) =>
    key === STANDALONE ? t("containers.standalone") : key;

  const projects = useMemo<Project[]>(() => {
    const m = new Map<string, ContainerInfo[]>();
    for (const c of data ?? []) {
      const key = c.composeProject || STANDALONE;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(c);
    }
    return [...m.entries()].map(([key, containers]) => ({
      key,
      running: containers.filter((c) => c.state === "running").length,
      total: containers.length,
      services: new Set(containers.map((c) => c.composeService || c.name)).size,
    }));
  }, [data]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const q = query.trim().toLowerCase();
    const matched = q
      ? projects.filter((p) => projName(p.key).toLowerCase().includes(q))
      : projects;
    return [...matched].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = projName(a.key).localeCompare(projName(b.key));
      else if (sortKey === "containers") cmp = a.total - b.total;
      else cmp = a.services - b.services;
      // 同値のときは名前で安定させる
      if (cmp === 0) cmp = projName(a.key).localeCompare(projName(b.key));
      return cmp * dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, sortKey, sortDir, query]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const Sortable = ({ k, label }: { k: SortKey; label: string }) => (
    <th className="sortable" onClick={() => toggleSort(k)}>
      <span className="sort-head">
        {label}
        {sortKey === k &&
          (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </span>
    </th>
  );

  return (
    <div className="panel">
      <div className="panel-head">
        <Network size={15} />
        <h2>{t("projects.title")}</h2>
        <span className="spacer" />
        <SearchInput value={query} onChange={setQuery} placeholder={t("common.search")} />
        <button className="btn sm" onClick={() => reload()}>
          <RefreshCw size={13} className={loading ? "spin" : ""} /> {t("common.refresh")}
        </button>
      </div>

      {!data && loading ? (
        <Empty icon={<Spinner />} text={t("common.loading")} />
      ) : sorted.length === 0 ? (
        <Empty icon={<Layers size={28} />} text={t("projects.empty")} />
      ) : (
        <table className="fixed">
          <colgroup>
            <col style={{ width: "44%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "8%" }} />
          </colgroup>
          <thead>
            <tr>
              <Sortable k="name" label={t("detail.project")} />
              <Sortable k="containers" label={t("nav.containers")} />
              <Sortable k="services" label={t("projects.colServices")} />
              <th>{t("common.state")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const allRunning = p.running === p.total && p.total > 0;
              const someRunning = p.running > 0 && !allRunning;
              const standalone = p.key === STANDALONE;
              return (
                <tr
                  key={p.key}
                  className="clickable"
                  onClick={() => onOpenProject(p.key)}
                >
                  <td className="wrap">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      {standalone ? (
                        <Box size={14} style={{ color: "var(--text-faint)" }} />
                      ) : (
                        <Layers size={14} style={{ color: "var(--accent)" }} />
                      )}
                      <span className="strong">{projName(p.key)}</span>
                    </span>
                  </td>
                  <td className="mono">
                    {p.running}
                    <span style={{ color: "var(--text-faint)" }}> / {p.total}</span>
                  </td>
                  <td className="mono">{p.services}</td>
                  <td>
                    <StatusDot on={allRunning} warn={someRunning} />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <ChevronRight size={15} style={{ color: "var(--text-faint)" }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
