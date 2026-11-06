const KEY = "avdict_history";
const MAX_ITEMS = 5;
export function loadHistory() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
export function pushHistory(term) {
  const clean = term.trim();
  if (!clean) return loadHistory();
  const existing = loadHistory().filter((t) => t.toLowerCase() !== clean.toLowerCase());
  const updated = [clean, ...existing].slice(0, MAX_ITEMS);
  try {
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
  }
  return updated;
}
