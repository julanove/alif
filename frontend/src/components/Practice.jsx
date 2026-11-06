import { useEffect, useRef, useState } from "react";
import { VOICE_ENABLED } from "../features.js";
import { checkPronunciation, ttsUrl } from "../api/client.js";
import { recordingSupported, startRecording, playRecording } from "../recorder.js";
import { stopPlayback } from "../speech.js";
import Mascot from "./Mascot.jsx";
import SpeakButton from "./SpeakButton.jsx";
const MAX_SECONDS = 12;
let activeCancel = null;
export function usePractice(kind, id) {
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState(null);
  const recorder = useRef(null);
  const cancelHandle = useRef(null);
  if (!cancelHandle.current) {
    cancelHandle.current = () => {
      recorder.current?.cancel();
      recorder.current = null;
      setStatus("idle");
    };
  }
  async function start() {
    activeCancel?.();
    stopPlayback();
    setResult(null);
    setError(null);
    try {
      recorder.current = await startRecording();
    } catch {
      setError("Không truy cập được micro. Hãy cho phép trình duyệt dùng micro rồi thử lại.");
      setStatus("error");
      return;
    }
    activeCancel = cancelHandle.current;
    setSeconds(0);
    setStatus("recording");
  }
  async function stop() {
    const rec = recorder.current;
    if (!rec) return;
    recorder.current = null;
    if (activeCancel === cancelHandle.current) activeCancel = null;
    setStatus("checking");
    try {
      const pcm = await rec.stop();
      setRecording(pcm);
      setResult(await checkPronunciation(kind, id, pcm));
      setStatus("done");
    } catch (e) {
      setError(e.message === "Recording is too short" ? "Bản ghi quá ngắn, hãy đọc lại." : `Không kiểm tra được (${e.message}).`);
      setStatus("error");
    }
  }
  useEffect(() => {
    if (status !== "recording") return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1e3);
    return () => clearInterval(timer);
  }, [status]);
  useEffect(() => {
    if (status === "recording" && seconds >= MAX_SECONDS) stop();
  });
  useEffect(
    () => () => {
      recorder.current?.cancel();
      if (activeCancel === cancelHandle.current) activeCancel = null;
    },
    []
  );
  return { kind, id, status, result, error, seconds, recording, start, stop, dismiss: () => setStatus("idle") };
}
const MIC_ICON = <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4M8.5 21h7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
export function PracticeButton({ practice, size = "md" }) {
  if (!VOICE_ENABLED || !recordingSupported) return null;
  const { status, seconds, start, stop } = practice;
  const recording = status === "recording";
  const checking = status === "checking";
  const title = recording ? "Dừng ghi âm và kiểm tra" : checking ? "Đang kiểm tra..." : "Luyện đọc: ghi âm giọng bạn";
  return <button
    type="button"
    className={`speak-btn practice-btn speak-btn--${size} ${recording ? "practice-btn--recording" : ""}`}
    onClick={recording ? stop : start}
    disabled={checking}
    title={title}
    aria-label={title}
  >{checking ? <span className="practice-btn__spinner" aria-hidden="true" /> : MIC_ICON}{recording && <span className="practice-btn__timer">{seconds}s</span>}</button>;
}
const PLAY_ICON = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>;
function ReplayButton({ recording }) {
  const [playing, setPlaying] = useState(false);
  function replay() {
    setPlaying(true);
    playRecording(recording).finally(() => setPlaying(false));
  }
  return <span className="practice-result__compare-item"><button
    type="button"
    className={`speak-btn speak-btn--md practice-replay ${playing ? "speak-btn--playing" : ""}`}
    onClick={replay}
    aria-label="Nghe lại giọng của bạn"
    title="Nghe lại giọng của bạn"
  >{PLAY_ICON}</button>
      Giọng của bạn
    </span>;
}
const VERDICTS = {
  correct: { label: "Chính xác!", mascot: "partyPopper" },
  close: { label: "Gần đúng", mascot: "ok" },
  wrong: { label: "Chưa đúng", mascot: "sad" }
};
export function PracticeResult({ practice }) {
  const { kind, id, status, result, error, recording, start, dismiss } = practice;
  if (status === "recording") {
    return <p className="practice-hint">🎙️ Đang ghi âm… đọc to rồi bấm nút micro lần nữa để kiểm tra.</p>;
  }
  if (status === "error") {
    return <div className="practice-result practice-result--wrong" role="status"><div className="practice-result__verdict-row"><Mascot name="question" className="practice-result__mascot" /><p>{error}</p></div><button type="button" className="practice-result__dismiss" onClick={dismiss}>
          Đóng
        </button></div>;
  }
  if (status !== "done" || !result) return null;
  const verdict = VERDICTS[result.verdict];
  return <div className={`practice-result practice-result--${result.verdict}`} role="status"><div className="practice-result__head"><span className="practice-result__verdict-row"><Mascot name={verdict.mascot} className="practice-result__mascot" /><span className="practice-result__verdict">{verdict.label}</span></span><span className="practice-result__score">{result.score}%</span></div><div className="practice-result__words" dir="rtl">{result.words.map((w, i) => <span key={i} className={w.matched ? "practice-word--ok" : "practice-word--miss"}>{w.text}</span>)}</div><p className="practice-result__heard">
        Hệ thống nghe được:{" "}{result.transcript ? <span dir="rtl">{result.transcript}</span> : <em>(không nghe rõ, hãy đọc to và rõ hơn)</em>}</p><div className="practice-result__compare"><span className="practice-result__compare-item"><SpeakButton src={ttsUrl(kind, id)} />
          Giọng mẫu
        </span>{recording && <ReplayButton recording={recording} />}</div><div className="practice-result__actions"><button type="button" onClick={start}>
          Thử lại
        </button><button type="button" className="practice-result__dismiss" onClick={dismiss}>
          Đóng
        </button></div></div>;
}
