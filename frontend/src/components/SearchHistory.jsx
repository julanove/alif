import Mascot from "./Mascot.jsx";
export default function SearchHistory({ items, onSelect }) {
  if (!items.length) return null;
  return <div className="history"><Mascot name="searchBar" className="history__mascot" /><span className="history__label">Đã tìm gần đây:</span>{items.map((term) => <button key={term} className="history__chip" onClick={() => onSelect(term)}>{term}</button>)}</div>;
}
