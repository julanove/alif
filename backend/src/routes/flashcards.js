import { Router } from "express";
import { pool } from "../db.js";
import { noStore, requireUser } from "../auth.js";
import { RATINGS, nextReview } from "../srs.js";
import { recordActivity, getStreak, countDueCards } from "../progress.js";
const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const MAX_CARDS = 5e3;
router.use(noStore, requireUser);
router.get(
  "/",
  wrap(async (req, res) => {
    const [cards] = await pool.query(
      `SELECT d.id, d.ar, d.vi, d.context, d.slug, f.due_at AS dueAt, f.reps, f.interval_days AS intervalDays
       FROM flashcards f JOIN dictionary d ON d.id = f.word_id
       WHERE f.user_id = ? ORDER BY f.due_at, f.created_at`,
      [req.user.id]
    );
    res.json({ cards, now: new Date() });
  })
);
router.post(
  "/",
  wrap(async (req, res) => {
    const wordId = String(req.body?.wordId ?? "");
    const [[word]] = await pool.query("SELECT id FROM dictionary WHERE id = ?", [wordId]);
    if (!word) return res.status(404).json({ error: "Không tìm thấy từ này" });
    const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM flashcards WHERE user_id = ?", [req.user.id]);
    if (total >= MAX_CARDS) return res.status(400).json({ error: `Bạn chỉ có thể lưu tối đa ${MAX_CARDS} thẻ` });
    await pool.query("INSERT IGNORE INTO flashcards (user_id, word_id, due_at) VALUES (?, ?, ?)", [
      req.user.id,
      word.id,
      new Date(Date.now() - 1e3)
    ]);
    res.status(201).json({ wordId: word.id, due: await countDueCards(req.user.id) });
  })
);
router.delete(
  "/:wordId",
  wrap(async (req, res) => {
    await pool.query("DELETE FROM flashcards WHERE user_id = ? AND word_id = ?", [req.user.id, req.params.wordId]);
    res.json({ ok: true, due: await countDueCards(req.user.id) });
  })
);
router.post(
  "/:wordId/review",
  wrap(async (req, res) => {
    const rating = req.body?.rating;
    if (!RATINGS.includes(rating)) return res.status(400).json({ error: "Invalid rating" });
    const [[card]] = await pool.query(
      "SELECT ease, interval_days AS intervalDays, reps FROM flashcards WHERE user_id = ? AND word_id = ?",
      [req.user.id, req.params.wordId]
    );
    if (!card) return res.status(404).json({ error: "Không tìm thấy thẻ này" });
    const next = nextReview({ ease: Number(card.ease), intervalDays: card.intervalDays, reps: card.reps }, rating);
    await pool.query("UPDATE flashcards SET ease = ?, interval_days = ?, reps = ?, due_at = ? WHERE user_id = ? AND word_id = ?", [
      next.ease,
      next.intervalDays,
      next.reps,
      next.dueAt,
      req.user.id,
      req.params.wordId
    ]);
    await recordActivity(req.user.id, "review");
    const [streak, due] = await Promise.all([getStreak(req.user.id), countDueCards(req.user.id)]);
    res.json({ dueAt: next.dueAt, intervalDays: next.intervalDays, streak, due });
  })
);
export default router;
