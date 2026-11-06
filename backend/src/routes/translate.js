import { Router } from "express";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";
import { createQuota, clientIp } from "../limits.js";
const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
export const MAX_CHARS = 4500;
const CACHE_SIZE = 1e3;
const ARABIC_RE = /[؀-ۿ]/;
const VIETNAMESE_RE = /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i;
const charge = createQuota({
  perIpPerHour: Number(process.env.TRANSLATE_PER_IP_PER_HOUR) || 60,
  dailyUnits: Number(process.env.TRANSLATE_DAILY_CHARS) || 1e5
});
const client = new TranslateClient({ region: process.env.AWS_REGION || "ap-southeast-1" });
const cache = new Map();
export function languagesFor(text) {
  if (ARABIC_RE.test(text)) return { source: "ar", target: "vi" };
  return { source: VIETNAMESE_RE.test(text) ? "vi" : "en", target: "ar" };
}
router.post(
  "/translate",
  wrap(async (req, res) => {
    const text = typeof req.body?.text === "string" ? req.body.text.replace(/\s+/g, " ").trim() : "";
    if (!text) return res.status(400).json({ error: "Không có nội dung để dịch" });
    if (text.length > MAX_CHARS) return res.status(400).json({ error: `Chỉ dịch được tối đa ${MAX_CHARS} ký tự` });
    const { source, target } = languagesFor(text);
    const cached = cache.get(text);
    if (cached) return res.json({ translation: cached, source, target });
    try {
      charge(clientIp(req), text.length);
    } catch (err) {
      return res.status(err.status).json({ error: "Đã hết lượt dịch, vui lòng thử lại sau" });
    }
    let translation;
    try {
      const result = await client.send(
        new TranslateTextCommand({ Text: text, SourceLanguageCode: source, TargetLanguageCode: target })
      );
      translation = result.TranslatedText;
    } catch (err) {
      console.error("Translate failed:", err.name, err.message);
      return res.status(503).json({ error: "Dịch tự động đang tạm ngừng" });
    }
    if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value);
    cache.set(text, translation);
    res.json({ translation, source, target });
  })
);
export default router;
