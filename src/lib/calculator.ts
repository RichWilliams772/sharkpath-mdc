// ⚠️ PLACEHOLDER calculator so the what-if sliders work today.
// Owner: AI/Backend ("Calculator logic"). Replace the body of `calculatePlan`
// (or call your API from it) — keep the (WhatIfInputs, Career, SchoolContext) → PlanResult contract.
// Works for ANY career and ANY U.S. college: tuition comes from the student's
// schools, at in-state or out-of-state rates based on their home state.

import { SOURCES as S } from "@/data/sources";
import { routeOf, stageIn } from "@/lib/careers/stages";
import { schoolContext, stateAidName, tuitionRate } from "@/lib/schools";
import type {
  Career,
  CostLine,
  Course,
  PlanResult,
  RoiPoint,
  SchoolContext,
  SemesterPlan,
  Sourced,
  TimelineSegment,
  WhatIfInputs,
} from "@/types/roadmap";

const num = (value: number, unit: string, source = S.sharkpathEstimate): Sourced => ({ value, unit, source });

export const RATES = {
  mdcPerCredit: num(118.22, "USD/credit", S.mdcTuition),
  upperPerCredit: num(205.57, "USD/credit", S.fiuTuition),
  gradPerYear: num(16000, "USD/yr", S.sharkpathEstimate),
  booksPerYear: num(1300, "USD/yr", S.mdcCostOfAttendance),
  livingPerYear: num(14500, "USD/yr", S.mdcCostOfAttendance),
  pellMax: num(7395, "USD/yr", S.pell),
  minWage: num(15, "USD/hr", S.flMinWage),
  baselinePay: num(46748, "USD/yr", S.blsEducationPays),
};

export function creditsPerTermFor(workHours: number) {
  if (workHours <= 10) return 15;
  if (workHours <= 20) return 12;
  if (workHours <= 30) return 9;
  return 6;
}

export function termLabel(term: string) {
  const [season, year] = term.split("-");
  return `${season[0].toUpperCase()}${season.slice(1)} ${year}`;
}

function nextTerm(term: string, summer: boolean) {
  const [season, y] = term.split("-");
  const year = Number(y);
  if (season === "spring") return summer ? `summer-${year}` : `fall-${year}`;
  if (season === "summer") return `fall-${year}`;
  return `spring-${year + 1}`;
}

const round = (n: number) => Math.round(n);

