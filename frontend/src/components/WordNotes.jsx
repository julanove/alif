import { useEffect, useState } from "react";
import { getPosts, createPost } from "../api/client.js";
import { MascotMessage } from "./Mascot.jsx";
export default function WordNotes({ wordId }) {
  const [notes, setNotes] = useState(null);
  const [draft, setDraft] = useState({ author: "", body: "" });
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    getPosts(wordId).then(setNotes).catch(() => setNotes([]));
  }, [wordId]);
  async function handleAddNote(e) {
    e.preventDefault();
    if (!draft.body.trim()) return;
    setSubmitting(true);
    try {
      const post = await createPost({ wordId, author: draft.author, body: draft.body });
      setNotes((prev) => [post, ...prev ?? []]);
      setDraft({ author: "", body: "" });
    } finally {
      setSubmitting(false);
    }
  }
  return <>{notes === null && <p className="muted">Đang tải...</p>}{notes?.length === 0 && <MascotMessage name="sleep">Chưa có ghi chú nào cho từ này. Hãy là người đầu tiên!</MascotMessage>}{notes?.map((n) => <div key={n.id} className="note"><div className="note__meta"><strong>{n.author}</strong><span>{new Date(n.createdAt).toLocaleDateString("vi-VN")}</span></div><p>{n.body}</p></div>)}<form className="note-form" onSubmit={handleAddNote}><input
    type="text"
    placeholder="Tên của bạn (tùy chọn)"
    value={draft.author}
    onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))}
  /><textarea
    placeholder="Chia sẻ ví dụ, kinh nghiệm hoặc ghi chú của bạn về từ này..."
    value={draft.body}
    onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
    rows={2}
  /><button type="submit" disabled={submitting || !draft.body.trim()}>{submitting ? "Đang gửi..." : "Gửi ghi chú"}</button></form></>;
}
