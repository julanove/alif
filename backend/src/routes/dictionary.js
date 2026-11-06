import { Router } from "express";
import { pool } from "../db.js";
import { foldArabic, escapeLike, withoutArticle } from "../searchText.js";
const router = Router();
const ARABIC_DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
function normalize(text) {
  if (!text) return "";
  return text.toLowerCase().replace(ARABIC_DIACRITICS, "").trim();
}
function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / 864e5);
}
const MAX_RESULTS = 50;
const AS = "COLLATE utf8mb4_0900_as_ci";
const VI_MEANINGS = "CONCAT(', ', REPLACE(vi_normalized, '; ', ', '), ',')";
const AR_HEAD = "TRIM(REGEXP_SUBSTR(ar_folded, '^[^\\\\[(:،–]+'))";
function likeFor(term, mode) {
  const t = escapeLike(term);
  if (mode === "startsWith") return `${t}%`;
  if (mode === "endsWith") return `%${t}`;
  return `%${t}%`;
}
async function searchLike(q, stem, mode) {
  const e = escapeLike(q);
  const meaningLikes = [`%, ${e},%`, `%, ${e} (%`];
  const heads = stem ? [q, stem] : [q];
  const headSql = heads.map(() => `${AR_HEAD} = ?`).join(" OR ");
  const viMeaning = (collate) => `(${VI_MEANINGS} ${collate} LIKE ? OR ${VI_MEANINGS} ${collate} LIKE ?)`;
  const rank = `CASE
      WHEN ${headSql} OR ${viMeaning(AS)} THEN 0
      WHEN ${viMeaning("")} THEN 1
      WHEN ar_folded LIKE ? OR vi_normalized ${AS} LIKE ? THEN 2
      WHEN vi_normalized LIKE ? THEN 3
      ELSE 4 END`;
  const rankParams = [...heads, ...meaningLikes, ...meaningLikes, `${e}%`, `${e}%`, `${e}%`];
  const like = likeFor(q, mode);
  const where = ["ar_folded LIKE ?", "vi_normalized LIKE ?"];
  const whereParams = [like, like];
  if (stem) {
    where.push("ar_folded LIKE ?");
    whereParams.push(likeFor(stem, mode));
  }
  const [rows] = await pool.query(
    `SELECT id, ar, vi, context, slug, COUNT(*) OVER () AS total FROM dictionary
     WHERE ${where.join(" OR ")}
     ORDER BY ${rank}, vi_normalized IS NULL, CHAR_LENGTH(COALESCE(vi_normalized, ar_normalized)), CAST(id AS UNSIGNED)
     LIMIT ?`,
    [...whereParams, ...rankParams, MAX_RESULTS]
  );
  return { total: rows[0]?.total ?? 0, words: rows.map(({ total, ...word }) => word) };
}
const MEANING_SEPARATORS = ",;:،؛";
function cleanTerm(text) {
  return text.normalize("NFC").replace(/\s+/g, " ").trim();
}
function exactTerms(text) {
  if (!text) return new Set();
  const terms = new Set([cleanTerm(text)]);
  let depth = 0;
  let withNote = "";
  let bare = "";
  function endMeaning() {
    terms.add(cleanTerm(withNote));
    terms.add(cleanTerm(bare));
    withNote = "";
    bare = "";
  }
  for (const ch of text) {
    if (depth === 0 && MEANING_SEPARATORS.includes(ch)) {
      endMeaning();
      continue;
    }
    withNote += ch;
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth = Math.max(0, depth - 1);
    else if (depth === 0) bare += ch;
  }
  endMeaning();
  terms.delete("");
  return terms;
}
async function searchExact(q) {
  const term = cleanTerm(q);
  const like = `%${escapeLike(term)}%`;
  const [rows] = await pool.query(
    `SELECT id, ar, vi, context, slug, ar_folded, vi_normalized FROM dictionary
     WHERE ar_folded ${AS} LIKE ? OR vi_normalized ${AS} LIKE ?`,
    [like, like]
  );
  const matches = rows.filter((r) => exactTerms(r.ar_folded).has(term) || exactTerms(r.vi_normalized).has(term)).sort((a, b) => (a.vi_normalized ?? a.ar_folded).length - (b.vi_normalized ?? b.ar_folded).length);
  return {
    total: matches.length,
    words: matches.slice(0, MAX_RESULTS).map(({ ar_folded, vi_normalized, ...word }) => word)
  };
}
router.get("/search", async (req, res, next) => {
  try {
    const q = foldArabic(normalize(String(req.query.q ?? "")));
    if (!q) return res.json([]);
    const { total, words } = req.query.mode === "exact" ? await searchExact(q) : await searchLike(q, withoutArticle(q), req.query.mode);
    res.set("X-Total-Count", String(total));
    res.json(words);
  } catch (err) {
    next(err);
  }
});
router.get("/word-of-day", async (req, res) => {
  const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM dictionary WHERE vi IS NOT NULL");
  const index = dayOfYear( new Date()) % total;
  const [rows] = await pool.query(
    "SELECT id, ar, vi, context, slug FROM dictionary WHERE vi IS NOT NULL LIMIT 1 OFFSET ?",
    [index]
  );
  res.json(rows[0] ?? null);
});
export default router;
