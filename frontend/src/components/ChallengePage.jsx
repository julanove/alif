import { useEffect, useState } from "react";
import { getTodayChallenge, ttsUrl } from "../api/client.js";
import { useAuth } from "../auth.jsx";
import { goToLogin, wordPath } from "../router.js";
import { recordingSupported } from "../recorder.js";
import Mascot, { MascotMessage } from "./Mascot.jsx";
import SpeakButton from "./SpeakButton.jsx";
import StreakBadge from "./StreakBadge.jsx";
import { usePractice, PracticeButton, PracticeResult } from "./Practice.jsx";
const RESULTS = [
  { min: 90, stars: 3, mascot: "partyPopper", title: "Xuất sắc! Lạc đà phải ngả mũ!" },
  { min: 70, stars: 2, mascot: "cheering", title: "Giỏi lắm! Sắp hoàn hảo rồi!" },
  { min: 40, stars: 1, mascot: "okStar", title: "Khá lắm! Ngày mai sẽ tốt hơn!" },
  { min: 0, stars: 0, mascot: "ok", title: "Khởi đầu nào cũng khó, cố lên nhé!" }
];
export default function ChallengePage() {
  const { user, streak, refresh } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState({});
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    setError(false);
    getTodayChallenge().then((today) => {
      setData(today);
      setScores(Object.fromEntries(today.words.filter((w) => w.bestScore !== null).map((w) => [w.id, w.bestScore])));
    }).catch(() => setError(true));
  }, [user?.id]);
  function handleScore(wordId, score) {
    setScores((prev) => ({ ...prev, [wordId]: Math.max(prev[wordId] ?? 0, score) }));
    if (user) refresh();
  }
  let body;
  if (error) body = <MascotMessage name="sad" large>Không tải được thử thách hôm nay. Hãy thử lại sau.</MascotMessage>;
  else if (!data) body = <MascotMessage name="search" large>Đang chuẩn bị thử thách...</MascotMessage>;
  else if (!recordingSupported) body = <MascotMessage name="question" large>Trình duyệt này chưa hỗ trợ ghi âm. Hãy thử Chrome hoặc Edge.</MascotMessage>;
  else if (finished) {
    body = <Summary words={data.words} scores={scores} streak={streak} signedIn={Boolean(user)} onReplay={() => {
      setIndex(0);
      setFinished(false);
    }} />;
  } else {
    const word = data.words[index];
    const last = index === data.words.length - 1;
    body = <><ol className="challenge__dots" aria-label="Tiến độ">{data.words.map((w, i) => <li key={w.id}><button
      type="button"
      className={`challenge__dot ${i === index ? "challenge__dot--on" : ""} ${scores[w.id] !== void 0 ? "challenge__dot--done" : ""}`}
      onClick={() => setIndex(i)}
      aria-label={`Từ ${i + 1}${scores[w.id] !== void 0 ? `: ${scores[w.id]}%` : ""}`}
    >{scores[w.id] !== void 0 ? scores[w.id] : i + 1}</button></li>)}</ol><ChallengeWord key={word.id} word={word} onScore={(score) => handleScore(word.id, score)} /><div className="challenge__nav"><button type="button" className="btn-secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>
            ← Từ trước
          </button>{last ? <button type="button" className="btn-primary" disabled={Object.keys(scores).length === 0} onClick={() => {
      setFinished(true);
      window.scrollTo(0, 0);
    }}>
              Xem kết quả
            </button> : <button type="button" className="btn-primary" onClick={() => setIndex(index + 1)}>
              Từ tiếp theo →
            </button>}</div>{!user && <p className="challenge__login muted"><button type="button" className="link-btn" onClick={goToLogin}>
              Đăng nhập
            </button>{" "}
            để lưu điểm và giữ chuỗi ngày học.
          </p>}</>;
  }
  return <main className="section section--hero"><div className="section__inner learn"><div className="learn__head"><h1>Thử thách phát âm</h1>{user && <StreakBadge streak={streak} />}<span className="muted learn__count">5 từ mới mỗi ngày</span></div>{body}</div></main>;
}
function ChallengeWord({ word, onScore }) {
  const practice = usePractice("word", word.id);
  const { status, result } = practice;
  useEffect(() => {
    if (status === "done" && result) onScore(result.score);
  }, [status, result]);
  return <div className="challenge__card"><Mascot name="readingIdea" className="challenge__mascot" /><a className="challenge__ar" dir="rtl" href={wordPath(word)}>{word.ar}</a><div className="challenge__vi">{word.vi}</div><p className="muted challenge__how">Nghe giọng mẫu, rồi bấm micro và đọc to. Bấm micro lần nữa khi đọc xong.</p><div className="challenge__controls"><span className="challenge__control"><SpeakButton src={ttsUrl("word", word.id)} text={word.ar} size="lg" />
          Nghe mẫu
        </span><span className="challenge__control"><PracticeButton practice={practice} size="lg" />
          Đọc thử
        </span></div><PracticeResult practice={practice} /></div>;
}
function Summary({ words, scores, streak, signedIn, onReplay }) {
  const total = words.reduce((sum, w) => sum + (scores[w.id] ?? 0), 0);
  const average = Math.round(total / words.length);
  const result = RESULTS.find((r) => average >= r.min);
  const skipped = words.filter((w) => scores[w.id] === void 0).length;
  return <div className="learn-card learn-card--center challenge__summary">{result.stars >= 2 && <Confetti />}<Mascot name={result.mascot} className="learn-card__mascot challenge__summary-mascot" /><h2>{result.title}</h2><div className="challenge__stars" role="img" aria-label={`${result.stars} trên 3 sao`}>{[1, 2, 3].map((n) => <span key={n} className={n <= result.stars ? "challenge__star--on" : ""}>
            ★
          </span>)}</div><p className="challenge__score">{average}%</p>{skipped > 0 && <p className="muted">Bạn còn {skipped} từ chưa đọc, nên điểm chưa tính đủ.</p>}{signedIn && streak && <p className="muted">Chuỗi hiện tại: {streak.current} ngày học liên tiếp.</p>}<ul className="challenge__breakdown">{words.map((w) => <li key={w.id}><a href={wordPath(w)} dir="rtl">{w.ar}</a><span>{scores[w.id] !== void 0 ? `${scores[w.id]}%` : "Chưa đọc"}</span></li>)}</ul><button type="button" className="btn-primary" onClick={onReplay}>
        Luyện lại để phá kỷ lục
      </button></div>;
}
const CONFETTI_COLORS = ["#1f7a6c", "#a84e26", "#e9b949", "#2f6690", "#c0392b"];
function Confetti() {
  return <div className="confetti" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <span
    key={i}
    style={{
      left: `${i * 37 % 100}%`,
      background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      animationDelay: `${i % 7 * 0.12}s`
    }}
  />)}</div>;
}
