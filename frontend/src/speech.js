const synth = typeof window !== "undefined" ? window.speechSynthesis : void 0;
function arabicVoice() {
  const voices = synth?.getVoices() ?? [];
  return voices.find((v) => v.lang.toLowerCase().startsWith("ar")) ?? null;
}
export function speakableArabic(text) {
  return text.replace(/\[[^\]]*\]/g, "").replace(/\([^)]*\)/g, "").split(/[:–-]/)[0].replace(/[A-Za-z]/g, "").replace(/\s+/g, " ").trim();
}
function speakInBrowser(text, voice, onEnd) {
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice.lang;
  utterance.voice = voice;
  utterance.rate = 0.85;
  utterance.onend = () => onEnd(true);
  utterance.onerror = () => onEnd(true);
  synth.speak(utterance);
}
let current = null;
export function stopPlayback() {
  current?.stop();
}
export function play({ src, text }, onEnd) {
  stopPlayback();
  let done = false;
  let failed = false;
  const audio = new Audio(src);
  const finish = (ok) => {
    if (done) return;
    done = true;
    if (current === handle) current = null;
    onEnd(ok);
  };
  const fail = () => {
    if (failed || done) return;
    failed = true;
    const voice = arabicVoice();
    if (text && voice) speakInBrowser(text, voice, finish);
    else finish(false);
  };
  const handle = {
    stop() {
      audio.pause();
      if (failed) synth?.cancel();
      finish(true);
    }
  };
  current = handle;
  audio.addEventListener("ended", () => finish(true));
  audio.addEventListener("error", fail);
  audio.play().catch(fail);
}
