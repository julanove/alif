const OFFSCREEN_URL = "offscreen.html";
const API_BASE = "https://your-api-domain.example/api/";
let creating = null;
async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  creating ??= chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ["AUDIO_PLAYBACK"],
    justification: "Play Arabic pronunciation audio"
  }).finally(() => {
    creating = null;
  });
  await creating;
}
async function translate(text) {
  const res = await fetch(`${API_BASE}translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  if (!res.ok) return { ok: false };
  const { translation, target } = await res.json();
  return { ok: true, translation, target };
}
async function handle(message) {
  if (message.type === "avdict:translate") return translate(message.text);
  if (message.type === "avdict:stop") {
    if (!await chrome.offscreen.hasDocument()) return { ok: true };
    return chrome.runtime.sendMessage({ target: "avdict-offscreen", type: "stop" });
  }
  if (!message.url?.startsWith(API_BASE)) return { ok: false };
  await ensureOffscreen();
  return chrome.runtime.sendMessage({ target: "avdict-offscreen", type: "play", url: message.url });
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!["avdict:play", "avdict:stop", "avdict:translate"].includes(message?.type)) return;
  handle(message).then(sendResponse, () => sendResponse({ ok: false }));
  return true;
});
