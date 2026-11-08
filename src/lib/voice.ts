"use client";

// Voice for Finn using the browser's built-in Web Speech API:
//   - speech → text: SpeechRecognition (Chrome, Edge, Safari)
//   - text → speech: speechSynthesis (all modern browsers)
// No keys or backend needed. To upgrade to a premium voice (e.g. Gemini Live or a
// TTS API), swap the bodies of `listen` / `speak` and keep the hook shapes.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { callEndpoint, EndpointMissing, ENDPOINTS } from "@/lib/api/endpoints";

// Minimal typings — SpeechRecognition isn't in TypeScript's DOM lib yet.
interface RecognitionResultList {
  length: number;
  [i: number]: { isFinal: boolean; 0: { transcript: string } };
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: RecognitionResultList }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noopSubscribe = () => () => {};

export type VoiceError = "blocked" | "network" | "no-speech" | "other";

/** Speech → text. `listen()` resolves with what was said (empty if nothing). */
export function useSpeechInput(locale: "en" | "es") {
  const supported = useSyncExternalStore(noopSubscribe, () => recognitionCtor() !== null, () => false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<VoiceError | null>(null);
  const rec = useRef<Recognition | null>(null);

  const listen = useCallback(
    () =>
      new Promise<string>((resolve) => {
        const Ctor = recognitionCtor();
        if (!Ctor) return resolve("");
        rec.current?.abort();
        const r = new Ctor();
        r.lang = locale === "es" ? "es-US" : "en-US";
        r.interimResults = true;
        r.continuous = false;
        r.maxAlternatives = 1;
        let finalText = "";
        r.onresult = (e) => {
          let partial = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const res = e.results[i];
            if (res.isFinal) finalText += res[0].transcript;
            else partial += res[0].transcript;
          }
          setInterim((finalText + partial).trim());
        };
        r.onerror = (e) => {
          setError(
            e.error === "not-allowed" || e.error === "service-not-allowed"
              ? "blocked"
              : e.error === "network"
                ? "network"
                : e.error === "no-speech"
                  ? "no-speech"
                  : e.error === "aborted"
                    ? null
                    : "other",
          );
        };
        r.onend = () => {
          if (rec.current === r) rec.current = null;
          setListening(false);
          setInterim("");
          resolve(finalText.trim());
        };
        setError(null);
        setInterim("");
        setListening(true);
        rec.current = r;
        try {
          r.start();
        } catch {
          setListening(false);
          resolve("");
        }
      }),
    [locale],
  );

  /** Finish now and keep what was heard. */
  const stop = useCallback(() => rec.current?.stop(), []);
  /** Stop and throw away what was heard. */
  const cancel = useCallback(() => rec.current?.abort(), []);

  useEffect(() => () => rec.current?.abort(), []);

  return { supported, listening, interim, error, listen, stop, cancel };
}

