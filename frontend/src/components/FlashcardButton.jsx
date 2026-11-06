import { useState } from "react";
import { useAuth } from "../auth.jsx";
import { goToLogin } from "../router.js";
export default function FlashcardButton({ wordId }) {
  const { user, saved, toggleSaved } = useAuth();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const isSaved = saved.has(wordId);
  async function handleClick() {
    if (!user) return goToLogin();
    setBusy(true);
    setFailed(false);
    try {
      await toggleSaved(wordId);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  return <button
    type="button"
    className={`flashcard-btn ${isSaved ? "flashcard-btn--saved" : ""}`}
    onClick={handleClick}
    disabled={busy}
    aria-pressed={isSaved}
  >{failed ? "Lỗi, thử lại" : isSaved ? "✓ Đã lưu thẻ" : "+ Lưu thẻ ôn tập"}</button>;
}
