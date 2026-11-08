// Money plan quiz — figures out exactly how a student will pay for their path.
// Question and option text live in src/i18n (en/es) under money.q.<id>.
// Content owner: PM/Pitch team; financial rules in src/lib/finance.ts.

import type { FinanceAnswers } from "@/types/roadmap";

type Question<K extends keyof FinanceAnswers = keyof FinanceAnswers> = {
  id: K;
  options: FinanceAnswers[K][];
};

export const MONEY_QUIZ: Question[] = [
  { id: "income", options: ["under30", "30to60", "60to100", "over100", "unsure"] },
  { id: "fafsa", options: ["done", "planning", "unknown"] },
  { id: "brightFutures", options: ["fas", "fms", "none"] },
  { id: "housing", options: ["family", "own"] },
  { id: "work", options: [0, 10, 20, 30] },
  { id: "family", options: [0, 1500, 3500, 6000] },
  { id: "savings", options: [0, 500, 3000, 6000] },
  { id: "scholarships", options: ["yes", "maybe", "no"] },
  { id: "loans", options: ["no", "federal", "yes"] },
];
