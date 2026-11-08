// ⚠️ PLACEHOLDER money-plan logic (sample data) — same contract idea as the
// calculator: (FinanceAnswers, PlanResult, Career) → FinancePlan. The
// Backend/AI team can replace the body or call an API from it.

import { DEADLINES } from "@/data/deadlines";
import { SOURCES as S } from "@/data/sources";
import type {
  Career,
  FinanceAction,
  FinanceAnswers,
  FinancePlan,
  FundingLine,
  PlanResult,
  SchoolContext,
  WhatIfInputs,
} from "@/types/roadmap";
import { RATES } from "./calculator";
import { schoolContext, stateAidName } from "./schools";

/** Rough share of the max Pell Grant by household income (sample estimate). */
export const PELL_SHARE: Record<FinanceAnswers["income"], number> = {
  under30: 1,
  "30to60": 0.6,
  "60to100": 0.2,
  over100: 0,
  unsure: 0.5,
};

const SCHOLARSHIP_PER_YEAR: Record<FinanceAnswers["scholarships"], number> = { yes: 1500, maybe: 500, no: 0 };
/** Share of part-time pay a student can realistically put toward school */
const WORK_TO_SCHOOL = 0.5;
/** Federal Direct Loan, typical annual undergrad limit (sample) */
const FEDERAL_LOAN_PER_YEAR = 5500;
const LOAN_RATE = 0.065;
const LOAN_MONTHS = 120;

/** What the quiz answers change in the live plan. */
export function inputsFromAnswers(a: FinanceAnswers): Partial<WhatIfInputs> {
  const pellShare = PELL_SHARE[a.income];
  return {
    pellEligible: pellShare > 0,
    pellShare,
    brightFutures: a.brightFutures !== "none",
    brightFuturesShare: a.brightFutures === "fms" ? 0.75 : 1,
    livesAtHome: a.housing === "family",
    workHoursPerWeek: a.work,
  };
}

const dateOf = (id: string) => DEADLINES.find((d) => d.id === id)?.date;

/** Fill {school} / {aid} placeholders in action text (after translation). */
export const fillVars = (text: string, vars?: Record<string, string>) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m) : text;

