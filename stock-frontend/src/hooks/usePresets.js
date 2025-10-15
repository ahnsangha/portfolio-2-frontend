import { useMemo, useState, useCallback } from "react";

const LS_KEY = "stock-presets-v1";

export function usePresets() {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const persist = useCallback((next) => {
    setItems(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const add = useCallback((name, symbols = []) => {
    const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    const next = [{ id, name, symbols, createdAt: Date.now() }, ...items];
    persist(next);
    return id;
  }, [items, persist]);

  const remove = useCallback((id) => {
    persist(items.filter(x => x.id !== id));
  }, [items, persist]);

  const rename = useCallback((id, name) => {
    persist(items.map(x => x.id === id ? { ...x, name } : x));
  }, [items, persist]);

  return { items, add, remove, rename };
}