/** Clean chat text so it reads naturally out loud (no links, symbols or clipped abbreviations). */
export function cleanForSpeech(text: string, locale: "en" | "es" = "en"): string {
  const es = locale === "es";
  return text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\[\d+\]/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[*_#`>|]/g, "")
    .replace(/\b([A-Z])\.([A-Z])\.(?:([A-Z])\.)?/g, (_, a, b, c) => [a, b, c].filter(Boolean).join(" ")) // A.S. → A S
    .replace(/\/\s?(yr|year)\b/gi, es ? " al año" : " a year")
    .replace(/\/\s?(mo|month)\b/gi, es ? " al mes" : " a month")
    .replace(/\bhrs?\/week\b/gi, es ? "horas a la semana" : "hours a week")
    .replace(/\bhrs\b/gi, es ? "horas" : "hours")
    .replace(/\bcr\b/g, es ? "créditos" : "credits")
    .replace(/\s*→\s*/g, es ? " y luego " : " then ")
    .replace(/\s*·\s*/g, ", ")
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .trim();
}

/**
 * Split into a few natural-length chunks: whole sentences joined up to ~220 chars.
 * Fewer, longer utterances = fewer pauses (and stays under Chrome's long-utterance cutoff).
 */
export function toSpeakable(text: string, locale: "en" | "es" = "en"): string[] {
  const clean = cleanForSpeech(text, locale);
  if (!clean) return [];
  const sentences = (clean.match(/[^.!?]+[.!?]*/g) ?? [clean]).map((s) => s.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    const pieces = s.length <= 220 ? [s] : (s.match(/.{1,220}(,|\s|$)/g) ?? [s]).map((x) => x.trim());
    for (const p of pieces) {
      if (current && current.length + p.length + 1 > 220) {
        chunks.push(current);
        current = p;
      } else current = current ? `${current} ${p}` : p;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

// Novelty / robotic system voices we never want for Finn.
const ROBOTIC = /Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Fred|Good News|Jester|Junior|Kathy|Organ|Princess|Ralph|Superstar|Trinoids|Whisper|Wobble|Zarvox|eSpeak/i;
const GOOD_NAMES = /Samantha|Ava|Allison|Zoe|Evan|Nathan|Aria|Jenny|Guy|Michelle|Paulina|Mónica|Monica|Jorge|Juan|Sabina|Elvira|Dalia/i;

/** Score every installed voice and pick the most natural one for the language. */
function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const base = lang.slice(0, 2);
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;
  for (const v of window.speechSynthesis.getVoices()) {
    const vLang = v.lang.replace("_", "-");
    if (!vLang.startsWith(base)) continue;
    let score = vLang === lang ? 3 : 1;
    if (/Natural|Neural/i.test(v.name)) score += 12; // Edge / Windows online voices
    if (/Premium/i.test(v.name)) score += 10; // macOS / iOS downloaded voices
    if (/Enhanced/i.test(v.name)) score += 9;
    if (/Google/i.test(v.name)) score += 7; // Chrome's network voices
    if (GOOD_NAMES.test(v.name)) score += 4;
    if (!v.localService) score += 1;
    if (ROBOTIC.test(v.name)) score -= 30;
    if (score > bestScore) {
      best = v;
      bestScore = score;
    }
  }
  return best;
}

// /api/tts: a natural AI voice once the AI/Backend team ships it. We stop trying
// after the first "missing" so there's no delay on later replies.
let ttsEndpointMissing = false;
async function fetchAiVoice(text: string, locale: "en" | "es"): Promise<Blob | null> {
  if (ttsEndpointMissing) return null;
  try {
    const res = await callEndpoint(ENDPOINTS.tts, { method: "POST", body: JSON.stringify({ text, locale }) });
    const blob = await res.blob();
    return blob.type.startsWith("audio/") ? blob : null;
  } catch (err) {
    if (err instanceof EndpointMissing) ttsEndpointMissing = true;
    return null;
  }
}

/** Text → speech. `speak()` resolves when Finn finishes (or is interrupted). */
export function useSpeechOutput(locale: "en" | "es") {
  const supported = useSyncExternalStore(noopSubscribe, () => typeof window !== "undefined" && "speechSynthesis" in window, () => false);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const run = useRef(0);

  // Voices load asynchronously in Chrome — ask once so they're ready.
  useEffect(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
  }, []);

  const audio = useRef<HTMLAudioElement | null>(null);

  /** Built-in browser voice, read in a few natural-length chunks. */
  const speakWithBrowser = useCallback(
    (text: string, mine: number) =>
      new Promise<void>((resolve) => {
        if (!("speechSynthesis" in window)) return resolve();
        const synth = window.speechSynthesis;
        synth.cancel();
        const chunks = toSpeakable(text, locale);
        if (!chunks.length) return resolve();
        const lang = locale === "es" ? "es-US" : "en-US";
        const voice = pickVoice(lang);
        let i = 0;
        const next = () => {
          if (mine !== run.current || i >= chunks.length) return resolve();
          const u = new SpeechSynthesisUtterance(chunks[i++]);
          u.lang = lang;
          if (voice) u.voice = voice;
          u.rate = 1;
          u.pitch = 1;
          u.onend = next;
          u.onerror = next;
          synth.speak(u);
        };
        next();
      }),
    [locale],
  );

  const speak = useCallback(
    async (text: string, id = "reply") => {
      const mine = ++run.current;
      audio.current?.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      if (!cleanForSpeech(text, locale)) return;
      setSpeaking(id);
      // Natural AI voice when /api/tts is live; otherwise the best browser voice.
      const clip = await fetchAiVoice(cleanForSpeech(text, locale), locale);
      if (mine !== run.current) return;
      if (clip) {
        await new Promise<void>((resolve) => {
          const a = new Audio(URL.createObjectURL(clip));
          audio.current = a;
          a.onended = a.onerror = a.onpause = () => {
            URL.revokeObjectURL(a.src);
            resolve();
          };
          a.play().catch(() => resolve());
        });
      } else {
        await speakWithBrowser(text, mine);
      }
      if (mine === run.current) setSpeaking(null);
    },
    [locale, speakWithBrowser],
  );

  const stop = useCallback(() => {
    run.current++;
    audio.current?.pause();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(null);
  }, []);

  useEffect(
    () => () => {
      run.current++;
      audio.current?.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );

  return { supported, speaking, speak, stop };
}
