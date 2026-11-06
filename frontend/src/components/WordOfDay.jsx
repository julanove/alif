import { useEffect, useState } from "react";
import { getWordOfDay, ttsUrl } from "../api/client.js";
import SpeakButton from "./SpeakButton.jsx";
import { usePractice, PracticeButton, PracticeResult } from "./Practice.jsx";
import Mascot from "./Mascot.jsx";
import WordContext from "./WordContext.jsx";
import FlashcardButton from "./FlashcardButton.jsx";
export default function WordOfDay({ onPick }) {
  const [word, setWord] = useState(null);
  const practice = usePractice("word", word?.id);
  useEffect(() => {
    getWordOfDay().then(setWord).catch(() => setWord(null));
  }, []);
  if (!word) return null;
  function handleClick(e) {
    if (e.target.closest("button")) return;
    onPick(word);
  }
  function handleKeyDown(e) {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPick(word);
    }
  }
  return <section className="word-of-day"><div className="word-of-day__badge">Từ của ngày</div><div className="word-of-day__card" role="button" tabIndex={0} onClick={handleClick} onKeyDown={handleKeyDown}><Mascot name="readingIdea" className="word-of-day__mascot" /><div className="speak-row word-of-day__ar-row"><div className="word-of-day__ar" dir="rtl">{word.ar}</div><SpeakButton src={ttsUrl("word", word.id)} text={word.ar} headword /><PracticeButton practice={practice} /></div><div className="word-of-day__vi">{word.vi}</div><WordContext context={word.context} /><div className="word-of-day__actions"><FlashcardButton wordId={word.id} /></div></div><PracticeResult practice={practice} /></section>;
}
