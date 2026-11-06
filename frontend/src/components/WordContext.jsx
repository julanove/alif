export default function WordContext({ context }) {
  if (!context) return null;
  return <div className="word-context"><span className="word-context__label">Ngữ cảnh:</span><span>{context}</span></div>;
}
