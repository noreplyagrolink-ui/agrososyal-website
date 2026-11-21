// Global media preferences: mute state shared across videos, data saver mode.

type Listener = () => void;

const MUTE_KEY = "agro_global_muted";
const DATASAVER_KEY = "agro_data_saver";

let muted = (() => {
  const v = localStorage.getItem(MUTE_KEY);
  return v === null ? true : v === "1";
})();

let dataSaver = localStorage.getItem(DATASAVER_KEY) === "1";

const muteListeners = new Set<Listener>();
const saverListeners = new Set<Listener>();

export function getGlobalMuted() { return muted; }
export function setGlobalMuted(v: boolean) {
  muted = v;
  localStorage.setItem(MUTE_KEY, v ? "1" : "0");
  muteListeners.forEach((fn) => fn());
}
export function subscribeMute(fn: Listener) {
  muteListeners.add(fn);
  return () => muteListeners.delete(fn);
}

export function getDataSaver() { return dataSaver; }
export function setDataSaver(v: boolean) {
  dataSaver = v;
  localStorage.setItem(DATASAVER_KEY, v ? "1" : "0");
  saverListeners.forEach((fn) => fn());
}
export function subscribeDataSaver(fn: Listener) {
  saverListeners.add(fn);
  return () => saverListeners.delete(fn);
}

// Track viewed posts so we don't re-count after a refresh
const VIEWED_KEY = "agro_viewed_posts";
function loadViewed(): Set<string> {
  try {
    const raw = localStorage.getItem(VIEWED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr.slice(-2000));
  } catch { return new Set(); }
}
const viewedSet = loadViewed();
export function filterUnviewed(ids: string[]): string[] {
  return ids.filter((id) => !viewedSet.has(id));
}
export function markViewed(ids: string[]) {
  ids.forEach((id) => viewedSet.add(id));
  try {
    localStorage.setItem(VIEWED_KEY, JSON.stringify(Array.from(viewedSet).slice(-2000)));
  } catch {}
}

import { useEffect, useState } from "react";

export function useGlobalMuted(): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(muted);
  useEffect(() => { subscribeMute(() => setV(getGlobalMuted())); }, []);
  return [v, setGlobalMuted];
}
export function useDataSaver(): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(dataSaver);
  useEffect(() => { subscribeDataSaver(() => setV(getDataSaver())); }, []);
  return [v, setDataSaver];
}

