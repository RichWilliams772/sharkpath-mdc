import { NextResponse } from "next/server";
import { llmJson } from "@/lib/llm";
import { SPLIT_MARGIN, usd } from "@/lib/scoring";
import type { GuideReply, LlmPref, Metrics, Profile, Weights } from "@/lib/types";

type RouteBrief = { id: string; title: string; score: number; metrics: Metrics };
type Body = {
  message: string;
  career?: string;
  college?: string;
  routes?: RouteBrief[]; // already scored and sorted, best first
  weights?: Weights;
  history?: { voice: string; text: string }[]; // student, sonar, tide
  profile?: Profile | null;
  focus?: { routeTitle: string; tab: string; facts: string }; // what the student is looking at in the explorer
  llm?: Partial<LlmPref>;
};

// One agent, two inner voices. The model writes both; the UI gives each its own side and speech voice.
const SYSTEM = `You are SharkPath's guide: ONE mind that speaks as TWO inner voices, helping a student shape their own vision.

SONAR — the pragmatic navigator. Concrete, data-first: cost, job demand, timelines, next actions. Short, steady sentences.
TIDE — the reflective coach. Asks what the student actually wants, names fears and motivations, connects choices to who they want to become. Warm, curious.

Rules:
- If both voices would give the same advice, stance = "agree": they speak as one mind, finishing each other's thoughts
  (Sonar states the facts, Tide carries it to what it means for the student, or the reverse). 2–4 lines total.
- If you are genuinely torn (for example the top routes score within ${SPLIT_MARGIN} points, or the data points one way and the
  student's stated values another), stance = "split": Sonar argues one route or choice and Tide argues the other. Each voice
  makes its case in 1–2 lines, then end with one line where they hand the decision back to the student.
  Fill "picks" with the route id each voice argues for, when routes are involved.
- Speak directly to the student ("you"). Plain language. No markdown, no lists. Each line under 45 words.
- Write numbers and money as digits ("$7,600", "4 years"), never spelled out.
- Never invent precise statistics beyond the route data you were given.

Return JSON: { "stance": "agree" | "split", "lines": [ { "voice": "sonar" | "tide", "text": string } ], "picks": { "sonar"?: routeId, "tide"?: routeId } }`;

function context(b: Body) {
  const parts = [];
  if (b.career) parts.push(`Target career: ${b.career}`);
  if (b.college) parts.push(`Starting college: ${b.college}`);
  if (b.weights) parts.push(`Student's priority weights: relevancy ${b.weights.relevancy}, cost ${b.weights.cost}, difficulty ${b.weights.difficulty}, time ${b.weights.time}`);
  if (b.routes?.length) {
    parts.push("Routes (best weighted score first):");
    for (const r of b.routes)
      parts.push(`- ${r.id}: ${r.title} — score ${r.score.toFixed(0)}, ${usd(r.metrics.costUSD)}, relevancy ${r.metrics.relevancy}, difficulty ${r.metrics.difficulty}/10, ${r.metrics.years} yrs`);
  }
  if (b.profile) parts.push(`Student situation: can spend ~$${b.profile.budgetPerYear}/yr on school, ${b.profile.hoursPerWeek} hrs/week free, work: ${b.profile.work}, GPA: ${b.profile.gpa ?? "unknown"}`);
  if (b.focus) parts.push(`The student is looking at the "${b.focus.tab}" tab of the route "${b.focus.routeTitle}". Facts on screen: ${b.focus.facts}`);
  if (b.history?.length) parts.push("Recent conversation:\n" + b.history.slice(-8).map((l) => `${l.voice}: ${l.text}`).join("\n"));
  return parts.join("\n");
}

/** Keyless fallback: the score gap decides whether the voices agree or split. */
function demoReply(b: Body): GuideReply {
  const [a, c] = b.routes ?? [];
  if (!a) {
    return {
      stance: "agree", source: "demo",
      lines: [
        { voice: "sonar", text: "Start by naming a career and the college you're at. I'll map three real routes and price them out." },
        { voice: "tide", text: "And don't worry about picking the perfect one yet. Tell us what kind of days you want to have, and we'll work backward from there." },
      ],
    };
  }
  if (c && a.score - c.score < SPLIT_MARGIN) {
    return {
      stance: "split", source: "demo", picks: { sonar: a.id, tide: c.id },
      lines: [
        { voice: "sonar", text: `By your weights, ${a.title} edges ahead: ${usd(a.metrics.costUSD)} over about ${a.metrics.years} years, job relevancy ${a.metrics.relevancy}.` },
        { voice: "tide", text: `But the gap is tiny. ${c.title} might fit the life you want better. Which one would you be prouder to tell people you chose?` },
        { voice: "sonar", text: "We're split on this one, so it's your call. Nudge the sliders and see which way it tips." },
      ],
    };
  }
  return {
    stance: "agree", source: "demo",
    lines: [
      { voice: "sonar", text: `${a.title} is the clear front-runner for you: ${usd(a.metrics.costUSD)}, about ${a.metrics.years} years, relevancy ${a.metrics.relevancy}.` },
      { voice: "tide", text: "And it matches what you said matters most. Open it up, look at the first step, and picture yourself starting it next term." },
    ],
  };
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  try {
    const out = await llmJson<Omit<GuideReply, "source">>(SYSTEM, `${context(body)}\n\nStudent says: ${body.message}`, body.llm, 15000);
    const lines = (out.lines ?? []).filter((l) => (l.voice === "sonar" || l.voice === "tide") && l.text);
    if (!lines.length) throw new Error("empty guide reply");
    return NextResponse.json({ stance: out.stance === "split" ? "split" : "agree", lines, picks: out.picks, source: "llm" } satisfies GuideReply);
  } catch (e) {
    console.warn("guide: falling back to demo reply —", (e as Error).message);
    return NextResponse.json(demoReply(body));
  }
}
