import { NextResponse } from "next/server";
import { wagesFor } from "@/lib/bls";
import { cacheKey, getCached, putCached } from "@/lib/db";
import { demoRoadmap } from "@/lib/demo-data";
import { llmJson } from "@/lib/llm";
import type { LlmPref, PathOption, Roadmap } from "@/lib/types";

const SYSTEM = `You are a college and career pathway researcher for US students.
Given a target career and the college the student starts at, propose exactly 5 genuinely different, realistic routes.
Cover a real spread, for example: the classic transfer to a public university, a more selective/prestige transfer,
staying for a bachelor's at the starting college if it offers one, a fast workforce A.S. or certificate into an adjacent job,
an apprenticeship / earn-while-you-learn route, military or ROTC, online or part-time pacing for working students.
Only include route types that actually make sense for this career. Use real program and institution names where you are confident.
Costs are total tuition + fees in USD for an in-state student, before financial aid.

Return JSON:
{
  "outlook": { "growthPct": number (projected 10-year US employment growth for this career, your best estimate), "summary": "one sentence on demand for this career" },
  "options": [ {
    "id": "short-kebab-id",
    "title": "short route name",
    "summary": "one sentence",
    "kind": "Transfer" | "Selective transfer" | "Same-college bachelor's" | "Workforce A.S." | "Certificate" | "Apprenticeship" | "Military" | "Online / part-time" | "Graduate",
    "landsAs": "the job title this route gets you hired as first",
    "soc": "the 2018 SOC code for landsAs, format NN-NNNN",
    "weeklyHours": number (class + study hours per week, full-time pace),
    "workFriendly": boolean (realistic to hold a part-time job alongside),
    "minGpa": number or null (the highest admission GPA threshold along the route),
    "metrics": { "costUSD": number, "relevancy": 0-100 (how strongly employers value this credential for this career), "difficulty": 1-10, "years": number until working as landsAs },
    "steps": [ { "stage": string, "institution": string, "duration": string, "costUSD": number, "detail": "one sentence" } ] (3–4 milestones; the first at the starting college)
  } ]
}`;

export async function POST(req: Request) {
  const { career, college, llm } = (await req.json()) as { career: string; college: string; llm?: Partial<LlmPref> };
  if (!career?.trim()) return NextResponse.json({ error: "career is required" }, { status: 400 });
  const startCollege = college?.trim() || "Miami Dade College";
  const key = cacheKey("roadmap", career, startCollege);

  const hit = await getCached<Roadmap>(key);
  if (hit) return NextResponse.json({ ...hit.data, source: hit.from });

  try {
    const out = await llmJson<{ options: PathOption[]; outlook?: Roadmap["outlook"] }>(
      SYSTEM,
      `Career: ${career}\nStarting college: ${startCollege}`,
      llm,
      45000,
    );
    const options = (out.options ?? []).filter((o) => o?.metrics && Array.isArray(o.steps)).slice(0, 6);
    if (options.length < 2) throw new Error("LLM returned too few routes");

    const wages = await wagesFor(options.map((o) => o.soc ?? ""));
    for (const o of options) if (o.soc && wages[o.soc]?.nationalMedian) o.wages = wages[o.soc];

    const roadmap: Roadmap = { career, college: startCollege, options, outlook: out.outlook, source: "llm" };
    await putCached(key, roadmap);
    return NextResponse.json(roadmap);
  } catch (e) {
    console.warn("roadmap: falling back to demo data —", (e as Error).message);
    const demo = demoRoadmap(career, startCollege);
    const wages = await wagesFor(demo.options.map((o) => o.soc ?? ""));
    for (const o of demo.options) if (o.soc && wages[o.soc]?.nationalMedian) o.wages = wages[o.soc];
    return NextResponse.json(demo);
  }
}
