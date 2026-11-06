import express, { Router } from "express";
import { TranscribeStreamingClient, StartStreamTranscriptionCommand } from "@aws-sdk/client-transcribe-streaming";
import { pool } from "../db.js";
import { speakableArabic } from "./tts.js";
import { scoreReading } from "../pronunciation.js";
import { createQuota, clientIp } from "../limits.js";
import { recordChallengeScore } from "./challenge.js";
const router = Router();
const LANGUAGE = process.env.TRANSCRIBE_LANGUAGE || "ar-SA";
const SAMPLE_RATE = 16e3;
const MAX_SECONDS = 15;
const MAX_BYTES = SAMPLE_RATE * 2 * MAX_SECONDS;
const chargeAttempt = createQuota({
  perIpPerHour: Number(process.env.PRONUNCIATION_PER_IP_PER_HOUR) || 30,
  dailyUnits: Number(process.env.PRONUNCIATION_DAILY_ATTEMPTS) || 500
});
const transcribe = new TranscribeStreamingClient({ region: process.env.AWS_REGION || "ap-southeast-1" });
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
async function* audioEvents(pcm) {
  const CHUNK = 3200;
  for (let i = 0; i < pcm.length; i += CHUNK) {
    yield { AudioEvent: { AudioChunk: pcm.subarray(i, i + CHUNK) } };
  }
}
async function transcribePcm(pcm) {
  const response = await transcribe.send(
    new StartStreamTranscriptionCommand({
      LanguageCode: LANGUAGE,
      MediaEncoding: "pcm",
      MediaSampleRateHertz: SAMPLE_RATE,
      AudioStream: audioEvents(pcm)
    })
  );
  const parts = [];
  for await (const event of response.TranscriptResultStream) {
    for (const result of event.TranscriptEvent?.Transcript?.Results ?? []) {
      if (!result.IsPartial) parts.push(result.Alternatives?.[0]?.Transcript ?? "");
    }
  }
  return parts.join(" ").trim();
}
async function findTarget(kind, id) {
  if (kind === "word") {
    const [[row]] = await pool.query("SELECT ar FROM dictionary WHERE id = ?", [id]);
    if (!row) return null;
    return speakableArabic(row.ar).split(/[،,]/).map((s) => s.trim()).filter(Boolean);
  }
  if (kind === "example") {
    const [[row]] = await pool.query("SELECT ar FROM word_examples WHERE id = ?", [id]);
    return row ? [row.ar.trim()] : null;
  }
  return null;
}
router.post(
  "/pronunciation/:kind/:id",
  express.raw({ type: "application/octet-stream", limit: MAX_BYTES }),
  wrap(async (req, res) => {
    const alternatives = await findTarget(req.params.kind, req.params.id);
    if (!alternatives?.length) return res.status(404).json({ error: "Nothing to read" });
    const pcm = req.body;
    if (!Buffer.isBuffer(pcm) || pcm.length < SAMPLE_RATE * 2 * 0.3) {
      return res.status(400).json({ error: "Recording is too short" });
    }
    try {
      chargeAttempt(clientIp(req));
    } catch (err) {
      return res.status(err.status).json({ error: err.message });
    }
    const transcript = await transcribePcm(pcm);
    const result = scoreReading(alternatives, transcript);
    let bestScore = null;
    if (req.user && req.params.kind === "word") {
      try {
        bestScore = await recordChallengeScore(req.user.id, req.params.id, result.score);
      } catch (err) {
        console.error("Could not save challenge score:", err);
      }
    }
    res.json({ ...result, bestScore });
  })
);
export default router;
