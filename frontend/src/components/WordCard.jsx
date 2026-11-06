import { useState } from "react";
import WordNotes from "./WordNotes.jsx";
import { wordPath } from "../router.js";
import SpeakButton from "./SpeakButton.jsx";
import WordContext from "./WordContext.jsx";
import FlashcardButton from "./FlashcardButton.jsx";
import { ttsUrl } from "../api/client.js";
export default function WordCard({ word, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  function handleCardClick(e) {
    if (e.target.closest("a, button, input, textarea, .word-card__notes")) return;
    if (window.getSelection().toString()) return;
    window.location.hash = wordPath(word);
  }
  return <article className="word-card" onClick={handleCardClick}><div className="word-card__main"><div className="speak-row"><div className="word-card__ar" dir="rtl">{word.ar}</div><SpeakButton src={ttsUrl("word", word.id)} text={word.ar} headword /></div>{word.vi ? <div className="word-card__vi">{word.vi}</div> : <div className="word-card__vi word-card__vi--ref">Mục tham chiếu — xem từ được nhắc tới ở trên</div>}<WordContext context={word.context} /></div><div className="word-card__actions"><a className="word-card__detail" href={wordPath(word)}>
          Xem chi tiết →
        </a><FlashcardButton wordId={word.id} /><button className="word-card__toggle" onClick={() => setOpen((v) => !v)}>{open ? "Ẩn ghi chú ▲" : "Xem ghi chú cộng đồng ▼"}</button></div>{open && <div className="word-card__notes"><WordNotes wordId={word.id} /></div>}</article>;
}
