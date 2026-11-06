import { useEffect, useRef, useState } from "react";
import { play, stopPlayback, speakableArabic } from "../speech.js";
import { VOICE_ENABLED } from "../features.js";
export default function SpeakButton(props) {
  return VOICE_ENABLED ? <SpeakButtonInner {...props} /> : null;
}
function SpeakButtonInner({ src, text = "", size = "md", headword = false }) {
  const [state, setState] = useState("idle");
  const fallbackText = headword ? speakableArabic(text) : text.trim();
  const playingRef = useRef(false);
  playingRef.current = state === "playing";
  useEffect(() => () => playingRef.current && stopPlayback(), []);
  useEffect(() => {
    if (state !== "error") return;
    const timer = setTimeout(() => setState("idle"), 2500);
    return () => clearTimeout(timer);
  }, [state]);
  function handleClick() {
    if (state === "playing") {
      stopPlayback();
      return;
    }
    setState("playing");
    play({ src, text: fallbackText }, (ok) => setState(ok ? "idle" : "error"));
  }
  const title = { idle: "Nghe phát âm", playing: "Dừng", error: "Không phát được âm thanh" }[state];
  return <button
    type="button"
    className={`speak-btn speak-btn--${size} speak-btn--${state}`}
    onClick={handleClick}
    title={title}
    aria-label={title}
  >{state === "playing" ? <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" /><path
    d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  /></svg>}</button>;
}
