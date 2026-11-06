import { Router } from "express";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import { pool } from "../db.js";
import { createQuota, clientIp } from "../limits.js";
const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = process.env.TTS_CACHE_DIR || path.join(__dirname, "..", "..", "cache", "tts");
const VOICE = process.env.POLLY_VOICE || "Hala";
const ENGINE = process.env.POLLY_ENGINE || "neural";
const FALLBACK = { voice: "Zeina", engine: "standard" };
const polly = new PollyClient({ region: process.env.AWS_REGION || "ap-southeast-1" });
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
export function speakableArabic(text) {
  return text.replace(/\[[^\]]*\]/g, "").replace(/\([^)]*\)/g, "").split(/[:–-]/)[0].replace(/[A-Za-z]/g, "").replace(/\s+/g, " ").trim();
}
const escapeXml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
async function synthesize(text, { voice, engine }) {
  const { AudioStream } = await polly.send(
    new SynthesizeSpeechCommand({
      OutputFormat: "mp3",
      TextType: "ssml",
      Text: `<speak><prosody rate="90%">${escapeXml(text)}</prosody></speak>`,
      VoiceId: voice,
      Engine: engine
    })
  );
  return Buffer.from(await AudioStream.transformToByteArray());
}
const inFlight = new Map();
async function getAudio(text, beforeSynthesize) {
  const key = crypto.createHash("sha256").update(`${VOICE}|${ENGINE}|${text}`).digest("hex");
  const file = path.join(CACHE_DIR, `${key}.mp3`);
  try {
    return await fs.readFile(file);
  } catch {
  }
  if (!inFlight.has(key)) {
    beforeSynthesize?.(text);
    const job = (async () => {
      let audio;
      try {
        audio = await synthesize(text, { voice: VOICE, engine: ENGINE });
      } catch (err) {
        if (err.name !== "ValidationException") throw err;
        audio = await synthesize(text, FALLBACK);
      }
      await fs.mkdir(CACHE_DIR, { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      await fs.writeFile(tmp, audio);
      await fs.rename(tmp, file);
      return audio;
    })().finally(() => inFlight.delete(key));
    inFlight.set(key, job);
  }
  return inFlight.get(key);
}
async function sendAudio(res, text, beforeSynthesize) {
  if (!text) return res.status(404).json({ error: "Nothing to read" });
  let audio;
  try {
    audio = await getAudio(text, beforeSynthesize);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  }
  res.set({
    "Content-Type": "audio/mpeg",
    "Cache-Control": "public, max-age=31536000, immutable"
  });
  res.send(audio);
}
router.get(
  "/tts/word/:id",
  wrap(async (req, res) => {
    const [[word]] = await pool.query("SELECT ar FROM dictionary WHERE id = ?", [req.params.id]);
    if (!word) return res.status(404).json({ error: "Word not found" });
    await sendAudio(res, speakableArabic(word.ar));
  })
);
router.get(
  "/tts/example/:id",
  wrap(async (req, res) => {
    const [[example]] = await pool.query("SELECT ar FROM word_examples WHERE id = ?", [req.params.id]);
    if (!example) return res.status(404).json({ error: "Example not found" });
    await sendAudio(res, example.ar.trim());
  })
);
const MAX_FREE_TEXT = 200;
const FREE_TEXT_PER_IP_PER_HOUR = Number(process.env.TTS_FREE_TEXT_PER_IP_PER_HOUR) || 60;
const FREE_TEXT_DAILY_CHARS = Number(process.env.TTS_FREE_TEXT_DAILY_CHARS) || 1e5;
const ARABIC_RE = /[؀-ۿ]/;
const chargeFreeText = createQuota({
  perIpPerHour: FREE_TEXT_PER_IP_PER_HOUR,
  dailyUnits: FREE_TEXT_DAILY_CHARS
});
router.get(
  "/tts/text/:text",
  wrap(async (req, res) => {
    const text = req.params.text.replace(/[A-Za-z]/g, "").replace(/\s+/g, " ").trim();
    if (!ARABIC_RE.test(text)) return res.status(400).json({ error: "Only Arabic text can be read" });
    if (text.length > MAX_FREE_TEXT) return res.status(400).json({ error: `Text is limited to ${MAX_FREE_TEXT} characters` });
    const ip = clientIp(req);
    await sendAudio(res, text, (t) => chargeFreeText(ip, t.length));
  })
);
export default router;
