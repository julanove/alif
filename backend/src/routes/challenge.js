import { Router } from "express";
import crypto from "node:crypto";
import { pool } from "../db.js";
import { noStore } from "../auth.js";
import { getStreak, recordActivity, vnDate } from "../progress.js";
import { speakableArabic } from "./tts.js";
import { foldArabic } from "../searchText.js";
const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
export const WORDS_PER_DAY = 5;
function headword(ar) {
  return speakableArabic(ar).split(/[،,]/)[0].trim();
}
let cached = { date: null, words: [] };
export async function dailyWords(date = vnDate()) {
  if (cached.date === date) return cached.words;
  const [rows] = await pool.query(
    `SELECT d.id, d.ar, d.vi, d.slug FROM dictionary d
     WHERE d.vi IS NOT NULL
       AND EXISTS (SELECT 1 FROM word_examples e WHERE e.word_id = d.id AND e.source = 'seed')`
  );
  const seen = new Set();
  const words = rows.map((row) => ({ ...row, ar: headword(row.ar) })).filter((w) => w.ar.length >= 3 && w.ar.length <= 14 && !/\s/.test(w.ar)).map((w) => ({ w, order: crypto.createHash("sha256").update(`${date}|${w.id}`).digest("hex") })).sort((a, b) => a.order < b.order ? -1 : 1).map(({ w }) => w).filter((w) => {
    const key = foldArabic(w.ar);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, WORDS_PER_DAY);
  cached = { date, words };
  return words;
}
export async function recordChallengeScore(userId, wordId, score) {
  const date = vnDate();
  const words = await dailyWords(date);
  if (!words.some((w) => w.id === String(wordId))) return null;
  const [result] = await pool.query(
    `INSERT INTO challenge_attempts (user_id, challenge_date, word_id, best_score) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE best_score = GREATEST(best_score, VALUES(best_score)), attempts = attempts + 1`,
    [userId, date, wordId, score]
  );
  if (result.affectedRows === 1) await recordActivity(userId, "challenge");
  const [[row]] = await pool.query(
    "SELECT best_score AS bestScore FROM challenge_attempts WHERE user_id = ? AND challenge_date = ? AND word_id = ?",
    [userId, date, wordId]
  );
  return row.bestScore;
}
router.get(
  "/challenge/today",
  noStore,
  wrap(async (req, res) => {
    const date = vnDate();
    const words = await dailyWords(date);
    let best = new Map();
    let streak = null;
    if (req.user) {
      const [rows] = await pool.query(
        "SELECT word_id AS wordId, best_score AS bestScore FROM challenge_attempts WHERE user_id = ? AND challenge_date = ?",
        [req.user.id, date]
      );
      best = new Map(rows.map((r) => [r.wordId, r.bestScore]));
      streak = await getStreak(req.user.id);
    }
    res.json({
      date,
      words: words.map((w) => ({ ...w, bestScore: best.get(w.id) ?? null })),
      streak
    });
  })
);
export default router;
