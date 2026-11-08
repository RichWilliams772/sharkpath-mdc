import { NextResponse } from "next/server";
import { cacheKey, getCached, putCached } from "@/lib/db";
import { llmJson } from "@/lib/llm";
import type { LlmPref, PathOption, RouteDetail } from "@/lib/types";

// The deep view of one route, generated only when the student opens it.

const SYSTEM = `You are a college advisor writing the detailed plan for ONE education-to-career route.
Be concrete and practical for a first-generation college student. Use real program/course names when confident.
All money in USD, in-state. Financial aid = typical Pell Grant + state aid (e.g. Florida Bright Futures/FSAG where relevant) for a
low-to-middle income student; say what it assumes.

Return JSON:
{
  "timeline": [ { "stage": "term or phase name, e.g. 'Year 1 · Fall'", "institution": string, "duration": string, "costUSD": number, "detail": "what you take or do, one or two sentences" } ] (6–10 entries covering the whole route),
  "costs": { "tuition": number, "booksFees": number, "living": number (extra living cost only if relocating, else 0), "aidEstimate": number, "aidNote": "one sentence on which aid this assumes" },
  "requirements": [ string ] (3–6: admission requirements, GPA thresholds, prerequisite courses, exams, licenses),
  "risks": [ string ] (2–4: honest ways this route goes wrong and how to avoid them),
  "nextActions": [ string ] (4–6: specific things to do this term, starting with the very first),
  "dayInLife": "2–3 sentences: what a normal workday looks like in the job this route lands in"
}`;

export async function POST(req: Request) {
  const { career, college, route, llm } = (await req.json()) as { career: string; college: string; route: PathOption; llm?: Partial<LlmPref> };
  const key = cacheKey("detail", career, college, route.id);

  const hit = await getCached<RouteDetail>(key);
  if (hit) return NextResponse.json({ ...hit.data, source: hit.from });

  try {
    const out = await llmJson<Omit<RouteDetail, "source">>(
      SYSTEM,
      `Career goal: ${career}\nStarting college: ${college}\nRoute: ${route.title}. ${route.summary}\nLands as: ${route.landsAs ?? career}\nMilestones: ${route.steps.map((s) => `${s.stage} at ${s.institution} (${s.duration})`).join("; ")}\nTotal cost before aid: ~$${route.metrics.costUSD}, ~${route.metrics.years} years.`,
      llm,
      40000,
    );
    if (!Array.isArray(out.timeline) || !out.costs) throw new Error("incomplete detail");
    const detail: RouteDetail = { ...out, source: "llm" };
    await putCached(key, detail);
    return NextResponse.json(detail);
  } catch (e) {
    console.warn("route-detail: falling back —", (e as Error).message);
    const tuition = route.metrics.costUSD;
    return NextResponse.json({
      timeline: route.steps,
      costs: { tuition: Math.round(tuition * 0.88), booksFees: Math.round(tuition * 0.12), living: 0, aidEstimate: 0, aidNote: "Aid estimate unavailable in demo mode." },
      requirements: ["Check program admission requirements with an advisor."],
      risks: ["Detailed risks need the AI guide; add a key in Guide settings."],
      nextActions: ["Meet an academic advisor at your college.", "File the FAFSA at studentaid.gov.", "Ask the program office for its course sequence."],
      dayInLife: "",
      source: "demo",
    } satisfies RouteDetail);
  }
}
