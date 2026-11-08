// POST /api/counselor-team — the Swarms counselor team. Contract: src/lib/api/counselor.ts (runCounselorTeam)
//   body { inputs: WhatIfInputs, career: Career, summary, locale: "en" | "es" } → { agents: AgentReport[] }
//
// Step 1: four specialists (career, education, finance, licensing) run in parallel (Swarms ConcurrentWorkflow).
// Step 2: a coordinator reads their reports and writes the action plan (Swarms single-agent completion).
// All agents get the career's sourced facts from Tiger Data and may only quote those numbers.
//
// The report is about the career and its route, not one student's personal numbers, so a
// finished report is saved in Tiger Data (counselor_team_cache) per career + route + language
// and reused: repeat views load instantly and cost no Swarms credits. If the career's facts or
// the prompts change, the saved report no longer matches `facts_hash` and is regenerated.
//
// 501 until SWARMS_API_KEY is set; 503 when Swarms fails and 429 when rate-limited, so the UI
// uses its built-in reports.

import { createHash } from "node:crypto";
import { careerFacts, careerFor } from "@/lib/careers/facts";
import { db, dbEnabled } from "@/lib/db";
import { rateLimit, tooMany, type Limit } from "@/lib/rate-limit";
import type { AgentReport, AgentRole, Career, WhatIfInputs } from "@/types/roadmap";

const SWARMS_URL = "https://api.swarms.world";
const MODEL = "claude-haiku-5-5";
const FALLBACK_MODELS = ["gpt-5.4-nano"];
const SPECIALISTS_TIMEOUT_MS = 45_000;
const COORDINATOR_TIMEOUT_MS = 30_000;
/** Fresh (uncached) team runs per visitor. Cached reports don't count. */
const TEAM_LIMIT: Limit = { name: "counselor-team", max: 6, windowSeconds: 60 * 60 };
/** Bump to invalidate every saved report (e.g. after changing the prompts' meaning). */
const PROMPT_VERSION = "2026-11-08.1";

type Locale = "en" | "es";

const SPECIALISTS: { role: Exclude<AgentRole, "coordinator">; brief: string }[] = [
  { role: "career", brief: "Career outlook: what the job is like, median and early-career pay, job growth, and what it takes to get hired." },
  { role: "education", brief: "Education path: the MDC program, the route's steps and how long they take, transfer options, and how to stay on track while working." },
  { role: "finance", brief: "Paying for it: tuition-related costs and fees on this route, financial aid worth applying for (FAFSA, Pell Grant, Bright Futures, MDC scholarships), and how to keep debt low." },
  { role: "licensing", brief: "Licenses and certifications: which are required or optional, their fees, when to take them (before or after the first job), and what to prepare." },
];

const format = (locale: Locale) =>
  `Reply ONLY with a JSON object, no code fences: {"headline": string (max 90 characters), "points": [2 to 4 strings, each max 200 characters]}. ` +
  (locale === "es"
    ? "Write the headline and points in Spanish (clear, friendly Latin American Spanish for Miami students); keep the JSON keys in English."
    : "Write in English.");

const RULES = [
  "Rules:",
  "- Only state numbers (pay, growth, costs, years, fees) that appear in the facts. Never invent figures.",
  "- If a figure is marked as an estimate or not yet verified, say so.",
  "- Speak to any student on this route; don't assume their income, work hours or aid status.",
  "- Write for a college student: plain, encouraging, specific to MDC (Miami Dade College).",
].join("\n");

interface TeamBody {
  inputs: WhatIfInputs;
  career?: Career;
  locale: Locale;
}

function parseBody(body: unknown): TeamBody | null {
  const b = body as (Partial<TeamBody> & { locale?: unknown }) | null;
  if (!b?.inputs || typeof b.inputs.careerId !== "string") return null;
  return { inputs: b.inputs, career: b.career, locale: b.locale === "es" ? "es" : "en" };
}

