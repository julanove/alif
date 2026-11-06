import { useState } from "react";
import { addExample, likeExample, ttsUrl } from "../api/client.js";
import SpeakButton from "./SpeakButton.jsx";
import { usePractice, PracticeButton, PracticeResult } from "./Practice.jsx";
import { MascotMessage } from "./Mascot.jsx";
function Example({ example: ex, liked, onLike }) {
  const practice = usePractice("example", ex.id);
  return <div className="example"><div className="speak-row"><div className="example__ar" dir="rtl">{ex.ar}</div><SpeakButton src={ttsUrl("example", ex.id)} text={ex.ar} size="sm" /><PracticeButton practice={practice} size="sm" /></div><div className="example__vi">{ex.vi}</div><PracticeResult practice={practice} /><div className="example__meta"><span>{ex.source === "seed" ? "Từ điển" : ex.author}</span><button disabled={liked} onClick={onLike}>
          👍 {ex.likes}</button></div></div>;
}
const LIKED_KEY = "avdict:likedExamples";
function loadLiked() {
  try {
    return new Set(JSON.parse(localStorage.getItem(LIKED_KEY)) ?? []);
  } catch {
    return new Set();
  }
}
export default function ExampleList({ wordId, initial }) {
  const [examples, setExamples] = useState(initial);
  const [liked, setLiked] = useState(loadLiked);
  const [draft, setDraft] = useState({ ar: "", vi: "", author: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  async function handleLike(id) {
    if (liked.has(id)) return;
    const next = new Set(liked).add(id);
    setLiked(next);
    try {
      localStorage.setItem(LIKED_KEY, JSON.stringify([...next]));
    } catch {
    }
    try {
      const { likes } = await likeExample(id);
      setExamples((prev) => prev.map((e) => e.id === id ? { ...e, likes } : e));
    } catch {
      setLiked(liked);
    }
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const example = await addExample(wordId, draft);
      setExamples((prev) => [...prev, example]);
      setDraft({ ar: "", vi: "", author: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }
  return <>{examples.length === 0 && <MascotMessage name="typing">Chưa có câu ví dụ nào. Hãy thêm câu đầu tiên!</MascotMessage>}{examples.map((ex) => <Example key={ex.id} example={ex} liked={liked.has(ex.id)} onLike={() => handleLike(ex.id)} />)}<form className="note-form" onSubmit={handleSubmit}><input
    type="text"
    dir="rtl"
    placeholder="Câu tiếng Ả Rập"
    value={draft.ar}
    onChange={(e) => setDraft((d) => ({ ...d, ar: e.target.value }))}
  /><input
    type="text"
    placeholder="Nghĩa tiếng Việt"
    value={draft.vi}
    onChange={(e) => setDraft((d) => ({ ...d, vi: e.target.value }))}
  /><input
    type="text"
    placeholder="Tên của bạn (tùy chọn)"
    value={draft.author}
    onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))}
  />{error && <p className="form-error">{error}</p>}<button type="submit" disabled={submitting || !draft.ar.trim() || !draft.vi.trim()}>{submitting ? "Đang gửi..." : "Thêm câu ví dụ"}</button></form></>;
}
