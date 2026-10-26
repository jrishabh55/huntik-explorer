import { useEffect, useState } from "react";
const cache = new Map<string, Promise<unknown>>();
export const asset = (path: string) => import.meta.env.BASE_URL + path;
export function fetchData<T>(path: string): Promise<T> {
  if (!cache.has(path))
    cache.set(
      path,
      fetch(asset("data/" + path))
        .then((r) => {
          if (!r.ok)
            throw Error(
              "This part of the archive could not be loaded. Please retry.",
            );
          return r.json();
        })
        .catch((e) => {
          cache.delete(path);
          throw e;
        }),
    );
  return cache.get(path) as Promise<T>;
}
export function useData<T>(path: string | null): { data?: T; error?: string } {
  const [state, set] = useState<{
    data?: T;
    error?: string;
    key: string | null;
  }>({ key: path });
  useEffect(() => {
    let live = true;
    if (path)
      fetchData<T>(path)
        .then((data) => {
          if (live) set({ data, key: path });
        })
        .catch((e) => {
          if (live) set({ error: String(e.message), key: path });
        });
    return () => {
      live = false;
    };
  }, [path]);
  return state.key === path ? state : {};
}
export function useStoredIds(key: string) {
  const [ids, setIds] = useState<string[]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(ids));
    } catch {
      /* Browser storage may be unavailable. Session state still works. */
    }
  }, [ids, key]);
  return [ids, setIds] as const;
}
export function route() {
  const [path, query = ""] = (location.hash.slice(1) || "/").split("?");
  return { path, params: new URLSearchParams(query) };
}
export function useRoute() {
  const [current, set] = useState(route);
  useEffect(() => {
    const on = () => set(route());
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return current;
}
export function setParams(
  params: URLSearchParams,
  updates: Record<string, string>,
  replace = false,
) {
  const next = new URLSearchParams(params);
  for (const [k, v] of Object.entries(updates))
    if (v) next.set(k, v);
    else next.delete(k);
  const url = "#" + route().path + "?" + next;
  if (replace) {
    history.replaceState(null, "", url);
    dispatchEvent(new HashChangeEvent("hashchange"));
  } else location.hash = url;
}
