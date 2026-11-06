import { clientIp } from "./limits.js";
const PER_MINUTE = Number(process.env.READ_PER_IP_PER_MINUTE) || 240;
const PER_DAY = Number(process.env.READ_PER_IP_PER_DAY) || 6e3;
const PER_USER_MINUTE = Number(process.env.READ_PER_USER_PER_MINUTE) || 90;
const PER_USER_DAY = Number(process.env.READ_PER_USER_PER_DAY) || 2500;
const minute = new Map();
const day = new Map();
let minuteKey = -1;
let dayKey = "";
export function scrapeGuard(req, res, next) {
  if (req.method !== "GET") return next();
  const now = new Date();
  const m = Math.floor(now.getTime() / 6e4);
  const d = now.toISOString().slice(0, 10);
  if (m !== minuteKey) {
    minute.clear();
    minuteKey = m;
  }
  if (d !== dayKey) {
    day.clear();
    dayKey = d;
  }
  const who = req.user ? `user:${req.user.id}` : clientIp(req);
  const perMin = (minute.get(who) ?? 0) + 1;
  const perDay = (day.get(who) ?? 0) + 1;
  minute.set(who, perMin);
  day.set(who, perDay);
  const [minuteCap, dayCap] = req.user ? [PER_USER_MINUTE, PER_USER_DAY] : [PER_MINUTE, PER_DAY];
  if (perMin > minuteCap || perDay > dayCap) {
    console.warn(`rate-limited ${who} (${perMin}/min, ${perDay}/day) ${req.originalUrl}`);
    return res.status(429).json({ error: "Too many requests, try again later" });
  }
  next();
}
