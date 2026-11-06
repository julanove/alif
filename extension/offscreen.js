let audio = null;
let respond = null;
function settle(result) {
  const reply = respond;
  respond = null;
  reply?.(result);
}
function stop() {
  if (audio) {
    audio.onended = audio.onerror = null;
    audio.pause();
    audio = null;
  }
  settle({ ok: true });
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target !== "avdict-offscreen") return;
  if (message.type === "stop") {
    stop();
    sendResponse({ ok: true });
    return;
  }
  if (message.type === "play") {
    stop();
    respond = sendResponse;
    audio = new Audio(message.url);
    audio.onended = () => settle({ ok: true });
    audio.onerror = () => settle({ ok: false });
    audio.play().catch(() => settle({ ok: false }));
    return true;
  }
});
