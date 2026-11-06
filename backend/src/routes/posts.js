import { Router } from "express";
import crypto from "node:crypto";
import { pool } from "../db.js";
const router = Router();
const SELECT_COLUMNS = "id, word_id AS wordId, author, title, body, created_at AS createdAt";
router.get("/", async (req, res) => {
  const { wordId } = req.query;
  const [rows] = wordId !== void 0 ? await pool.query(`SELECT ${SELECT_COLUMNS} FROM posts WHERE word_id = ? ORDER BY created_at DESC`, [wordId]) : await pool.query(`SELECT ${SELECT_COLUMNS} FROM posts ORDER BY created_at DESC`);
  res.json(rows);
});
router.post("/", async (req, res) => {
  const { wordId, author, title, body } = req.body ?? {};
  if (!body || !String(body).trim()) {
    return res.status(400).json({ error: "body is required" });
  }
  const post = {
    id: crypto.randomUUID(),
    wordId: wordId ?? null,
    author: author && String(author).trim() ? String(author).trim() : "Ẩn danh",
    title: title && String(title).trim() ? String(title).trim() : null,
    body: String(body).trim(),
    createdAt: new Date()
  };
  await pool.query(
    "INSERT INTO posts (id, word_id, author, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [post.id, post.wordId, post.author, post.title, post.body, post.createdAt]
  );
  res.status(201).json(post);
});
export default router;
