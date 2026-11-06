const BASE = import.meta.env.VITE_API_BASE_URL || "/api";
async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || `Request failed: ${res.status}`), { status: res.status });
  }
  return res.json();
}
export function ttsUrl(kind, id) {
  return `${BASE}/tts/${kind}/${encodeURIComponent(id)}`;
}
export function checkPronunciation(kind, id, pcm) {
  return request(`/pronunciation/${kind}/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: pcm
  });
}
export async function searchWords(query, mode = "contains", signal) {
  const res = await fetch(`${BASE}/search?q=${encodeURIComponent(query)}&mode=${encodeURIComponent(mode)}`, { signal });
  if (!res.ok) throw Object.assign(new Error(`Request failed: ${res.status}`), { status: res.status });
  const words = await res.json();
  return { words, total: Number(res.headers.get("X-Total-Count")) || words.length };
}
export function getWordOfDay() {
  return request(`/word-of-day`);
}
export function getPosts(wordId) {
  const qs = wordId !== void 0 ? `?wordId=${encodeURIComponent(wordId)}` : "";
  return request(`/posts${qs}`);
}
export function createPost({ wordId, author, title, body }) {
  return request(`/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wordId: wordId ?? null, author, title, body })
  });
}
export function getWord(id) {
  return request(`/words/${encodeURIComponent(id)}`);
}
function postJson(path, payload) {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}
export function addExample(wordId, { ar, vi, author }) {
  return postJson(`/words/${encodeURIComponent(wordId)}/examples`, { ar, vi, author });
}
export function likeExample(exampleId) {
  return request(`/examples/${encodeURIComponent(exampleId)}/like`, { method: "POST" });
}
export function addRelation(wordId, relatedWordId, type) {
  return postJson(`/words/${encodeURIComponent(wordId)}/relations`, { relatedWordId, type });
}
export function getMe() {
  return request(`/auth/me`);
}
export function register({ email, password, name }) {
  return postJson(`/auth/register`, { email, password, name });
}
export function login({ email, password }) {
  return postJson(`/auth/login`, { email, password });
}
export function logout() {
  return postJson(`/auth/logout`, {});
}
export function getFlashcards() {
  return request(`/flashcards`);
}
export function addFlashcard(wordId) {
  return postJson(`/flashcards`, { wordId });
}
export function removeFlashcard(wordId) {
  return request(`/flashcards/${encodeURIComponent(wordId)}`, { method: "DELETE" });
}
export function reviewFlashcard(wordId, rating) {
  return postJson(`/flashcards/${encodeURIComponent(wordId)}/review`, { rating });
}
export function getTodayChallenge() {
  return request(`/challenge/today`);
}
