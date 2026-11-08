import type { GuideLine, LlmPref, Voice } from "./types";

// Server-side voice for Sonar & Tide, so it works in every browser (Brave on Linux ships no speech voices).
// Each Gemini model has its own free-tier quota, so walking a chain of models rides out rate limits.

const geminiKey = (pref?: Partial<LlmPref>) => (pref?.provider === "gemini" && pref.apiKey) || process.env.GEMINI_API_KEY;

const STT_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-flash-lite-latest"];
// 3.8 TTS models take per-part speaker metadata; the older ones take a "Speaker: text" transcript.
const TTS_MODELS: { model: string; format: "parts" | "transcript" }[] = [
  // The full model keeps the two voices furthest apart (Tide ~231 Hz vs Sonar ~110 Hz in testing); lite is ~0.7s faster.
  { model: "gemini-3.8-flash-tts", format: "parts" },
  { model: "gemini-3.8-flash-lite-tts", format: "parts" },
  { model: "gemini-3.1-flash-tts-preview", format: "transcript" },
  { model: "gemini-2.5-flash-preview-tts", format: "transcript" },
];
// Sonar: Charon (informative, lower). Tide: Sulafat (warm, clearly feminine; ~218 Hz vs Charon's ~154 Hz).
const VOICE_NAME: Record<Voice, string> = {
  sonar: process.env.SONAR_VOICE || "Charon",
  tide: process.env.TIDE_VOICE || "Sulafat",
};
const SPEAKER: Record<Voice, string> = { sonar: "Sonar", tide: "Tide" };

async function gemini(model: string, key: string, body: unknown, timeoutMs: number) {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
  });
}

export async function transcribe(audioBase64: string, mimeType: string, pref?: Partial<LlmPref>): Promise<string> {
  const key = geminiKey(pref);
  if (!key) throw new Error("No Gemini key for transcription");
  let last = "";
  for (const model of STT_MODELS) {
    const res = await gemini(model, key, {
      contents: [{
        role: "user",
        parts: [
          { inline_data: { mime_type: mimeType, data: audioBase64 } },
          { text: "Transcribe exactly what the speaker says. Return only the transcript text, nothing else. If there is no speech, return an empty string." },
        ],
      }],
    }, 15000).catch((e: Error) => e);
    if (res instanceof Error) { last = res.message; continue; }
    if (!res.ok) { last = `${model} ${res.status}`; continue; }
    const data = await res.json();
    return (data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "").trim();
  }
  throw new Error(`All transcription models failed (${last})`);
}

/** One audio clip of the whole reply, each line in its guide's own voice. Returns base64 WAV. */
export async function speak(lines: GuideLine[], pref?: Partial<LlmPref>): Promise<{ audio: string; mimeType: string; model: string }> {
  const key = geminiKey(pref);
  if (!key) throw new Error("No Gemini key for speech");
  const voices = [...new Set(lines.map((l) => l.voice))];
  // Multi-speaker mode needs two speakers; a one-voice reply uses a single voice config.
  const speechConfig = voices.length > 1
    ? { multiSpeakerVoiceConfig: { speakerVoiceConfigs: voices.map((v) => ({ speaker: SPEAKER[v], voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME[v] } } })) } }
    : { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME[voices[0]] } } };

  let last = "";
  for (const { model, format } of TTS_MODELS) {
    const parts = voices.length > 1 && format === "parts"
      ? lines.map((l) => ({ text: l.text, speechMetadata: { speaker: SPEAKER[l.voice] } }))
      : [{ text: voices.length > 1 ? lines.map((l) => `${SPEAKER[l.voice]}: ${l.text}`).join("\n") : lines.map((l) => l.text).join(" ") }];
    const res = await gemini(model, key, {
      contents: [{ parts }],
      generationConfig: { responseModalities: ["AUDIO"], speechConfig },
    }, 25000).catch((e: Error) => e);
    if (res instanceof Error) { last = res.message; continue; }
    if (!res.ok) { last = `${model} ${res.status}`; console.warn(`TTS ${model} returned ${res.status}`); continue; }
    const data = await res.json();
    const inline = data.candidates?.[0]?.content?.parts?.find((p: { inlineData?: unknown }) => p.inlineData)?.inlineData as { mimeType: string; data: string } | undefined;
    if (!inline) { last = `${model} returned no audio`; continue; }
    if (inline.mimeType.includes("wav")) return { audio: inline.data, mimeType: "audio/wav", model };
    // Raw 16-bit PCM ("audio/L16;rate=24000"): wrap it in a WAV header so browsers can play it.
    const rate = Number(/rate=(\d+)/i.exec(inline.mimeType)?.[1] ?? 24000);
    return { audio: pcmToWav(Buffer.from(inline.data, "base64"), rate).toString("base64"), mimeType: "audio/wav", model };
  }
  throw new Error(`All speech models failed (${last})`);
}

export function pcmToWav(pcm: Buffer, sampleRate: number) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(sampleRate, 24); h.writeUInt32LE(sampleRate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
