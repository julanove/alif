import { useEffect, useState } from "react";
import WordPage from "./components/WordPage.jsx";
import AuthPage from "./components/AuthPage.jsx";
import FlashcardsPage from "./components/FlashcardsPage.jsx";
import ChallengePage from "./components/ChallengePage.jsx";
import { useHashRoute, wordPath } from "./router.js";
import SearchHistory from "./components/SearchHistory.jsx";
import HeroSearch from "./components/HeroSearch.jsx";
import FortuneCard from "./components/FortuneCard.jsx";
import WordOfDay from "./components/WordOfDay.jsx";
import WordCard from "./components/WordCard.jsx";
import CommunityFeed from "./components/CommunityFeed.jsx";
import SiteBanner from "./components/SiteBanner.jsx";
import AdRail from "./components/AdRail.jsx";
import Mascot, { MascotMessage } from "./components/Mascot.jsx";
import { searchWords } from "./api/client.js";
import { loadHistory, pushHistory } from "./api/history.js";
import { COMMUNITY_FEED_ENABLED } from "./features.js";
import { useAuth } from "./auth.jsx";
export default function App() {
  const route = useHashRoute();
  const [query, setQuery] = useState("");
  const [matchMode, setMatchMode] = useState("startsWith");
  const [history, setHistory] = useState(loadHistory);
  function showResults() {
    if (route.name !== "home") window.location.hash = "#/";
  }
  function handleQueryChange(value) {
    setQuery(value);
    if (value.trim()) showResults();
  }
  function runSearch(term) {
    setQuery(term);
    setHistory(pushHistory(term));
    showResults();
  }
  return <div className="page"><SiteBanner onHome={() => setQuery("")} /><AdRail side="left" /><AdRail side="right" /><div className="page__content">{(route.name === "home" || route.name === "word") && <div className="section section--hero section--search"><div className="section__inner"><HeroSearch
    query={query}
    onQueryChange={handleQueryChange}
    onSubmit={runSearch}
    matchMode={matchMode}
    onMatchModeChange={setMatchMode}
    autoFocus={route.name === "home"}
    showingContent={route.name === "word" || Boolean(query.trim())}
  /></div></div>}{route.name === "word" && <WordPage key={route.key} wordKey={route.key} />}{(route.name === "login" || route.name === "register") && <AuthPage key={route.name} initialMode={route.name} />}{route.name === "flashcards" && <FlashcardsPage />}{route.name === "challenge" && <ChallengePage />}{route.name === "home" && <Home query={query} matchMode={matchMode} history={history} onSearch={runSearch} />}</div><footer className="section section--footer"><div className="section__inner"><p className="muted">Bản demo · Sản phẩm của Khoa NN & VH Ả Rập</p></div></footer></div>;
}
function Home({ query, matchMode, history, onSearch }) {
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setError(null);
    setSearched(false);
    setResults([]);
    const term = query.trim();
    if (!term) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      searchWords(term, matchMode, controller.signal).then(({ words, total: count }) => {
        setResults(words);
        setTotal(count);
        setSearched(true);
        setLoading(false);
      }).catch((err) => {
        if (err.name === "AbortError") return;
        setError(
          err.status === 429 ? "Có quá nhiều lượt tìm kiếm từ mạng của bạn. Vui lòng đợi một phút rồi thử lại." : "Không tìm được lúc này. Hãy kiểm tra kết nối mạng rồi thử lại."
        );
        setLoading(false);
      });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, matchMode, attempt]);
  const idle = !query.trim();
  return <><main className="section section--hero"><div className="section__inner hero"><SearchHistory items={history} onSelect={onSearch} />{idle && <HomeHub onPick={(w) => {
    window.location.hash = wordPath(w);
  }} />}{loading && <MascotMessage name="search" large>
              Đang tìm kiếm...
            </MascotMessage>}{error && <div className="search-error" role="alert"><MascotMessage name="sad" large>{error}</MascotMessage><button type="button" className="btn-primary" onClick={() => setAttempt((n) => n + 1)}>
                Thử lại
              </button></div>}{searched && !loading && <section className="results">{results.length === 0 ? <MascotMessage name="question" large>
                  Không tìm thấy kết quả cho "{query}".
                </MascotMessage> : <><MascotMessage name="questionList">{total > results.length ? `${results.length} kết quả phù hợp nhất trong số ${total} kết quả cho "${query}"` : `${results.length} kết quả cho "${query}"`}</MascotMessage>{results.map((w) => <WordCard key={w.id} word={w} />)}</>}</section>}</div></main>{idle && COMMUNITY_FEED_ENABLED && <div className="section section--community"><div className="section__inner"><CommunityFeed /></div></div>}</>;
}
function HomeHub({ onPick }) {
  const { user, due } = useAuth();
  return <div className="home-hub"><div className="home-hub__daily"><WordOfDay onPick={onPick} /><FortuneCard /></div><div className="home-hub__tiles"><a className="home-tile" href="#/flashcards"><Mascot name="readingIdea" className="home-tile__mascot" /><span><strong>Ôn tập thẻ từ</strong><small>{user ? due > 0 ? `${due} thẻ đang chờ bạn` : "Đã ôn hết thẻ hôm nay" : "Lưu từ và ôn đúng lúc sắp quên"}</small></span></a><a className="home-tile" href="#/challenge"><Mascot name="cheering" className="home-tile__mascot" /><span><strong>Thử thách phát âm</strong><small>5 từ mới hôm nay. Bạn được mấy sao?</small></span></a></div></div>;
}