export function calculatePlan(inputs: WhatIfInputs, career: Career, schools: SchoolContext = schoolContext(inputs)): PlanResult {
  const startRate = tuitionRate(schools.start, schools.residency.start);
  const upperRate = tuitionRate(schools.transfer, schools.residency.transfer);
  const outOfStateGrad = schools.residency.transfer === "out-of-state";
  const route = routeOf(career, inputs.routeId);
  const program = career.program;
  const stage = (id: string) => stageIn(career, id);
  const load = creditsPerTermFor(inputs.workHoursPerWeek);
  const summerLoad = Math.min(6, load);

  // ── Semester-by-semester MDC plan ──
  const remaining: Course[] = [];
  let banked = 0;
  for (const course of program.courses) {
    if (banked + course.credits <= inputs.creditsEarned) banked += course.credits;
    else remaining.push(course);
  }

  // Fill each term in recommended order, pulling later courses forward when
  // the next one doesn't fit (allow 1 credit of overflow for 4-credit labs).
  const semesters: SemesterPlan[] = [];
  let term = inputs.startTerm;
  const queue = [...remaining];
  while (queue.length) {
    const cap = (term.startsWith("summer") ? summerLoad : load) + 1;
    const sem: SemesterPlan = { term, label: termLabel(term), school: schools.start.name, credits: 0, courses: [] };
    for (let i = 0; i < queue.length; ) {
      if (sem.credits + queue[i].credits <= cap || sem.courses.length === 0) {
        sem.credits += queue[i].credits;
        sem.courses.push(...queue.splice(i, 1));
      } else i++;
    }
    semesters.push(sem);
    term = nextTerm(term, inputs.takeSummerClasses);
  }

  const mainTerms = semesters.filter((s) => !s.term.startsWith("summer")).length;
  const mdcYears = remaining.length ? Math.max(0.5, mainTerms / 2) : 0;
  const mdcCredits = remaining.reduce((a, c) => a + c.credits, 0);

  // ── Stages after MDC ──
  const timeline: TimelineSegment[] = mdcYears
    ? [{ stageId: route.stageIds[1], label: stage(route.stageIds[1]).title, startYear: 0, years: mdcYears, earning: false }]
    : [];
  const costs: CostLine[] = [];
  let year = mdcYears;
  let upperYears = 0;
  let gradYears = 0;
  let yearsToCareer = mdcYears;

  for (const id of route.stageIds.slice(2)) {
    const st = stage(id);
    if (st.kind === "career") continue;
    if (st.kind === "certification" && inputs.hasCertification) continue;

    let years = st.years?.value ?? 0;
    if (st.kind === "transfer") {
      years = years * (15 / load) * (inputs.takeSummerClasses ? 0.85 : 1);
      upperYears += years;
    }
    if (st.kind === "graduate") gradYears += years;
    timeline.push({ stageId: id, label: st.title, startYear: year, years, earning: !!st.earningWhileInStage || !!st.afterFirstJob });
    // Career-growth steps (FE → PE) happen after the first job, so they don't delay it.
    if (!st.earningWhileInStage && !st.afterFirstJob) yearsToCareer = year + years;
    year += years;
    if (st.fee) costs.push({ label: st.title, amount: st.fee.value, source: st.fee.source });
  }

  // Summary semesters after MDC (real courses come from the transfer / grad school plan).
  // `term` already points at the term after MDC (or the start term if MDC is done).
  const routeStages = route.stageIds.map(stage);
  const transfer = routeStages.find((s) => s.kind === "transfer");
  // A bachelor's at the starting college (e.g. MDC B.S.) uses that college's bachelor's rate.
  const startBachelorRate = transfer?.atStartSchool ? schools.start.bachelorTuitionPerCredit : undefined;
  const bachelorSchool = startBachelorRate ? schools.start : schools.transfer;
  const bachelorResidency = startBachelorRate ? schools.residency.start : schools.residency.transfer;
  const bachelorRate = startBachelorRate
    ? bachelorResidency === "in-state"
      ? startBachelorRate.inState
      : startBachelorRate.outOfState
    : upperRate;
  const graduate = routeStages.find((s) => s.kind === "graduate");
  if (term.startsWith("summer")) term = nextTerm(term, false);
  let first = true;
  const addSummary = (school: string, title: string, terms: number, perTerm: number) => {
    for (let i = 0; i < terms; i++) {
      if (!first) term = nextTerm(term, false);
      first = false;
      semesters.push({ term, label: termLabel(term), school, credits: perTerm, courses: [{ code: "UPPER", title, credits: perTerm, category: "program-core" }] });
    }
  };
  if (transfer) {
    const terms = Math.max(1, Math.round(upperYears * 2));
    addSummary(`${bachelorSchool.shortName} · ${transfer.title}`, "Upper-division major courses (from transfer plan)", terms, Math.round(60 / terms));
  }
  if (graduate) addSummary(graduate.title, "Graduate / professional coursework", Math.max(1, Math.round(gradYears * 2)), 12);

  const schoolYears = mdcYears + upperYears + gradYears;

  // ── Costs ──
  const mdcTuition = mdcCredits * startRate.value;
  const upperTuition = transfer ? 60 * bachelorRate.value : 0;
  // Out-of-state graduate school costs roughly 1.8× (sample estimate).
  const gradTuition = gradYears * RATES.gradPerYear.value * (outOfStateGrad ? 1.8 : 1);
  const outLabel = (r: string) => (r === "out-of-state" ? " (out-of-state)" : "");
  costs.unshift(
    { label: `${schools.start.shortName} tuition${outLabel(schools.residency.start)}`, amount: round(mdcTuition), source: startRate.source },
    ...(transfer
      ? [{ label: `${bachelorSchool.shortName}${startBachelorRate ? " B.S." : ""} tuition${outLabel(bachelorResidency)}`, amount: round(upperTuition), source: bachelorRate.source }]
      : []),
    ...(graduate ? [{ label: `${graduate.title} tuition${outLabel(schools.residency.transfer)}`, amount: round(gradTuition), source: RATES.gradPerYear.source }] : []),
    { label: "Books & supplies", amount: round(schoolYears * RATES.booksPerYear.value), source: RATES.booksPerYear.source },
    ...(inputs.livesAtHome ? [] : [{ label: "Housing & living", amount: round(schoolYears * RATES.livingPerYear.value), source: RATES.livingPerYear.source }]),
  );
  const totalCost = costs.reduce((a, c) => a + c.amount, 0);

  const aid: CostLine[] = [];
  // State grants/scholarships (Bright Futures, Cal Grant, HOPE…) only cover in-state students.
  if (inputs.brightFutures) {
    const share = inputs.brightFuturesShare ?? 1;
    const covered = (schools.residency.start === "in-state" ? mdcTuition : 0) + (bachelorResidency === "in-state" ? upperTuition : 0);
    const name = stateAidName(schools.homeState);
    if (covered > 0) {
      aid.push({
        label: `${name ?? "State grant"} (tuition)`,
        amount: round(covered * share),
        source: schools.homeState === "FL" ? S.brightFutures : S.stateAid,
      });
    }
  }
  // Pell is undergrad-only and prorated for part-time enrollment.
  const pellShare = inputs.pellShare ?? 1;
  if (inputs.pellEligible && pellShare > 0) {
    const share = Math.max(0.25, Math.min(1, load / 15));
    aid.push({ label: "Pell Grant", amount: round(RATES.pellMax.value * share * pellShare * (mdcYears + upperYears)), source: S.pell });
  }
  const aidTotal = Math.min(totalCost, aid.reduce((a, c) => a + c.amount, 0));
  const netCost = round(totalCost - aidTotal);

  // ── ROI: cumulative earnings minus costs vs. a no-degree baseline ──
  const partTimePay = inputs.workHoursPerWeek * RATES.minWage.value * 50;
  const yearlyCost = schoolYears > 0 ? netCost / schoolYears : 0;
  const roi: RoiPoint[] = [];
  let pathway = 0;
  let baseline = 0;
  let breakEvenYear: number | null = null;

  // 25 years so long paths (medicine, law) still show their payoff.
  for (let y = 1; y <= 25; y++) {
    const schoolShare = Math.max(0, Math.min(1, yearsToCareer - (y - 1)));
    const careerYears = Math.max(0, y - yearsToCareer);
    const pay =
      career.entryPay.value + (career.medianPay.value - career.entryPay.value) * Math.min(1, careerYears / 8);
    pathway += schoolShare * (partTimePay - yearlyCost) + (1 - schoolShare) * pay;
    baseline += RATES.baselinePay.value;
    roi.push({ year: y, pathway: round(pathway), baseline: round(baseline) });
    if (breakEvenYear === null && y > yearsToCareer && pathway >= baseline) breakEvenYear = y;
  }

  return {
    inputs: { ...inputs, routeId: route.id },
    creditsPerTerm: load,
    semesters,
    timeline,
    yearsToCareer: Math.round(yearsToCareer * 10) / 10,
    schoolYears: Math.round(schoolYears * 10) / 10,
    costs,
    aid,
    totalCost,
    netCost,
    startingPay: career.entryPay,
    breakEvenYear,
    roi,
    assumptions: [
      { text: `Course load of ${load} credits per term at ${inputs.workHoursPerWeek} work hours/week`, source: S.sharkpathEstimate },
      { text: `${schools.start.name} tuition $${startRate.value}/credit (${schools.residency.start})`, source: startRate.source },
      ...(transfer
        ? [{ text: `${bachelorSchool.name}${startBachelorRate ? " bachelor's" : ""} tuition $${bachelorRate.value}/credit (${bachelorResidency})`, source: bachelorRate.source }]
        : []),
      { text: `Part-time pay at about $${RATES.minWage.value}/hr`, source: RATES.minWage.source },
      { text: `No-degree baseline $${RATES.baselinePay.value.toLocaleString("en-US")}/yr (high school diploma median)`, source: RATES.baselinePay.source },
      { text: "Pay grows from early-career to median over 8 years", source: S.sharkpathEstimate },
    ],
  };
}
