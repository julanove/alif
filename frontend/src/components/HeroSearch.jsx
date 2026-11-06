import SearchBar from "./SearchBar.jsx";
import MatchModeToggle from "./MatchModeToggle.jsx";
import Mascot from "./Mascot.jsx";
export default function HeroSearch({ query, onQueryChange, onSubmit, matchMode, onMatchModeChange, autoFocus, showingContent }) {
  return <div className={`hero__intro ${showingContent ? "hero__intro--content" : ""}`}><div className="hero__main"><h1 className="hero__title">Tra cứu từ Ả Rập</h1><p className="muted">Hỗ trợ tìm kiếm theo tiếng Việt và tiếng Ả Rập.</p><div className="hero__search"><SearchBar value={query} onChange={onQueryChange} onSubmit={onSubmit} autoFocus={autoFocus} /><MatchModeToggle value={matchMode} onChange={onMatchModeChange} /></div></div><div className="hero__sign"><Mascot name="blankText" /><div className="hero__sign-text"><span dir="rtl">أهلاً وسهلاً</span><small>Xin chào!</small></div></div></div>;
}