async function swarms<T>(path: string, payload: unknown, timeoutMs: number): Promise<T> {
  const res = await fetch(`${SWARMS_URL}${path}`, {
    method: "POST",
    headers: { "x-api-key": process.env.SWARMS_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Swarms ${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

type AgentMessage = { role?: string; content?: unknown };

/** An agent's JSON reply → AgentReport (null if it isn't usable). */
function toReport(role: AgentRole, content: unknown): AgentReport | null {
  if (typeof content !== "string") return null;
  const json = content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1);
  try {
    const r = JSON.parse(json) as { headline?: unknown; points?: unknown };
    if (typeof r.headline !== "string" || !Array.isArray(r.points)) return null;
    const points = r.points.filter((p): p is string => typeof p === "string" && p.trim() !== "").slice(0, 4);
    if (!r.headline.trim() || points.length === 0) return null;
    return { role, status: "done", headline: r.headline.trim().slice(0, 140), points: points.map((p) => p.trim().slice(0, 300)) };
  } catch {
    return null;
  }
}

const failed = (role: AgentRole): AgentReport => ({ role, status: "error", headline: "This counselor couldn't finish", points: [] });

// ── Saved reports ──
async function readSaved(careerId: string, routeId: string, locale: Locale, factsHash: string): Promise<AgentReport[] | null> {
  if (!dbEnabled) return null;
  try {
    const [row] = await db()<{ agents: AgentReport[] }[]>`
      SELECT agents FROM counselor_team_cache
      WHERE career_id = ${careerId} AND route_id = ${routeId} AND locale = ${locale} AND facts_hash = ${factsHash}`;
    return row?.agents ?? null;
  } catch (err) {
    console.error("counselor-team: reading saved report failed", err);
    return null;
  }
}

async function save(careerId: string, routeId: string, locale: Locale, factsHash: string, agents: AgentReport[]) {
  if (!dbEnabled) return;
  try {
    const sql = db();
    await sql`
      INSERT INTO counselor_team_cache (career_id, route_id, locale, facts_hash, agents)
      VALUES (${careerId}, ${routeId}, ${locale}, ${factsHash}, ${sql.json(agents as unknown as Parameters<typeof sql.json>[0])})
      ON CONFLICT (career_id, route_id, locale) DO UPDATE
        SET facts_hash = EXCLUDED.facts_hash, agents = EXCLUDED.agents, created_at = now()`;
  } catch (err) {
    console.error("counselor-team: saving report failed", err);
  }
}

export async function POST(request: Request) {
  if (!process.env.SWARMS_API_KEY) return new Response("Counselor team not configured", { status: 501 });
  const body = parseBody(await request.json().catch(() => null));
  if (!body) return new Response("Invalid request", { status: 400 });
  const { inputs, locale } = body;

  // Prefer the career as stored in our database; only AI-generated careers use the copy the browser sent.
  const career = (await careerFor(inputs.careerId)) ?? body.career;
  const routeId = career?.routes.find((r) => r.id === inputs.routeId)?.id ?? career?.routes[0]?.id ?? "default";
  const facts = careerFacts(career, { ...inputs, routeId });
  const context = `Facts from SharkPath's database:\n${facts}`;
  const factsHash = createHash("sha256").update(`${PROMPT_VERSION}\n${MODEL}\n${locale}\n${context}`).digest("hex");

  // Seen before: instant, and no Swarms credits used.
  const saved = await readSaved(inputs.careerId, routeId, locale, factsHash);
  if (saved) return Response.json({ agents: saved }, { headers: { "X-SharkPath-Cache": "hit" } });

  const limited = await rateLimit(request, TEAM_LIMIT);
  if (!limited.ok) return tooMany(limited);

  const agent = (role: AgentRole, prompt: string) => ({
    agent_name: role,
    model_name: MODEL,
    fallback_models: FALLBACK_MODELS,
    max_tokens: 1200,
    max_loops: 1,
    system_prompt: prompt,
  });

  // ── Step 1: specialists in parallel ──
  let specialists: AgentReport[];
  try {
    const run = await swarms<{ output?: AgentMessage[] }>(
      "/v1/swarm/completions",
      {
        name: "SharkPath counselor team",
        swarm_type: "ConcurrentWorkflow",
        max_loops: 1,
        task: `Write your part of the counseling report for students on this career route.\n\n${context}`,
        agents: SPECIALISTS.map((s) =>
          agent(s.role, `You are SharkPath's ${s.role} counselor. Focus only on: ${s.brief}\n\n${RULES}\n\n${format(locale)}`),
        ),
      },
      SPECIALISTS_TIMEOUT_MS,
    );
    const byRole = new Map((run.output ?? []).map((m) => [m.role, m.content]));
    specialists = SPECIALISTS.map((s) => toReport(s.role, byRole.get(s.role)) ?? failed(s.role));
  } catch (err) {
    console.error("POST /api/counselor-team specialists failed", err);
    return new Response("Counselor team unavailable right now", { status: 503 });
  }
  if (specialists.every((r) => r.status === "error")) {
    return new Response("Counselor team unavailable right now", { status: 503 });
  }

  // ── Step 2: coordinator turns the reports into next steps ──
  let coordinator: AgentReport;
  try {
    const reports = specialists
      .filter((r) => r.status === "done")
      .map((r) => `${r.role}: ${r.headline}\n${r.points.map((p) => `  - ${p}`).join("\n")}`)
      .join("\n");
    const run = await swarms<{ outputs?: AgentMessage[] }>(
      "/v1/agent/completions",
      {
        agent_config: agent(
          "coordinator",
          `You are SharkPath's coordinator. Combine the specialists' reports into a short action plan: the headline states the plan in one line, and each point is a concrete next step in order (this week, this semester, later).\n\n${RULES}\n\n${format(locale)}`,
        ),
        task: `${context}\n\nSpecialists' reports:\n${reports}`,
      },
      COORDINATOR_TIMEOUT_MS,
    );
    const reply = (run.outputs ?? []).findLast((m) => m.role === "coordinator") ?? run.outputs?.at(-1);
    coordinator = toReport("coordinator", reply?.content) ?? failed("coordinator");
  } catch (err) {
    console.error("POST /api/counselor-team coordinator failed", err);
    coordinator = failed("coordinator");
  }

  const agents = [...specialists, coordinator];
  // Only complete reports are saved, so a partial failure gets retried next time.
  if (agents.every((a) => a.status === "done")) await save(inputs.careerId, routeId, locale, factsHash, agents);
  return Response.json({ agents }, { headers: { "X-SharkPath-Cache": "miss" } });
}