export function buildFinancePlan(
  a: FinanceAnswers,
  plan: PlanResult,
  career: Career,
  schools: SchoolContext = schoolContext(plan.inputs),
): FinancePlan {
  const years = Math.max(0.5, plan.schoolYears);
  const vars = { school: schools.start.shortName, aid: stateAidName(schools.homeState) ?? "your state grant" };
  const funding: FundingLine[] = [];

  // Fill the full cost: free money first (grants, scholarships), then family,
  // savings and work, loans last. Each source only covers what's still left.
  let remaining = plan.totalCost;
  let available = 0;
  const add = (line: FundingLine) => {
    available += line.amount;
    const take = Math.min(line.amount, Math.max(0, remaining));
    remaining -= take;
    if (take > 0) funding.push({ ...line, amount: Math.round(take) });
  };
  for (const l of plan.aid) {
    add({ kind: l.label.startsWith("Pell") ? "grant" : "scholarship", label: l.label, amount: l.amount, source: l.source });
  }
  const workPay = plan.inputs.workHoursPerWeek * RATES.minWage.value * 50;
  add({ kind: "scholarship", label: "College & outside scholarships", amount: SCHOLARSHIP_PER_YEAR[a.scholarships] * years, source: S.mdcFoundation });
  add({ kind: "family", label: "Family help", amount: a.family * years, source: S.sharkpathEstimate });
  add({ kind: "savings", label: "Your savings", amount: a.savings, source: S.sharkpathEstimate });
  add({ kind: "work", label: "Part-time job (half of your pay)", amount: workPay * WORK_TO_SCHOOL * years, source: RATES.minWage.source });
  const spare = Math.max(0, available - plan.totalCost);

  let loanTotal = 0;
  if (remaining > 0 && a.loans !== "no") {
    const cap = a.loans === "federal" ? FEDERAL_LOAN_PER_YEAR * years : Infinity;
    loanTotal = Math.round(Math.min(remaining, cap));
    remaining -= loanTotal;
    funding.push({ kind: "loan", label: a.loans === "federal" ? "Federal student loans" : "Student loans (federal first)", amount: loanTotal, source: S.federalLoans });
  }

  const covered = Math.round(funding.reduce((s, l) => s + l.amount, 0));
  const gap = remaining > 0 ? Math.round(remaining) : -Math.round(spare);
  const months = years * 12;

  let loanPayment: FinancePlan["loanPayment"] = null;
  if (loanTotal > 0) {
    const r = LOAN_RATE / 12;
    const monthly = Math.round((loanTotal * r) / (1 - (1 + r) ** -LOAN_MONTHS));
    loanPayment = { total: loanTotal, monthly, shareOfPay: monthly / (career.entryPay.value / 12) };
  }

  // ── Personal to-do list ──
  const actions: FinanceAction[] = [];
  if (a.fafsa === "done") {
    actions.push({ id: "fafsa-renew", title: "Renew your FAFSA every year", detail: "It opens October 1 — renew right away so your aid never lapses.", due: dateOf("fafsa-open-27") });
  } else {
    actions.push({ id: "fafsa-file", title: "File your FAFSA", detail: "It unlocks Pell Grants, work-study and federal loans. It’s free and takes about an hour.", due: dateOf("fafsa-open-27") });
  }
  if (a.income === "unsure") {
    actions.push({ id: "income-check", title: "Find out what aid you qualify for", detail: "Use the Federal Student Aid Estimator with a parent’s tax info — your Pell Grant could change this plan." });
  }
  // State aid only helps in-state students.
  if (a.brightFutures !== "none" && schools.residency.start === "in-state") {
    actions.push({
      id: "bright-futures",
      title: "Lock in {aid}",
      detail: "Submit your state’s financial aid application and keep your grades up to renew it each year.",
      due: dateOf("bright-futures"),
      vars,
    });
  }
  if (schools.residency.start === "out-of-state" || schools.residency.transfer === "out-of-state") {
    actions.push({
      id: "residency",
      title: "Ask about in-state tuition",
      detail: "Out-of-state rates cost much more. Ask {school} about residency rules and regional discount programs (like WUE or the Academic Common Market).",
      vars,
    });
  }
  if (a.scholarships !== "no") {
    actions.push({
      id: "scholarships",
      title: "Apply for {school} scholarships",
      detail: "Your college’s scholarship office has aid just for its students — also apply to at least 3 outside ones.",
      due: dateOf("mdc-foundation"),
      vars,
    });
  }
  if (a.work > 0) {
    actions.push({ id: "work", title: "Line up a school-friendly job", detail: "Ask Financial Aid about Federal Work-Study — on-campus jobs fit around your classes." });
  }
  if (loanTotal > 0) {
    actions.push({ id: "loans", title: "Borrow federal loans first", detail: "Accept subsidized federal loans before any others, and borrow only what this plan needs.", amount: loanTotal });
  }
  if (gap > 0) {
    actions.push({ id: "save", title: "Save toward your gap every month", detail: "Putting this aside each month while in school closes the gap.", amount: Math.ceil(gap / months) });
    actions.push({ id: "gap", title: "Shrink the gap", detail: "More scholarships, a few more work hours, living with family or summer classes can all close it." });
  }
  actions.push({
    id: "advisor",
    title: "Meet a {school} financial aid advisor",
    detail: "Bring this plan — they can confirm your numbers and find aid you might be missing.",
    vars,
  });

  return {
    answers: a,
    yearsInSchool: years,
    totalCost: plan.totalCost,
    funding,
    covered,
    gap,
    monthly: {
      // What's left after grants, spread over the school months…
      cost: Math.round(plan.netCost / months),
      // …vs. what the job and family bring in each month.
      income: Math.round((workPay + a.family) / 12),
    },
    loanPayment,
    actions,
  };
}
