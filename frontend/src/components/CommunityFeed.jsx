import { useEffect, useState } from "react";
import { getPosts, createPost } from "../api/client.js";
import Mascot, { MascotMessage } from "./Mascot.jsx";
export default function CommunityFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ author: "", title: "", body: "" });
  const [submitting, setSubmitting] = useState(false);
  function reload() {
    setLoading(true);
    getPosts().then((all) => setPosts(all.filter((p) => p.wordId === null))).catch(() => setPosts([])).finally(() => setLoading(false));
  }
  useEffect(reload, []);
  async function handleSubmit(e) {
    e.preventDefault();
    if (!draft.body.trim()) return;
    setSubmitting(true);
    try {
      await createPost(draft);
      setDraft({ author: "", title: "", body: "" });
      setShowForm(false);
      reload();
    } finally {
      setSubmitting(false);
    }
  }
  return <div className="community"><div className="community__header"><Mascot name="heart" className="community__mascot" /><div><h2>Góc cộng đồng</h2><p className="muted">Chia sẻ kinh nghiệm học tập, sự kiện văn hóa hoặc bất cứ điều gì bạn muốn.</p><button className="community__share-btn" onClick={() => setShowForm((v) => !v)}>{showForm ? "Đóng" : "+ Chia sẻ"}</button></div></div>{showForm && <form className="community-form" onSubmit={handleSubmit}><Mascot name="typing" className="community-form__mascot" /><input
    type="text"
    placeholder="Tên của bạn (tùy chọn)"
    value={draft.author}
    onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))}
  /><input
    type="text"
    placeholder="Tiêu đề (tùy chọn)"
    value={draft.title}
    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
  /><textarea
    placeholder="Nội dung chia sẻ..."
    rows={3}
    value={draft.body}
    onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
  /><button type="submit" disabled={submitting || !draft.body.trim()}>{submitting ? "Đang đăng..." : "Đăng"}</button></form>}{loading && <p className="muted">Đang tải...</p>}<div className="community__list">{!loading && posts.length === 0 && <MascotMessage name="sleep">Chưa có bài chia sẻ nào.</MascotMessage>}{posts.map((p) => <div key={p.id} className="community__post">{p.title && <h3>{p.title}</h3>}<p>{p.body}</p><div className="community__post-meta"><strong>{p.author}</strong><span>{new Date(p.createdAt).toLocaleDateString("vi-VN")}</span></div></div>)}</div></div>;
}
