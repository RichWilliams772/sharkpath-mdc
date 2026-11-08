import { NextResponse } from "next/server";
import { loadLocalAsr, rms, transcribeLocal } from "@/lib/asr";
import { pcmToWav, transcribe as transcribeGemini } from "@/lib/speech";
import type { LlmPref } from "@/lib/types";

// Body: raw 16 kHz mono 16-bit little-endian PCM captured in the browser (see lib/mic.ts).
// ?interim=1 marks a live preview while the student is still talking: local model only, never the Gemini quota.

const MAX_BYTES = 16000 * 2 * 30; // 30 seconds
const SILENCE_RMS = 0.004;

export async function GET() {
  // Warm-up: the page calls this on load so the first real transcription doesn't wait for the model.
  try {
    await loadLocalAsr();
    return NextResponse.json({ engine: "local", ready: true });
  } catch (e) {
    console.warn("local speech model unavailable —", (e as Error).message);
    return NextResponse.json({ engine: "gemini", ready: false });
  }
}

export async function POST(req: Request) {
  const interim = new URL(req.url).searchParams.get("interim") === "1";
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_BYTES) return NextResponse.json({ error: "Audio must be 0–30 seconds." }, { status: 400 });

  const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.length / 2));
  const audio = Float32Array.from(pcm, (v) => v / 32768);
  if (rms(audio) < SILENCE_RMS) return NextResponse.json({ text: "", engine: "silence" });

  const t = Date.now();
  try {
    const text = await transcribeLocal(audio);
    return NextResponse.json({ text, engine: "local", ms: Date.now() - t });
  } catch (e) {
    if (interim) return NextResponse.json({ text: "", engine: null });
    console.warn("local transcription failed, using Gemini —", (e as Error).message);
  }

  try {
    let llm: Partial<LlmPref> | undefined;
    try { llm = JSON.parse(decodeURIComponent(req.headers.get("x-llm") ?? "")); } catch {}
    const wav = pcmToWav(Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength), 16000).toString("base64");
    return NextResponse.json({ text: await transcribeGemini(wav, "audio/wav", llm), engine: "gemini", ms: Date.now() - t });
  } catch (e) {
    console.warn("transcribe failed —", (e as Error).message);
    return NextResponse.json({ error: "Couldn't transcribe that. Try again, or type below." }, { status: 503 });
  }
}
