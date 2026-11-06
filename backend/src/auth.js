import crypto from "node:crypto";
import { promisify } from "node:util";
import { pool } from "./db.js";
const scrypt = promisify(crypto.scrypt);
const COOKIE = "avdict_session";
const SESSION_DAYS = 30;
const SECURE_COOKIE = process.env.NODE_ENV === "production";
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}
export async function verifyPassword(password, stored) {
  const [, salt, hash] = stored.split("$");
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(password, Buffer.from(salt, "base64"), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
function readCookie(req) {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE) return rest.join("=");
  }
  return null;
}
function cookieHeader(value, maxAgeSeconds) {
  const secure = SECURE_COOKIE ? "; Secure" : "";
  return `${COOKIE}=${value}; HttpOnly; Path=/api; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}
export async function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await pool.query("DELETE FROM sessions WHERE user_id = ? AND expires_at < ?", [userId, new Date()]);
  await pool.query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", [hashToken(token), userId, expires]);
  res.setHeader("Set-Cookie", cookieHeader(token, SESSION_DAYS * 86400));
}
export async function endSession(req, res) {
  const token = readCookie(req);
  if (token) await pool.query("DELETE FROM sessions WHERE token_hash = ?", [hashToken(token)]);
  res.setHeader("Set-Cookie", cookieHeader("", 0));
}
export async function attachUser(req, res, next) {
  try {
    const token = readCookie(req);
    if (token) {
      const [[user]] = await pool.query(
        `SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > ?`,
        [hashToken(token), new Date()]
      );
      if (user) req.user = user;
    }
    next();
  } catch (err) {
    next(err);
  }
}
export function noStore(req, res, next) {
  res.set("Cache-Control", "no-store");
  next();
}
export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Bạn cần đăng nhập" });
  next();
}
