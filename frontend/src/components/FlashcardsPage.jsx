import { useCallback, useEffect, useState } from "react";
import { getFlashcards, reviewFlashcard, ttsUrl } from "../api/client.js";
import { useAuth } from "../auth.jsx";
import { goToLogin, wordPath } from "../router.js";
import { speakableArabic } from "../speech.js";
import Mascot, { MascotMessage } from "./Mascot.jsx";
import SpeakButton from "./SpeakButton.jsx";
import StreakBadge from "./StreakBadge.jsx";
import WordContext from "./WordContext.jsx";
const RATINGS = [
  { value: "again", label: "Quên", hint: "Ôn lại ngay" },
  { value: "hard", label: "Khó", hint: "Sớm hơn" },
  { value: "good", label: "Nhớ", hint: "Bình thường" },
  { value: "easy", label: "Dễ", hint: "Lâu hơn" }
];
const formatDay = (date) => new Date(date).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" });
export default function FlashcardsPage() {
  const { user, ready } = useAuth();
  if (!ready) return <Shell><MascotMessage name="search" large>Đang tải...</MascotMessage></Shell>;
  if (!user) {
    return <Shell><div className="learn-card learn-card--center"><Mascot name="readingIdea" className="learn-card__mascot" /><h1>Ôn tập bằng thẻ từ</h1><p className="muted">Lưu những từ bạn muốn nhớ. Lạc đà sẽ nhắc bạn ôn đúng lúc sắp quên.</p><button type="button" className="btn-primary" onClick={goToLogin}>
            Đăng nhập để bắt đầu
          </button></div></Shell>;
  }
  return <Shell><Deck /></Shell>;
}
function Shell({ children }) {
  return <main className="section section--hero"><div className="section__inner learn">{children}</div></main>;
}
function Deck() {
  const { streak, toggleSaved, applyProgress } = useAuth();
  const [cards, setCards] = useState(null);
  const [queue, setQueue] = useState([]);
  const [reviewed, setReviewed] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    setError(null);
    try {
      const { cards: all, now } = await getFlashcards();
      setCards(all);
      setQueue(all.filter((c) => new Date(c.dueAt) <= new Date(now)));
    } catch {
      setError("Không tải được thẻ của bạn.");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const current = queue[0];
  async function rate(rating) {
    if (!current || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await reviewFlashcard(current.id, rating);
      applyProgress(result);
      const updated = { ...current, dueAt: result.dueAt, intervalDays: result.intervalDays };
      setCards((prev) => prev.map((c) => c.id === current.id ? updated : c));
      setQueue((prev) => rating === "again" ? [...prev.slice(1), updated] : prev.slice(1));
      setReviewed((n) => n + 1);
      setFlipped(false);
    } catch {
      setError("Chưa lưu được kết quả. Hãy thử lại.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!current || e.target.closest("input, textarea, a, button")) return;
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && /^[1-4]$/.test(e.key)) {
        rate(RATINGS[Number(e.key) - 1].value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
  async function remove(wordId) {
    try {
      await toggleSaved(wordId);
      setCards((prev) => prev.filter((c) => c.id !== wordId));
      setQueue((prev) => prev.filter((c) => c.id !== wordId));
      setFlipped(false);
    } catch {
      setError("Chưa xóa được thẻ này. Hãy thử lại.");
    }
  }
  if (error && !cards) {
    return <MascotMessage name="sad" large>{error}{" "}<button type="button" className="link-btn" onClick={load}>
          Thử lại
        </button></MascotMessage>;
  }
  if (!cards) return <MascotMessage name="search" large>Đang tải thẻ...</MascotMessage>;
  const nextDue = cards.length ? cards.reduce((a, c) => new Date(c.dueAt) < new Date(a) ? c.dueAt : a, cards[0].dueAt) : null;
  return <><div className="learn__head"><h1>Ôn tập</h1><StreakBadge streak={streak} /><span className="muted learn__count">{current ? `Còn ${queue.length} thẻ` : `${cards.length} thẻ đã lưu`}</span></div>{error && <p className="form-error" role="alert">{error}</p>}{cards.length === 0 && <div className="learn-card learn-card--center"><Mascot name="question" className="learn-card__mascot" /><h2>Chưa có thẻ nào</h2><p className="muted">Tìm một từ rồi bấm "+ Lưu thẻ ôn tập" để bắt đầu.</p><a className="btn-primary" href="#/">
            Đi tìm từ
          </a></div>}{current && <div className="fc"><div className="fc__card" role={flipped ? void 0 : "button"} tabIndex={flipped ? void 0 : 0} onClick={(e) => {
    if (!flipped && !e.target.closest("button")) setFlipped(true);
  }} onKeyDown={(e) => {
    if (e.target === e.currentTarget && e.key === "Enter") setFlipped(true);
  }}><div className="speak-row fc__word"><div dir="rtl">{speakableArabic(current.ar) || current.ar}</div><SpeakButton src={ttsUrl("word", current.id)} text={current.ar} headword size="lg" /></div>{flipped ? <div className="fc__answer"><div className="fc__vi">{current.vi || "Mục tham chiếu"}</div><div className="fc__full" dir="rtl">{current.ar}</div><WordContext context={current.context} /><a href={wordPath(current)}>Xem chi tiết →</a></div> : <p className="muted fc__prompt">Bạn còn nhớ nghĩa của từ này không? Bấm để xem đáp án.</p>}</div>{flipped ? <div className="fc__ratings">{RATINGS.map((r, i) => <button type="button" key={r.value} className={`fc__rate fc__rate--${r.value}`} disabled={busy} onClick={() => rate(r.value)}><strong>{r.label}</strong><small>{r.hint}</small><kbd>{i + 1}</kbd></button>)}</div> : <button type="button" className="btn-primary fc__show" onClick={() => setFlipped(true)}>
              Xem đáp án
            </button>}</div>}{!current && cards.length > 0 && <div className="learn-card learn-card--center"><Mascot name={reviewed ? "partyPopper" : "sleep"} className="learn-card__mascot" /><h2>{reviewed ? `Tuyệt vời! Bạn vừa ôn ${reviewed} lượt` : "Hôm nay không còn thẻ nào"}</h2><p className="muted">{nextDue ? `Hẹn gặp lại vào ${formatDay(nextDue)}.` : ""} Chuỗi hiện tại: {streak?.current ?? 0} ngày.
          </p><a className="btn-primary" href="#/challenge">
            Thử thách phát âm hôm nay
          </a></div>}{cards.length > 0 && <details className="fc-list"><summary>Tất cả thẻ ({cards.length})</summary><ul>{cards.map((c) => <li key={c.id}><a href={wordPath(c)}><span dir="rtl">{speakableArabic(c.ar) || c.ar}</span><small className="muted">{c.vi}</small></a><span className="muted fc-list__due">{formatDay(c.dueAt)}</span><button type="button" onClick={() => remove(c.id)}>
                  Xóa
                </button></li>)}</ul></details>}</>;
}
