import { useMemo, useState } from "react";
import { Layers, RefreshCw, Trash2 } from "lucide-react";
import { api } from "../api";
import { useFetch } from "../lib/useFetch";
import { Empty, SearchInput, Spinner, useToast } from "../components/ui";
import { useI18n } from "../i18n";
import { formatBytes, relativeTime, shortId } from "../lib/format";

export function Images() {
  const { t } = useI18n();
  const { data, error, loading, reload } = useFetch(() => api.listImages(), []);
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter(
      (img) =>
        img.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        shortId(img.id).includes(q),
    );
  }, [data, query]);

  async function remove(id: string) {
    setBusy(id);
    try {
      await api.removeImage(id, false);
      toast(t("images.toast.removed"));
      await reload(true);
    } catch (e) {
      toast(String(e), true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <Layers size={15} />
        <h2>{t("images.title")}</h2>
        <span className="spacer" />
        <SearchInput value={query} onChange={setQuery} placeholder={t("common.search")} />
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
      ) : shown.length === 0 ? (
        <Empty icon={<Layers size={28} />} text={t("images.empty")} />
      ) : (
        <table className="fixed">
          <colgroup>
            <col style={{ width: "44%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "12%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>{t("images.colRepoTag")}</th>
              <th>{t("images.colId")}</th>
              <th>{t("common.size")}</th>
              <th>{t("common.created")}</th>
              <th style={{ textAlign: "right" }}>{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((img) => (
              <tr key={img.id}>
                <td className="wrap">
                  {img.tags.length ? (
                    img.tags.map((tag) => (
                      <div key={tag} className="strong">
                        {tag}
                      </div>
                    ))
                  ) : (
                    <span style={{ color: "var(--text-faint)" }}>&lt;none&gt;</span>
                  )}
                </td>
                <td className="mono">{shortId(img.id)}</td>
                <td>{formatBytes(img.size)}</td>
                <td>{relativeTime(img.created)}</td>
                <td>
                  <div className="row-actions">
                    <button
                      className="btn icon sm danger"
                      title={t("common.delete")}
                      disabled={busy === img.id}
                      onClick={() => remove(img.id)}
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
    </div>
  );
}
