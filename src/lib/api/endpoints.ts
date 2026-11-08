// Endpoint contract between the UI and the AI/Backend + Data branches.
//
// The UI calls these routes. Until a route exists (404) or the request fails,
// it falls back to a local mock so the demo always works. Ship the route and
// the UI switches over automatically — no frontend change needed.

export const ENDPOINTS = {
  /** POST { messages: ChatMessage[], context } → text stream (AI SDK `toTextStreamResponse()`) */
  chat: "/api/chat",
  /** POST { inputs: WhatIfInputs, career: Career, summary } → CounselorTeamResult (Swarms) */
  counselorTeam: "/api/counselor-team",
  /** POST { query, locale } → Career (Gemini + Tiger Data). Turns ANY career into a plannable path. */
  resolveCareer: "/api/careers/resolve",
  /** POST { answers, traits } → { aiSuggestions: { title, why }[] } (Gemini) */
  quizSuggestions: "/api/quiz",
  /** GET → SavedPlan[] · POST SavedPlan · DELETE ?id= — requires Auth0 session */
  plans: "/api/plans",
  /** POST { text, locale } → audio (e.g. audio/mpeg) — natural AI voice for Finn (Gemini TTS etc.) */
  tts: "/api/tts",
} as const;

export class EndpointMissing extends Error {}

/** fetch() that throws EndpointMissing when the teammate's route isn't live yet. */
export async function callEndpoint(url: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch {
    throw new EndpointMissing(url);
  }
  if (res.status === 404 || res.status === 501) throw new EndpointMissing(url);
  if (!res.ok) throw new Error(`${url} failed: ${res.status}`);
  return res;
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
