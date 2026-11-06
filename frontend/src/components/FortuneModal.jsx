import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { nextFortune } from "../fortunes.js";
import MagicLamp from "./MagicLamp.jsx";
const RUB_DISTANCE = 1400;
const MAX_STEP = 60;
const KEY_STEP = 0.25;
const ERUPT_MS = 1900;
const SPARKS = Array.from({ length: 22 }, (_, i) => ({
  left: `${i * 47 % 100}%`,
  top: `${i * 29 % 100}%`,
  delay: `${i % 9 * 0.35}s`,
  size: 2 + i % 3
}));
function hintFor(progress) {
  if (progress === 0) return "Nhấn giữ rồi xoa lên đèn thần nào!";
  if (progress < 0.4) return "Đèn đang ấm dần... xoa tiếp đi!";
  if (progress < 0.8) return "Có gì đó đang rung chuyển...";
  return "Sắp rồi! Thêm chút nữa thôi!";
}
export default function FortuneModal({ onClose }) {
  const [fortune, setFortune] = useState(null);
  const [stage, setStage] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [rubbing, setRubbing] = useState(false);
  const last = useRef(null);
  const closeButton = useRef(null);
  const lamp = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);
  useEffect(() => {
    if (stage === "idle" && progress >= 1) {
      setRubbing(false);
      setStage("erupting");
      navigator.vibrate?.([80, 40, 120]);
    }
    if (stage !== "erupting") return;
    const timer = setTimeout(() => {
      setFortune(nextFortune());
      setStage("revealed");
    }, ERUPT_MS);
    return () => clearTimeout(timer);
  }, [stage, progress]);
  function rubAgain() {
    setFortune(null);
    setProgress(0);
    setStage("idle");
    lamp.current?.focus();
  }
  function handlePointerDown(e) {
    if (stage !== "idle") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    last.current = { x: e.clientX, y: e.clientY };
    setRubbing(true);
  }
  function handlePointerMove(e) {
    if (!rubbing || !last.current) return;
    const step = Math.min(MAX_STEP, Math.hypot(e.clientX - last.current.x, e.clientY - last.current.y));
    last.current = { x: e.clientX, y: e.clientY };
    setProgress((p) => Math.min(1, p + step / RUB_DISTANCE));
  }
  function stopRubbing() {
    last.current = null;
    setRubbing(false);
  }
  function handleKeyDown(e) {
    if (stage === "idle" && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setProgress((p) => Math.min(1, p + KEY_STEP));
    }
  }
  return createPortal(
    <div className="fortune" role="dialog" aria-modal="true" aria-label="Thông điệp từ dzũ trụ" onClick={onClose}><div
      className={`fortune__sky fortune__sky--${stage}`}
      style={{ "--rub": progress }}
      onClick={(e) => e.stopPropagation()}
    ><div className="fortune__sparks" aria-hidden="true">{SPARKS.map((s, i) => <span key={i} style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay }} />)}</div><button type="button" ref={closeButton} className="fortune__close" onClick={onClose} aria-label="Đóng">
          ×
        </button>{stage !== "revealed" && <header className="fortune__head"><h2>Thông điệp từ dzũ trụ</h2><p aria-live="polite">{stage === "erupting" ? "Dzũ trụ đang lên tiếng..." : hintFor(progress)}</p><div className="fortune__meter" aria-hidden="true"><span style={{ width: `${progress * 100}%` }} /></div></header>}{stage === "revealed" && fortune && <section className="fortune__message" aria-live="polite"><small>Dzũ trụ nhắn gửi bạn</small><p className="fortune__ar" dir="rtl" lang="ar">{fortune.ar}</p><span className="fortune__divider" aria-hidden="true">
              ✦
            </span><p className="fortune__vi">{fortune.vi}</p><div className="fortune__actions"><button type="button" className="fortune__done" onClick={rubAgain}>
                Xoa đèn lần nữa ✦
              </button><button type="button" className="fortune__close-text" onClick={onClose}>
                Đóng
              </button></div><small className="fortune__note">Chỉ để vui thôi nhé!</small></section>}<div
      ref={lamp}
      className={`fortune__lamp ${rubbing ? "fortune__lamp--rubbing" : ""}`}
      role="button"
      tabIndex={stage === "idle" ? 0 : -1}
      aria-label="Đèn thần. Nhấn Enter nhiều lần để xoa đèn."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopRubbing}
      onPointerCancel={stopRubbing}
      onKeyDown={handleKeyDown}
    ><div className="fortune__aura" aria-hidden="true" /><MagicLamp withSmoke /></div></div></div>,
    document.body
  );
}
