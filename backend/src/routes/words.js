import { Router } from "express";
import crypto from "node:crypto";
import { pool } from "../db.js";
const router = Router();
const RELATION_TYPES = ["synonym", "antonym", "related"];
const MAX_SENTENCE_LENGTH = 500;
const MAX_AUTHOR_LENGTH = 100;
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
async function findWordById(id) {
  const [rows] = await pool.query("SELECT id, ar, vi, context, slug FROM dictionary WHERE id = ?", [id]);
  return rows[0] ?? null;
}
async function findWordByKey(key) {
  const [rows] = await pool.query(
    "SELECT id, ar, vi, context, slug FROM dictionary WHERE slug = ? OR id = ? ORDER BY slug = ? DESC LIMIT 1",
    [key, key, key]
  );
  return rows[0] ?? null;
}
const clean = (value) => typeof value === "string" ? value.trim() : "";
router.get(
  "/words/:id",
  wrap(async (req, res) => {
    const word = await findWordByKey(req.params.id);
    if (!word) return res.status(404).json({ error: "Word not found" });
    await pool.query(
      "INSERT INTO word_details (word_id, view_count) VALUES (?, 1) ON DUPLICATE KEY UPDATE view_count = view_count + 1",
      [word.id]
    );
    const [[details]] = await pool.query(
      `SELECT part_of_speech AS partOfSpeech, root, plural, transliteration, view_count AS viewCount
       FROM word_details WHERE word_id = ?`,
      [word.id]
    );
    const [examples] = await pool.query(
      `SELECT id, ar, vi, author, source, likes, created_at AS createdAt
       FROM word_examples WHERE word_id = ? ORDER BY likes DESC, created_at DESC`,
      [word.id]
    );
    const [related] = await pool.query(
      `SELECT r.relation_type AS type, d.id, d.ar, d.vi, d.slug
       FROM word_relations r
       JOIN dictionary d ON d.id = IF(r.word_id = ?, r.related_word_id, r.word_id)
       WHERE r.word_id = ? OR r.related_word_id = ?`,
      [word.id, word.id, word.id]
    );
    res.json({ ...word, details, examples, related });
  })
);
router.post(
  "/words/:id/examples",
  wrap(async (req, res) => {
    const word = await findWordById(req.params.id);
    if (!word) return res.status(404).json({ error: "Word not found" });
    const ar = clean(req.body?.ar);
    const vi = clean(req.body?.vi);
    if (!ar || !vi) return res.status(400).json({ error: "ar and vi are required" });
    if (ar.length > MAX_SENTENCE_LENGTH || vi.length > MAX_SENTENCE_LENGTH) {
      return res.status(400).json({ error: `Sentences are limited to ${MAX_SENTENCE_LENGTH} characters` });
    }
    const example = {
      id: crypto.randomUUID(),
      ar,
      vi,
      author: clean(req.body?.author).slice(0, MAX_AUTHOR_LENGTH) || "Ẩn danh",
      source: "community",
      likes: 0,
      createdAt: new Date()
    };
    await pool.query(
      "INSERT INTO word_examples (id, word_id, ar, vi, author, source, likes, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)",
      [example.id, word.id, example.ar, example.vi, example.author, example.source, example.createdAt]
    );
    res.status(201).json(example);
  })
);
router.post(
  "/examples/:id/like",
  wrap(async (req, res) => {
    const [result] = await pool.query("UPDATE word_examples SET likes = likes + 1 WHERE id = ?", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: "Example not found" });
    const [[row]] = await pool.query("SELECT likes FROM word_examples WHERE id = ?", [req.params.id]);
    res.json(row);
  })
);
router.post(
  "/words/:id/relations",
  wrap(async (req, res) => {
    const type = req.body?.type;
    const relatedId = clean(String(req.body?.relatedWordId ?? ""));
    if (!RELATION_TYPES.includes(type)) return res.status(400).json({ error: "Invalid relation type" });
    if (!relatedId) return res.status(400).json({ error: "Invalid relatedWordId" });
    const [word, related] = await Promise.all([findWordById(req.params.id), findWordById(relatedId)]);
    if (!word || !related) return res.status(404).json({ error: "Word not found" });
    if (word.id === related.id) return res.status(400).json({ error: "Invalid relatedWordId" });
    const [existing] = await pool.query(
      "SELECT 1 FROM word_relations WHERE relation_type = ? AND ((word_id = ? AND related_word_id = ?) OR (word_id = ? AND related_word_id = ?))",
      [type, word.id, related.id, related.id, word.id]
    );
    if (!existing.length) {
      await pool.query("INSERT INTO word_relations (word_id, related_word_id, relation_type) VALUES (?, ?, ?)", [
        word.id,
        related.id,
        type
      ]);
    }
    res.status(201).json({ type, id: related.id, ar: related.ar, vi: related.vi, slug: related.slug });
  })
);
export default router;
