import { useEffect, useState } from "react";
export function wordPath(word) {
  return `#/word/${encodeURIComponent(word.slug ?? word.id)}`;
}
function parseHash(hash) {
  const match = hash.match(/^#\/word\/([^/?]+)/);
  if (match) return { name: "word", key: decodeURIComponent(match[1]) };
  const page = hash.match(/^#\/(login|register|flashcards|challenge)\b/);
  return page ? { name: page[1] } : { name: "home" };
}
export function useHashRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
const NEXT_KEY = "avdict:afterLogin";
export function goToLogin() {
  try {
    sessionStorage.setItem(NEXT_KEY, window.location.hash || "#/");
  } catch {
  }
  window.location.hash = "#/login";
}
export function leaveLoginPage() {
  let next = "#/";
  try {
    next = sessionStorage.getItem(NEXT_KEY) || "#/";
    sessionStorage.removeItem(NEXT_KEY);
  } catch {
  }
  window.location.hash = next;
}
