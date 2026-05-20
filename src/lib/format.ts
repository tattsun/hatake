export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Unix 秒 or ISO 文字列を「3 hours ago」風に整形 */
export function relativeTime(input: number | string | null): string {
  if (input == null) return "-";
  const ms = typeof input === "number" ? input * 1000 : Date.parse(input);
  if (isNaN(ms)) return "-";
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon}mo ago`;
  return `${Math.floor(mon / 12)}y ago`;
}

export function shortId(id: string): string {
  return id.replace(/^sha256:/, "").slice(0, 12);
}

/** `repo@sha256:abcd...` のダイジェストを 12 桁に短縮して表示用に整える */
export function shortImage(image: string): string {
  const at = image.indexOf("@sha256:");
  if (at === -1) return image;
  const digest = image.slice(at + "@sha256:".length, at + "@sha256:".length + 12);
  return `${image.slice(0, at)}@${digest}`;
}

/** 状態文字列をピルの種別クラスに正規化する */
export function stateClass(state: string): string {
  const s = state.toLowerCase();
  if (s.includes("run")) return "running";
  if (s.includes("exit") || s.includes("stop")) return "exited";
  if (s.includes("pend") || s.includes("creat") || s.includes("paus")) return "pending";
  if (s.includes("fail") || s.includes("dead") || s.includes("error")) return "failed";
  return "exited";
}

export function phaseClass(phase: string): string {
  const s = phase.toLowerCase();
  if (s === "running" || s === "succeeded") return "running";
  if (s === "pending") return "pending";
  if (s === "failed" || s === "unknown") return "failed";
  return "exited";
}
