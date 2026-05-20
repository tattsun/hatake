import { useSyncExternalStore } from "react";

// デモモード: ON にすると api 層が録画用のダミーデータを返す（lib/mock.ts）。
const KEY = "hatake.demo";
let enabled = localStorage.getItem(KEY) === "1";
const listeners = new Set<() => void>();

export function isDemo(): boolean {
  return enabled;
}

export function setDemo(value: boolean): void {
  enabled = value;
  localStorage.setItem(KEY, value ? "1" : "0");
  listeners.forEach((l) => l());
}

export function subscribeDemo(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React コンポーネントからデモ状態を購読する */
export function useDemo(): boolean {
  return useSyncExternalStore(subscribeDemo, isDemo);
}
