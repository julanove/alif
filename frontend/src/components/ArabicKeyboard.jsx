import { useEffect } from "react";
const ROWS = [
  ["ض", "ص", "ث", "ق", "ف", "غ", "ع", "ه", "خ", "ح", "ج"],
  ["ش", "س", "ي", "ب", "ل", "ا", "ت", "ن", "م", "ك", "ط"],
  ["ظ", "ز", "و", "ة", "ى", "ر", "ذ", "د", "ء", "ئ", "ؤ"]
];
const HAMZA = ["أ", "إ", "آ"];
const keepFocus = (e) => e.preventDefault();
export default function ArabicKeyboard({ onKey, onBackspace, onSubmit, onClose }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  const key = (letter) => <button type="button" key={letter} className="ar-kb__key" onMouseDown={keepFocus} onClick={() => onKey(letter)}>{letter}</button>;
  return <div className="ar-kb" role="group" aria-label="Bàn phím tiếng Ả Rập"><div className="ar-kb__keys" dir="rtl">{ROWS.map((row, i) => <div className="ar-kb__row" key={i}>{row.map(key)}</div>)}<div className="ar-kb__row">{HAMZA.map(key)}<button type="button" className="ar-kb__key ar-kb__key--space" onMouseDown={keepFocus} onClick={() => onKey(" ")}>
            Dấu cách
          </button><button
    type="button"
    className="ar-kb__key ar-kb__key--wide"
    onMouseDown={keepFocus}
    onClick={onBackspace}
    aria-label="Xóa một ký tự"
    title="Xóa một ký tự"
  >
            ⌫
          </button><button type="button" className="ar-kb__key ar-kb__key--wide ar-kb__key--go" onMouseDown={keepFocus} onClick={onSubmit}>
            Tìm
          </button></div></div><button type="button" className="ar-kb__close" onMouseDown={keepFocus} onClick={onClose}>
        Đóng bàn phím
      </button></div>;
}
