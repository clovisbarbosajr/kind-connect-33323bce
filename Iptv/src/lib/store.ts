// Local persistence: provider profiles, favorites, recents.
// Everything stays in the browser (localStorage) — nothing is sent to a server.

import type { Provider } from "./xtream";

const K = {
  providers: "iptv.providers",
  active: "iptv.active",
  favorites: "iptv.favorites", // live stream ids
  recents: "iptv.recents", // recent live stream ids
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* ignore quota / SSR */
  }
}

export const store = {
  getProviders: () => read<Provider[]>(K.providers, []),
  saveProvider(p: Provider) {
    const all = store.getProviders().filter((x) => x.id !== p.id);
    all.push(p);
    write(K.providers, all);
  },
  removeProvider(id: string) {
    write(
      K.providers,
      store.getProviders().filter((x) => x.id !== id),
    );
    if (store.getActiveId() === id) store.setActiveId(null);
  },

  getActiveId: () => read<string | null>(K.active, null),
  setActiveId: (id: string | null) => write(K.active, id),
  getActive(): Provider | null {
    const id = store.getActiveId();
    return store.getProviders().find((p) => p.id === id) ?? null;
  },

  getFavorites: () => new Set(read<number[]>(K.favorites, [])),
  toggleFavorite(streamId: number) {
    const f = store.getFavorites();
    f.has(streamId) ? f.delete(streamId) : f.add(streamId);
    write(K.favorites, [...f]);
    return f;
  },

  getRecents: () => read<number[]>(K.recents, []),
  pushRecent(streamId: number) {
    const list = [streamId, ...store.getRecents().filter((x) => x !== streamId)].slice(0, 20);
    write(K.recents, list);
    return list;
  },
};

export const uid = () => Math.random().toString(36).slice(2, 10);
