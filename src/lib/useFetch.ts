import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeDemo } from "./demo";

/** 非同期データ取得 + 任意のポーリング。reload で手動再取得できる。 */
export function useFetch<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
  pollMs?: number,
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await fnRef.current();
      setData(r);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    if (pollMs) {
      const t = setInterval(() => reload(true), pollMs);
      return () => clearInterval(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // デモモードの切替時に全フェッチを再取得してデータソースを差し替える
  useEffect(() => subscribeDemo(() => reload(true)), [reload]);

  return { data, error, loading, reload };
}
