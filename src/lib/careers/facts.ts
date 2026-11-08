import "server-only";
import { CORE } from "@/data/careers";
import { CATALOG } from "@/data/catalog";
import { loadCareers } from "@/lib/careers/from-db";
import { dbEnabled } from "@/lib/db";
import type { Career, Sourced, WhatIfInputs } from "@/types/roadmap";

// Grounding for the AI routes (Finn chat, counselor team): the career's sourced
// figures as plain text, so the models quote the same numbers the plan page shows.

/** The career as stored in Tiger Data, falling back to src/data. Undefined for AI-generated careers. */
export async function careerFor(id: string): Promise<Career | undefined> {
  if (dbEnabled) {
    try {
      const [fromDb] = await loadCareers([id]);
      if (fromDb) return fromDb;
    } catch (err) {
      console.error("Loading career from Tiger Data failed, using src/data", err);
    }
  }
  return [...CORE, ...CATALOG].find((c) => c.id === id);
}

const status = (f: Sourced<number | string>) => `${f.source.label}, ${f.source.verified ? "verified" : "estimate / not yet verified"}`;
const fig = (label: string, f: Sourced<number | string>) => `- ${label}: ${f.value}${f.unit ? ` ${f.unit}` : ""} (source: ${status(f)})`;

/** The career's sourced facts, one per line, each marked verified or estimate. */
export function careerFacts(career: Career | undefined, inputs: WhatIfInputs): string {
  if (!career) {
    return `The student is exploring a career that isn't in SharkPath's database (id "${inputs.careerId}"). You have no sourced figures for it.`;
  }
  const route = career.routes.find((r) => r.id === inputs.routeId) ?? career.routes[0];
  return [
    `Career: ${career.title}. ${career.summary}`,
    fig("Median pay", career.medianPay),
    fig("Job growth", career.jobGrowth),
    fig("Early-career pay", career.entryPay),
    fig("Typical entry education", career.typicalEntryEducation),
    `- Starting program: ${career.program.name} (${career.program.totalCredits.value} credits)`,
    ...(route ? [`- Student's chosen route: ${route.label}`] : []),
    ...career.stages.map((s) =>
      [
        `- Step "${s.title}"`,
        s.years && `${s.years.value} yrs (${status(s.years)})`,
        s.fee && `fee $${s.fee.value} (${status(s.fee)})`,
        s.afterFirstJob && "taken after the first job",
      ]
        .filter(Boolean)
        .join(", "),
    ),
    ...(career.license ? [`- License / certification: ${career.license.name} (${career.license.body})`] : []),
    ...(career.notes ?? []).map((n) => `- Note: ${n.text} (source: ${n.source.label})`),
  ].join("\n");
}

/** The student's what-if choices, as plain text. */
export function planFacts(inputs: WhatIfInputs): string {
  return [
    `- Credits already earned: ${inputs.creditsEarned}; works ${inputs.workHoursPerWeek} hrs/week; summer classes: ${inputs.takeSummerClasses ? "yes" : "no"}`,
    `- Pell eligible: ${inputs.pellEligible ? "yes" : "no"}; Bright Futures: ${inputs.brightFutures ? "yes" : "no"}; lives at home: ${inputs.livesAtHome ? "yes" : "no"}`,
  ].join("\n");
}
