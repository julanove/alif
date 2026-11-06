import { useEffect, useState } from "react";
import { getWord, ttsUrl } from "../api/client.js";
import WordNotes from "./WordNotes.jsx";
import ExampleList from "./ExampleList.jsx";
import RelatedWords from "./RelatedWords.jsx";
import SpeakButton from "./SpeakButton.jsx";
import { usePractice, PracticeButton, PracticeResult } from "./Practice.jsx";
import Mascot, { MascotMessage } from "./Mascot.jsx";
import WordContext from "./WordContext.jsx";
import FlashcardButton from "./FlashcardButton.jsx";
import { RELATED_WORDS_ENABLED, WORD_NOTES_ENABLED } from "../features.js";
const SHOW_ASIDE = RELATED_WORDS_ENABLED || WORD_NOTES_ENABLED;
const DETAIL_FIELDS = [
  ["transliteration", "Phiên âm"],
  ["partOfSpeech", "Từ loại"],
  ["root", "Gốc từ"],
  ["plural", "Số nhiều"]
];
export default function WordPage({ wordKey }) {
  const [word, setWord] = useState(null);
  const [error, setError] = useState(null);
  const practice = usePractice("word", word?.id);
  useEffect(() => {
    setWord(null);
    setError(null);
    getWord(wordKey).then(setWord).catch((e) => setError(e.message));
  }, [wordKey]);
  return <main className="section section--hero"><div className="section__inner word-page"><a className="back-link" href="#/">
          ← Về trang tìm kiếm
        </a>{error && <MascotMessage name="sad" large>
            Không tải được từ này ({error}).
          </MascotMessage>}{!word && !error && <MascotMessage name="search" large>
            Đang tải...
          </MascotMessage>}{word && <><section className="word-page__head"><Mascot name="okStar" className="word-page__head-mascot" /><div className="speak-row"><div className="word-page__ar" dir="rtl">{word.ar}</div><SpeakButton src={ttsUrl("word", word.id)} text={word.ar} size="lg" headword /><PracticeButton practice={practice} size="lg" /></div><PracticeResult practice={practice} />{word.vi ? <div className="word-page__vi">{word.vi}</div> : <div className="word-card__vi--ref">Mục tham chiếu — xem từ được nhắc tới ở trên</div>}<WordContext context={word.context} /><div className="word-page__actions"><FlashcardButton wordId={word.id} /></div><dl className="word-page__facts">{DETAIL_FIELDS.filter(([key]) => word.details?.[key]).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{word.details[key]}</dd></div>)}<div><dt>Lượt xem</dt><dd>{word.details?.viewCount ?? 1}</dd></div></dl></section><div className={`word-page__columns${SHOW_ASIDE ? "" : " word-page__columns--single"}`}><section className="word-page__section"><Mascot name="readingIdea" className="word-page__section-mascot" /><h2>Câu ví dụ</h2><ExampleList wordId={word.id} initial={word.examples} /></section>{SHOW_ASIDE && <div className="word-page__aside">{RELATED_WORDS_ENABLED && <section className="word-page__section"><Mascot name="questionList" className="word-page__section-mascot" /><h2>Từ liên quan</h2><RelatedWords wordId={word.id} initial={word.related} /></section>}{WORD_NOTES_ENABLED && <section className="word-page__section"><Mascot name="heart" className="word-page__section-mascot" /><h2>Đóng góp từ cộng đồng</h2><WordNotes wordId={word.id} /></section>}</div>}</div></>}</div></main>;
}
