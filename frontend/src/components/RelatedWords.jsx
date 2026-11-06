import { useEffect, useState } from "react";
import { addRelation, searchWords } from "../api/client.js";
import { wordPath } from "../router.js";
import { MascotMessage } from "./Mascot.jsx";
const GROUPS = [
  ["synonym", "Từ đồng nghĩa"],
  ["antonym", "Từ trái nghĩa"],
  ["related", "Liên quan"]
];
export default function RelatedWords({ wordId, initial }) {
  const [related, setRelated] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState("synonym");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState([]);
  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setHits([]);
      return;
    }
    const timer = setTimeout(() => {
      searchWords(term).then((r) => setHits(r.filter((w) => w.id !== wordId).slice(0, 6))).catch(() => setHits([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, wordId]);
  async function pick(hit) {
    try {
      const added = await addRelation(wordId, hit.id, type);
      setRelated(
        (prev) => prev.some((r) => r.id === added.id && r.type === added.type) ? prev : [...prev, added]
      );
      setQuery("");
      setAdding(false);
    } catch {
    }
  }
  return <>{related.length === 0 && <MascotMessage name="questionPaper">Chưa có từ liên quan.</MascotMessage>}{GROUPS.map(([key, label]) => {
    const items = related.filter((r) => r.type === key);
    if (!items.length) return null;
    return <div key={key} className="related__group"><h3>{label}</h3><div className="related__chips">{items.map((r) => <a key={r.id} className="chip" href={wordPath(r)}><span dir="rtl">{r.ar}</span>{r.vi && <small>{r.vi}</small>}</a>)}</div></div>;
  })}{!adding ? <button className="word-card__toggle" onClick={() => setAdding(true)}>
          + Thêm từ liên quan
        </button> : <div className="note-form"><select value={type} onChange={(e) => setType(e.target.value)}>{GROUPS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><input
    type="text"
    placeholder="Tìm từ để liên kết (Ả Rập hoặc Việt)"
    value={query}
    onChange={(e) => setQuery(e.target.value)}
  />{hits.map((h) => <button key={h.id} type="button" className="related__hit" onClick={() => pick(h)}><span dir="rtl">{h.ar}</span> — {h.vi ?? "(tham chiếu)"}</button>)}</div>}</>;
}
