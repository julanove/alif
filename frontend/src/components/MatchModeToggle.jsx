const OPTIONS = [
  { value: "startsWith", label: "Bắt đầu với" },
  { value: "endsWith", label: "Kết thúc với" },
  { value: "contains", label: "Bao gồm" },
  { value: "exact", label: "Tìm chính xác" }
];
export default function MatchModeToggle({ value, onChange }) {
  return <div className="match-mode" role="radiogroup" aria-label="Kiểu tìm kiếm">{OPTIONS.map((opt) => <label
    key={opt.value}
    className={`match-mode__option ${value === opt.value ? "match-mode__option--active" : ""}`}
  ><input
    type="radio"
    name="match-mode"
    value={opt.value}
    checked={value === opt.value}
    onChange={() => onChange(opt.value)}
  />{opt.label}</label>)}</div>;
}
