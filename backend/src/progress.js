import { pool } from "./db.js";
export function vnDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(now);
}
function previousDay(date) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
export function computeStreak(dates, today) {
  const days = new Set(dates);
  const activeToday = days.has(today);
  let current = 0;
  let cursor = activeToday ? today : previousDay(today);
  while (days.has(cursor)) {
    current++;
    cursor = previousDay(cursor);
  }
  let longest = 0;
  for (const day of days) {
    if (days.has(previousDay(day))) continue;
    let length = 0;
    let probe = new Date(`${day}T00:00:00Z`);
    while (days.has(probe.toISOString().slice(0, 10))) {
      length++;
      probe = new Date(probe.getTime() + 864e5);
    }
    longest = Math.max(longest, length);
  }
  return { current, longest, activeToday };
}
export async function getStreak(userId) {
  const [rows] = await pool.query(
    "SELECT DATE_FORMAT(activity_date, '%Y-%m-%d') AS day FROM user_activity WHERE user_id = ?",
    [userId]
  );
  return computeStreak(rows.map((r) => r.day), vnDate());
}
export async function recordActivity(userId, kind) {
  const column = kind === "review" ? "reviews" : "challenge_words";
  await pool.query(
    `INSERT INTO user_activity (user_id, activity_date, ${column}) VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE ${column} = ${column} + 1`,
    [userId, vnDate()]
  );
}
export async function countDueCards(userId) {
  const [[{ due }]] = await pool.query(
    `SELECT COUNT(*) AS due FROM flashcards f JOIN dictionary d ON d.id = f.word_id
     WHERE f.user_id = ? AND f.due_at <= ?`,
    [userId, new Date()]
  );
  return due;
}
