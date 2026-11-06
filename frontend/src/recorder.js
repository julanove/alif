const TARGET_RATE = 16e3;
export const recordingSupported = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof AudioContext !== "undefined";
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }
  });
  const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(4096, 1, 1);
  const chunks = [];
  processor.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  source.connect(processor);
  processor.connect(context.destination);
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    processor.disconnect();
    source.disconnect();
    stream.getTracks().forEach((t) => t.stop());
    context.close();
  }
  return {
    async stop() {
      const rate = context.sampleRate;
      close();
      return toPcm16(chunks, rate);
    },
    cancel: close
  };
}
function toPcm16(chunks, inputRate) {
  const length = chunks.reduce((n, c) => n + c.length, 0);
  const input = new Float32Array(length);
  let offset = 0;
  for (const c of chunks) {
    input.set(c, offset);
    offset += c.length;
  }
  const ratio = inputRate / TARGET_RATE;
  const output = new Int16Array(Math.floor(input.length / ratio));
  for (let i = 0; i < output.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), input.length);
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    const sample = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)));
    output[i] = sample < 0 ? sample * 32768 : sample * 32767;
  }
  return output.buffer;
}
let replay = null;
export async function playRecording(pcm) {
  replay?.stop();
  const samples = new Int16Array(pcm);
  const context = new AudioContext();
  const buffer = context.createBuffer(1, samples.length, TARGET_RATE);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) channel[i] = samples[i] / 32768;
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  await new Promise((resolve) => {
    const finish = () => {
      if (replay?.source === source) replay = null;
      context.close().catch(() => {
      });
      resolve();
    };
    source.onended = finish;
    replay = {
      source,
      stop() {
        source.onended = null;
        source.stop();
        finish();
      }
    };
    source.start();
  });
}
