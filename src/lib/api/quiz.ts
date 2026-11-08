import { QUIZ } from "@/data/quiz";
import { BUILTIN } from "@/lib/careers/registry";
import type { CareerTrack, QuizResult, QuizTrait } from "@/types/roadmap";
import { callEndpoint, EndpointMissing, ENDPOINTS } from "./endpoints";

const TRAITS: QuizTrait[] = ["building", "designing", "analyzing", "helping", "creating", "organizing", "hands-on", "tech"];

/** answers: questionId → optionId */
export function scoreQuiz(answers: Record<string, string>): QuizResult {
  const traits = Object.fromEntries(TRAITS.map((t) => [t, 0])) as Record<QuizTrait, number>;
  const preferredTracks = new Set<CareerTrack>();
  for (const q of QUIZ) {
    const option = q.options.find((o) => o.id === answers[q.id]);
    option?.traits.forEach((t) => traits[t]++);
    option?.tracks?.forEach((t) => preferredTracks.add(t));
  }
  // Rank every known career, averaging so careers with more trait tags aren't
  // favored, plus a bonus when the path length matches what the student wants.
  const raw = BUILTIN.map((c) => ({
    careerId: c.id,
    raw: (c.traits.reduce((a, t) => a + traits[t], 0) / c.traits.length) * (preferredTracks.has(c.track) ? 1.25 : 1),
  }));
  const max = Math.max(0.01, ...raw.map((r) => r.raw));
  const ranked = raw
    .map((r) => ({ careerId: r.careerId, score: Math.round((r.raw / max) * 100) }))
    .sort((a, b) => b.score - a.score);
  return { ranked, traits };
}

const MOCK_SUGGESTIONS: Record<QuizTrait, { title: string; why: string }> = {
  building: { title: "Construction Manager", why: "You like seeing real things get built." },
  designing: { title: "Interior Designer", why: "You think visually and care how spaces feel." },
  analyzing: { title: "Data Analyst", why: "You enjoy finding patterns and answers." },
  helping: { title: "Registered Nurse", why: "Helping people is what energizes you." },
  creating: { title: "Graphic Designer", why: "You love making something from nothing." },
  organizing: { title: "Project Manager", why: "You keep teams on track." },
  "hands-on": { title: "Electrician", why: "You learn best by doing." },
  tech: { title: "Cloud Engineer", why: "You're drawn to how technology works." },
};

/** Gemini suggests careers beyond the catalog (mocked until /api/quiz is live). */
export async function getAiSuggestions(result: QuizResult): Promise<NonNullable<QuizResult["aiSuggestions"]>> {
  try {
    const res = await callEndpoint(ENDPOINTS.quizSuggestions, {
      method: "POST",
      body: JSON.stringify({ traits: result.traits }),
    });
    return ((await res.json()) as { aiSuggestions: NonNullable<QuizResult["aiSuggestions"]> }).aiSuggestions;
  } catch (err) {
    if (!(err instanceof EndpointMissing)) throw err;
    return (Object.entries(result.traits) as [QuizTrait, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .filter(([, n]) => n > 0)
      .map(([t]) => MOCK_SUGGESTIONS[t]);
  }
}
