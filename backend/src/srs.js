export const RATINGS = ["again", "hard", "good", "easy"];
const MIN_EASE = 1.3;
const MAX_EASE = 3;
const MAX_INTERVAL_DAYS = 365;
const AGAIN_DELAY_MS = 10 * 60 * 1e3;
const DAY_MS = 864e5;
const clampEase = (ease) => Math.round(Math.min(MAX_EASE, Math.max(MIN_EASE, ease)) * 100) / 100;
export function nextReview({ ease, intervalDays, reps }, rating, now = new Date()) {
  if (rating === "again") {
    return {
      ease: clampEase(ease - 0.2),
      intervalDays: 0,
      reps: 0,
      dueAt: new Date(now.getTime() + AGAIN_DELAY_MS)
    };
  }
  let days;
  let nextEase = ease;
  if (rating === "hard") {
    days = Math.max(1, Math.round(intervalDays * 1.2));
    nextEase = ease - 0.15;
  } else if (rating === "good") {
    days = reps === 0 ? 1 : reps === 1 ? 3 : Math.round(intervalDays * ease);
  } else {
    days = reps === 0 ? 4 : Math.round(Math.max(intervalDays, 1) * ease * 1.3);
    nextEase = ease + 0.15;
  }
  days = Math.min(MAX_INTERVAL_DAYS, Math.max(1, days));
  return {
    ease: clampEase(nextEase),
    intervalDays: days,
    reps: reps + 1,
    dueAt: new Date(now.getTime() + days * DAY_MS)
  };
}
