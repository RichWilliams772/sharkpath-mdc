"use client";

// Hands-free voice capture that works the same in every browser (Brave's built-in speech recognition doesn't).
// Captures raw microphone audio, detects when the student starts and stops talking, streams live
// previews to /api/transcribe while they speak, and returns the final transcript after a short pause.

const TARGET_RATE = 16000; // what the speech model expects
const SILENCE_MS = 1100; // pause length that ends the turn
const NO_SPEECH_MS = 7000; // give up if nobody talks
const MAX_MS = 15000; // longest single turn
const PREVIEW_EVERY_MS = 900;

// Batches ~2048 frames per message so the main thread isn't flooded.
const WORKLET = `class Tap extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(2048); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) for (let i = 0; i < ch.length; i++) {
      this.buf[this.n++] = ch[i];
      if (this.n === this.buf.length) { this.port.postMessage(this.buf.slice(0)); this.n = 0; }
    }
    return true;
  }
}
registerProcessor("sharkpath-tap", Tap);`;

export type Listening = {
  /** Resolves with the final transcript ("" if nothing was said). */
  result: Promise<string>;
  /** End the turn now and transcribe what was said so far. */
  stop(): void;
  /** Abandon the turn without transcribing. */
  cancel(): void;
};

type Callbacks = {
  onLevel?: (level: number) => void; // 0..1, for the orb
  onSpeech?: () => void; // first time speech is detected
  onPreview?: (text: string) => void; // live words while talking
  onTranscribing?: () => void; // turn ended, final transcript in flight
  llm?: unknown; // the student's model preference, for the server's fallback transcriber
};

export async function listen(cb: Callbacks = {}): Promise<Listening> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const ctx = new AudioContext();
  const url = URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" }));
  await ctx.audioWorklet.addModule(url);
  URL.revokeObjectURL(url);
  const node = new AudioWorkletNode(ctx, "sharkpath-tap");
  ctx.createMediaStreamSource(stream).connect(node);

  const chunks: Float32Array[] = [];
  let finished = false, heard = false, lastVoice = 0, floor = 0.01;
  // The live preview in flight, and when its audio snapshot was taken.
  let preview: { at: number; result: Promise<{ text: string }> } | null = null;
  const started = performance.now();
  let resolve!: (t: string) => void, reject!: (e: unknown) => void;
  const result = new Promise<string>((res, rej) => { resolve = res; reject = rej; });

  const teardown = () => {
    clearInterval(previewTimer);
    clearTimeout(maxTimer);
    node.port.onmessage = null;
    stream.getTracks().forEach((t) => t.stop());
    ctx.close().catch(() => {});
  };

  const finish = async (send: boolean) => {
    if (finished) return;
    finished = true;
    teardown();
    if (!send || !heard) return resolve("");
    cb.onTranscribing?.();
    try {
      // A preview taken after the student stopped talking already holds everything they said: reuse it
      // instead of transcribing the same audio twice (that queueing was most of the wait).
      if (preview && preview.at > lastVoice + 150) {
        const { text } = await preview.result.catch(() => ({ text: "" }));
        if (text) return resolve(text);
      }
      const { text } = await transcribe(snapshot(), false, cb.llm);
      resolve(text);
    } catch (e) {
      reject(e);
    }
  };

  node.port.onmessage = (e: MessageEvent<Float32Array>) => {
    if (finished) return;
    const chunk = e.data;
    chunks.push(chunk);
    let sum = 0;
    for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i];
    const level = Math.sqrt(sum / chunk.length);
    const now = performance.now();
    // Adaptive threshold: track the room's noise floor, call it speech when clearly above it.
    if (!heard) floor = floor * 0.95 + level * 0.05;
    const threshold = Math.max(0.015, floor * 2.5);
    cb.onLevel?.(Math.min(1, level / 0.15));
    if (level > threshold) {
      if (!heard) cb.onSpeech?.();
      heard = true;
      lastVoice = now;
    }
    if (heard && now - lastVoice > SILENCE_MS) finish(true);
    else if (!heard && now - started > NO_SPEECH_MS) finish(false);
  };

  // Live preview: re-transcribe the whole turn so far, at most one request in flight.
  const previewTimer = setInterval(async () => {
    if (!heard || finished || preview) return;
    const current = { at: performance.now(), result: transcribe(snapshot(), true, cb.llm) };
    preview = current;
    try {
      const { text } = await current.result;
      if (!finished && text) cb.onPreview?.(text);
    } catch {
      /* previews are best-effort */
    } finally {
      if (preview === current && !finished) preview = null;
    }
  }, PREVIEW_EVERY_MS);
  const maxTimer = setTimeout(() => finish(true), MAX_MS);

  /** All audio so far, resampled to 16 kHz 16-bit PCM. */
  function snapshot(): Int16Array {
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const ratio = ctx.sampleRate / TARGET_RATE;
    const out = new Int16Array(Math.floor(total / ratio));
    // Average over each output sample's window: a cheap low-pass that avoids aliasing.
    let ci = 0, ofs = 0;
    const next = () => {
      while (ci < chunks.length && ofs >= chunks[ci].length) { ci++; ofs = 0; }
      return ci < chunks.length ? chunks[ci][ofs++] : 0;
    };
    let carry = 0;
    for (let i = 0; i < out.length; i++) {
      const end = (i + 1) * ratio;
      let acc = 0, n = 0;
      while (carry < end) { acc += next(); n++; carry++; }
      const v = Math.max(-1, Math.min(1, n ? acc / n : 0));
      out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
    return out;
  }

  return { result, stop: () => finish(true), cancel: () => finish(false) };
}

async function transcribe(pcm: Int16Array, interim: boolean, llm: unknown): Promise<{ text: string }> {
  const res = await fetch(`/api/transcribe${interim ? "?interim=1" : ""}`, {
    method: "POST",
    headers: { "content-type": "application/octet-stream", ...(llm ? { "x-llm": encodeURIComponent(JSON.stringify(llm)) } : {}) },
    body: pcm.buffer as ArrayBuffer,
  });
  const out = await res.json();
  if (!res.ok) throw new Error(out.error ?? "Transcription failed");
  return { text: (out.text ?? "").trim() };
}

/** Load the speech model in the background so the first tap is fast. */
export function warmUpEars() {
  fetch("/api/transcribe").catch(() => {});
}
