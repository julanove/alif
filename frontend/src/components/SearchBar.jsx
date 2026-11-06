import { useCallback, useEffect, useRef, useState } from "react";
import ArabicKeyboard from "./ArabicKeyboard.jsx";
const ARABIC_RE = /[؀-ۿ]/;
export default function SearchBar({ value, onChange, onSubmit, autoFocus = false }) {
  const isArabic = ARABIC_RE.test(value);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const input = useRef(null);
  useEffect(() => {
    if (!autoFocus) return;
    const end = input.current.value.length;
    input.current.setSelectionRange(end, end);
  }, []);
  function edit(text, deleteBefore = 0) {
    const el = input.current;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const from = start === end ? Math.max(0, start - deleteBefore) : start;
    const caret = from + text.length;
    onChange(value.slice(0, from) + text + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }
  const closeKeyboard = useCallback(() => setKeyboardOpen(false), []);
  return <form
    className="search-bar"
    role="search"
    onSubmit={(e) => {
      e.preventDefault();
      onSubmit(value);
    }}
  ><span className="search-bar__icon" aria-hidden="true">
        🔍
      </span><input
    ref={input}
    className={`search-bar__input ${isArabic ? "search-bar__input--rtl" : ""}`}
    type="search"
    dir={isArabic ? "rtl" : "ltr"}
    aria-label="Tìm từ"
    placeholder="Nhập từ tiếng Việt hoặc tiếng Ả Rập... / اكتب كلمة"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    autoFocus={autoFocus}
    inputMode={keyboardOpen ? "none" : void 0}
  />{value && <button type="button" className="search-bar__clear" aria-label="Xóa" onClick={() => onChange("")}>
          ×
        </button>}<button
    type="button"
    className={`search-bar__kb-toggle ${keyboardOpen ? "search-bar__kb-toggle--on" : ""}`}
    onMouseDown={(e) => e.preventDefault()}
    onClick={() => setKeyboardOpen((open) => !open)}
    aria-expanded={keyboardOpen}
    aria-label="Bàn phím tiếng Ả Rập"
    title="Bàn phím tiếng Ả Rập"
  ><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="6" width="20" height="13" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 15h10" stroke="currentColor" strokeWidth="2.200" strokeLinecap="round" /></svg></button>{keyboardOpen && <ArabicKeyboard
    onKey={(letter) => edit(letter)}
    onBackspace={() => edit("", 1)}
    onSubmit={() => onSubmit(value)}
    onClose={closeKeyboard}
  />}</form>;
}
