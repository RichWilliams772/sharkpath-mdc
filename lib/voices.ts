"use client";

import type { GuideLine, Voice } from "./types";

// Browser speech: no keys, works offline in Chrome/Edge/Safari.
// Sonar and Tide get two different system voices where available, plus different pitch/rate,
// so it sounds like two people even when the OS only ships one English voice.

const STYLE: Record<Voice, { pitch: number; rate: number }> = {
  sonar: { pitch: 0.85, rate: 1.04 },
  tide: { pitch: 1.12, rate: 0.94 },
};

function pickVoices(): Record<Voice, SpeechSynthesisVoice | undefined> {
  const en = speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
  const byName = (re: RegExp) => en.find((v) => re.test(v.name));
  const sonar = byName(/daniel|guy|david|alex|male|fred/i) ?? en[0];
  const tide = byName(/samantha|aria|jenny|zira|karen|female|moira|google us english/i) ?? en.find((v) => v !== sonar) ?? en[0];
  return { sonar, tide };
}

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopSpeaking() {
  if (canSpeak()) speechSynthesis.cancel();
}

let current: HTMLAudioElement | null = null;
let playToken = 0;

/** Stop whatever the guides are saying (server audio or browser speech). */
export function stopVoice() {
  playToken++;
  current?.pause();
  current = null;
  stopSpeaking();
}

/**
 * Speak a guide reply. Prefers server-generated two-voice audio (works in every browser);
 * falls back to the browser's own voices. onLine(i) highlights the line being spoken, -1 when done.
 * Resolves false if no voice was available at all.
 */
export async function playReply(lines: GuideLine[], llm: unknown, onLine: (i: number) => void): Promise<boolean> {
  stopVoice();
  const token = playToken;
  try {
    const res = await fetch("/api/speak", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lines, llm }) });
    if (!res.ok) throw new Error(String(res.status));
    const { audio, mimeType } = await res.json();
    if (token !== playToken) return true; // interrupted while generating
    const el = new Audio(`data:${mimeType};base64,${audio}`);
    current = el;
    // One clip for all lines: approximate each line's slot by its share of the text.
    const total = lines.reduce((n, l) => n + l.text.length, 0) || 1;
    const ends = lines.reduce<number[]>((acc, l) => [...acc, (acc.at(-1) ?? 0) + l.text.length / total], []);
    let shown = -2;
    el.ontimeupdate = () => {
      if (!el.duration) return;
      const i = ends.findIndex((e) => el.currentTime / el.duration <= e);
      if (i !== shown) onLine((shown = i));
    };
    el.onended = () => { if (current === el) current = null; onLine(-1); };
    await el.play();
    onLine(0);
    return true;
  } catch (e) {
    if (token !== playToken) return true;
    console.warn("Server voice unavailable, trying browser speech", e);
    if (canSpeak() && speechSynthesis.getVoices().length) {
      speakLines(lines, onLine);
      return true;
    }
    onLine(-1);
    return false;
  }
}

/** Browser speech fallback: speak lines in order; onLine fires as each one starts (index), and -1 when done. */
export function speakLines(lines: GuideLine[], onLine: (i: number) => void) {
  if (!canSpeak()) return onLine(-1);
  speechSynthesis.cancel();
  const voices = pickVoices();
  lines.forEach((line, i) => {
    const u = new SpeechSynthesisUtterance(line.text);
    const v = voices[line.voice];
    if (v) u.voice = v;
    u.pitch = STYLE[line.voice].pitch;
    u.rate = STYLE[line.voice].rate;
    u.onstart = () => onLine(i);
    if (i === lines.length - 1) u.onend = () => onLine(-1);
    speechSynthesis.speak(u);
  });
}
