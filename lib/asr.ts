import os from "node:os";
import path from "node:path";

// SharkPath's own ears: an open-source speech model (Moonshine by default) running inside this Node server.
// No account, no rate limits, works the same in every browser. ~0.75s to transcribe 9s of speech on a laptop CPU.
// Gemini transcription (lib/speech.ts) is only the fallback if the local model can't load.

const MODEL = process.env.LOCAL_ASR_MODEL || "onnx-community/moonshine-base-ONNX";

type Asr = (audio: Float32Array) => Promise<{ text: string } | { text: string }[]>;
// Kept on globalThis so dev-server hot reloads don't load the model twice.
const g = globalThis as unknown as { __sharkpathAsr?: Promise<Asr>; __sharkpathAsrQueue?: Promise<unknown> };

export function loadLocalAsr(): Promise<Asr> {
  g.__sharkpathAsr ??= (async () => {
    const { pipeline, env } = await import("@huggingface/transformers");
    env.cacheDir = process.env.MODEL_CACHE_DIR || path.join(os.homedir(), ".cache", "sharkpath-models");
    const t = Date.now();
    const asr = (await pipeline("automatic-speech-recognition", MODEL, { dtype: "q8" })) as unknown as Asr;
    console.log(`Local speech model ${MODEL} ready in ${Date.now() - t}ms`);
    return asr;
  })().catch((e) => {
    g.__sharkpathAsr = undefined; // allow a retry on the next request
    throw e;
  });
  return g.__sharkpathAsr;
}

/** Transcribe 16 kHz mono audio. Calls run one at a time so live previews can't pile up on the CPU. */
export async function transcribeLocal(audio: Float32Array): Promise<string> {
  const asr = await loadLocalAsr();
  const run = (g.__sharkpathAsrQueue ?? Promise.resolve()).then(async () => {
    const out = await asr(audio);
    return (Array.isArray(out) ? out[0]?.text : out.text)?.trim() ?? "";
  });
  g.__sharkpathAsrQueue = run.catch(() => undefined);
  return run;
}

/** Root-mean-square level of the clip; near-silent clips are skipped so the model can't hallucinate words. */
export function rms(audio: Float32Array) {
  let sum = 0;
  for (let i = 0; i < audio.length; i++) sum += audio[i] * audio[i];
  return Math.sqrt(sum / Math.max(1, audio.length));
}
