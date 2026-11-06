import { Router } from "express";
import crypto from "node:crypto";
import { pool } from "../db.js";
import { hashPassword, verifyPassword, startSession, endSession, noStore } from "../auth.js";
import { getStreak, countDueCards } from "../progress.js";
import { clientIp } from "../limits.js";
const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
router.use(noStore);
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 200;
const MAX_NAME = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WINDOW_MS = 15 * 60 * 1e3;
const MAX_FAILURES_PER_EMAIL = 8;
const MAX_FAILURES_PER_IP = 40;
const MAX_REGISTRATIONS_PER_IP = 20;
const counters = new Map();
function count(key) {
  const entry = counters.get(key);
  return entry && entry.until > Date.now() ? entry.n : 0;
}
function bump(key) {
  if (counters.size > 5e4) counters.clear();
  const n = count(key) + 1;
  const until = n === 1 ? Date.now() + WINDOW_MS : counters.get(key).until;
  counters.set(key, { n, until });
}
const TOO_MANY = "Bạn đã thử quá nhiều lần. Vui lòng đợi 15 phút rồi thử lại.";
const clean = (value) => typeof value === "string" ? value.trim() : "";
const publicUser = ({ id, email, name }) => ({ id, email, name });
async function buildMe(user) {
  const [streak, due] = await Promise.all([getStreak(user.id), countDueCards(user.id)]);
  const [cards] = await pool.query("SELECT word_id AS wordId FROM flashcards WHERE user_id = ?", [user.id]);
  return { user: publicUser(user), streak, due, savedWordIds: cards.map((c) => c.wordId) };
}
router.get(
  "/me",
  wrap(async (req, res) => {
    res.json(req.user ? await buildMe(req.user) : { user: null });
  })
);
router.post(
  "/register",
  wrap(async (req, res) => {
    const email = clean(req.body?.email).toLowerCase();
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const name = clean(req.body?.name).slice(0, MAX_NAME) || email.split("@")[0].slice(0, MAX_NAME);
    if (!EMAIL_RE.test(email) || email.length > 255) return res.status(400).json({ error: "Email không hợp lệ" });
    if (password.length < MIN_PASSWORD) return res.status(400).json({ error: `Mật khẩu cần ít nhất ${MIN_PASSWORD} ký tự` });
    if (password.length > MAX_PASSWORD) return res.status(400).json({ error: `Mật khẩu tối đa ${MAX_PASSWORD} ký tự` });
    const ipKey = `register:${clientIp(req)}`;
    if (count(ipKey) >= MAX_REGISTRATIONS_PER_IP) return res.status(429).json({ error: TOO_MANY });
    bump(ipKey);
    const user = { id: crypto.randomUUID(), email, name };
    try {
      await pool.query("INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)", [
        user.id,
        email,
        name,
        await hashPassword(password)
      ]);
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Email này đã được đăng ký" });
      throw err;
    }
    await startSession(res, user.id);
    res.status(201).json(await buildMe(user));
  })
);
router.post(
  "/login",
  wrap(async (req, res) => {
    const email = clean(req.body?.email).toLowerCase();
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const emailKey = `login:${email}`;
    const ipKey = `login-ip:${clientIp(req)}`;
    if (count(emailKey) >= MAX_FAILURES_PER_EMAIL || count(ipKey) >= MAX_FAILURES_PER_IP) {
      return res.status(429).json({ error: TOO_MANY });
    }
    const [[user]] = await pool.query("SELECT id, email, name, password_hash FROM users WHERE email = ?", [email]);
    const stored = user?.password_hash ?? await hashPassword("no-such-account");
    const ok = password.length > 0 && password.length <= MAX_PASSWORD && await verifyPassword(password, stored);
    if (!user || !ok) {
      bump(emailKey);
      bump(ipKey);
      return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
    }
    counters.delete(emailKey);
    await startSession(res, user.id);
    res.json(await buildMe(user));
  })
);
router.post(
  "/logout",
  wrap(async (req, res) => {
    await endSession(req, res);
    res.json({ ok: true });
  })
);
export default router;
