export default function StreakBadge({ streak }) {
  const days = streak?.current ?? 0;
  const lit = Boolean(streak?.activeToday);
  const label = lit ? `Chuỗi ${days} ngày học liên tiếp` : `Chuỗi ${days} ngày. Học hôm nay để giữ chuỗi nhé!`;
  return <span className={`streak ${lit ? "streak--lit" : ""}`} title={label} aria-label={label} role="img"><svg viewBox="0 0 24 24" aria-hidden="true"><path
    d="M12 2c1 3.5-1 5.2-2.6 7.2C8 11 7 12.6 7 14.6A5 5 0 0 0 17 14.6c0-2.2-1-3.8-2-5-.2 1.4-.9 2.4-2 2.9.5-3.4-.1-7.300-1-10.500z"
    fill="currentColor"
  /></svg>{days}</span>;
}
