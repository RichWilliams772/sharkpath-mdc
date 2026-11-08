// Any U.S. college: which schools a plan runs through, in-state vs out-of-state,
// and rewriting the demo school names (MDC / FIU / Florida) in career data so
// every label shows the student's own colleges and state.

import { DEADLINES } from "@/data/deadlines";
import { DEFAULT_HOME_STATE, DEFAULT_SCHOOL_ID, NATIONAL_AVERAGES, SCHOOLS, STATE_AID, stateName } from "@/data/schools";
import { SOURCES as S } from "@/data/sources";
import type { Career, Deadline, Residency, School, SchoolContext, StateCode, WhatIfInputs } from "@/types/roadmap";

export function getSchool(id: string, custom: Record<string, School> = {}): School {
  return custom[id] ?? SCHOOLS.find((s) => s.id === id) ?? SCHOOLS[0];
}

/** Where a student would usually go for a bachelor's: stay at a university, or the main public university in the state. */
export function defaultTransfer(start: School, homeState: StateCode, custom: Record<string, School> = {}): School {
  if (start.kind === "university") return start;
  const universities = [...SCHOOLS, ...Object.values(custom)].filter((s) => s.kind === "university");
  return (
    universities.find((s) => s.state === start.state) ??
    universities.find((s) => s.state === homeState) ??
    customSchool(`${stateName(start.state)} public university`, start.state, "university")
  );
}

export function schoolContext(
  inputs: Pick<WhatIfInputs, "schoolId" | "transferSchoolId" | "homeState">,
  custom: Record<string, School> = {},
): SchoolContext {
  const homeState = inputs.homeState ?? DEFAULT_HOME_STATE;
  const start = getSchool(inputs.schoolId ?? DEFAULT_SCHOOL_ID, custom);
  const transfer = inputs.transferSchoolId ? getSchool(inputs.transferSchoolId, custom) : defaultTransfer(start, homeState, custom);
  const residency = (s: School): Residency => (s.state === homeState ? "in-state" : "out-of-state");
  return { start, transfer, homeState, residency: { start: residency(start), transfer: residency(transfer) } };
}

export const tuitionRate = (s: School, r: Residency) => (r === "in-state" ? s.tuitionPerCredit.inState : s.tuitionPerCredit.outOfState);

/** A college the student typed in. Tuition uses national averages until real data exists. */
export function customSchool(name: string, state: StateCode, kind: School["kind"]): School {
  const clean = name.trim();
  const slug = clean.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const avg = NATIONAL_AVERAGES[kind];
  const shortName =
    clean.length <= 20
      ? clean
      : clean
          .split(/\s+/)
          .filter((w) => /^[A-Z]/.test(w) && !/^(Of|The|And|At)$/i.test(w))
          .map((w) => w[0])
          .join("");
  return {
    id: `custom-${slug}-${state.toLowerCase()}`,
    name: clean,
    shortName: shortName || clean.slice(0, 20),
    state,
    kind,
    custom: true,
    tuitionPerCredit: {
      inState: { value: avg.inState, unit: "USD/credit", source: S.nationalAverage },
      outOfState: { value: avg.outOfState, unit: "USD/credit", source: S.nationalAverage },
    },
  };
}

/** The student's state aid program name ("Bright Futures", "Cal Grant"…), or null for a generic label. */
export const stateAidName = (state: StateCode) => STATE_AID[state] ?? null;

/** Swap the demo schools/state in any career or deadline text for the student's own. */
export function localizeText(text: string, ctx: SchoolContext): string {
  const { start, transfer, homeState } = ctx;
  let out = text
    .replace(/FIU · FAU · UF via 2\+2/g, `${transfer.shortName} · transfer`)
    .replace(/FIU · or UF \/ FAU/g, `${transfer.shortName} · transfer`)
    .replace(/FIU · 2\+2 transfer/g, `${transfer.shortName} · transfer`)
    .replace(/Miami Culinary Institute|Miami Dade College/g, start.name)
    .replace(/\bMDC’s\b/g, `${start.shortName}’s`)
    .replace(/\bMDC\b/g, start.shortName)
    .replace(/\bFIU\b/g, transfer.shortName);
  if (homeState !== "FL") {
    out = out
      .replace(/\bFlorida Bar\b/g, "bar")
      .replace(/\bFlorida\b/g, stateName(homeState))
      .replace(/\bFL\b/g, homeState);
  }
  return out;
}

/** A copy of the career with every label pointing at the student's colleges and state. */
export function withSchools(career: Career, ctx: SchoolContext): Career {
  const L = (s?: string) => (s === undefined ? s : localizeText(s, ctx));
  return {
    ...career,
    summary: L(career.summary)!,
    license: career.license && { ...career.license, name: L(career.license.name)!, body: L(career.license.body)! },
    program: { ...career.program, name: L(career.program.name)!, school: ctx.start.name },
    stages: career.stages.map((s) => ({ ...s, title: L(s.title)!, subtitle: L(s.subtitle) })),
    routes: career.routes.map((r) => ({ ...r, label: L(r.label)! })),
  };
}

/** Deadlines for this career and these schools (state aid only where it applies). */
export function deadlinesFor(careerId: string, ctx: SchoolContext): Deadline[] {
  const aid = stateAidName(ctx.homeState);
  return DEADLINES.filter((d) => d.careerIds.length === 0 || d.careerIds.includes(careerId))
    .filter((d) => d.id !== "bright-futures" || ctx.residency.start === "in-state")
    .filter((d) => d.id !== "fiu-fall-transfer" || ctx.transfer.id !== ctx.start.id)
    .map((d) => {
      const copy = { ...d, title: localizeText(d.title, ctx), description: localizeText(d.description, ctx) };
      if (d.id === "bright-futures") {
        copy.title = `${aid ?? "State grant"} application window`;
        copy.description = "Check eligibility and complete your state's financial aid application.";
      }
      return copy;
    });
}
