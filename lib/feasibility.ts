import type { PathOption, Profile, RouteDetail } from "./types";
import { usd } from "./scoring";

// "Fit" answers a different question from "Match":
// Match = how well a route scores on what you care about. Fit = how realistic it is given your situation.

export type Check = { level: "ok" | "warn" | "bad"; label: string; detail: string };
const POINTS = { ok: 100, warn: 55, bad: 15 };

export function netCost(o: PathOption, d?: RouteDetail | null) {
  return Math.max(0, o.metrics.costUSD - (d?.costs.aidEstimate ?? 0));
}

export function fit(o: PathOption, p: Profile | null, d?: RouteDetail | null): { score: number | null; checks: Check[] } {
  if (!p) return { score: null, checks: [] };
  const checks: Check[] = [];

  const perYear = netCost(o, d) / Math.max(1, o.metrics.years);
  checks.push(
    perYear <= p.budgetPerYear
      ? { level: "ok", label: "Budget", detail: `About ${usd(perYear)}/yr${d ? " after aid" : ""}, within your ${usd(p.budgetPerYear)}/yr.` }
      : perYear <= p.budgetPerYear * 1.5
        ? { level: "warn", label: "Budget", detail: `About ${usd(perYear)}/yr${d ? " after aid" : ""}: a stretch over your ${usd(p.budgetPerYear)}/yr. Scholarships could close it.` }
        : { level: "bad", label: "Budget", detail: `About ${usd(perYear)}/yr${d ? " after aid" : ""}, well over your ${usd(p.budgetPerYear)}/yr.` },
  );

  const hours = o.weeklyHours ?? 30;
  checks.push(
    hours <= p.hoursPerWeek
      ? { level: "ok", label: "Time", detail: `Needs ~${hours} hrs/week; you have ${p.hoursPerWeek}.` }
      : hours <= p.hoursPerWeek * 1.3
        ? { level: "warn", label: "Time", detail: `Needs ~${hours} hrs/week; you have ${p.hoursPerWeek}. Tight, or go part-time and add a term or two.` }
        : { level: "bad", label: "Time", detail: `Needs ~${hours} hrs/week; you have ${p.hoursPerWeek}. Part-time pacing would stretch it a lot.` },
  );

  if (p.work !== "none") {
    const friendly = o.workFriendly ?? true;
    checks.push(
      friendly
        ? { level: p.work === "full" ? "warn" : "ok", label: "Working", detail: p.work === "full" ? "Possible with a full-time job, but expect evening/online sections." : "Works alongside a part-time job." }
        : { level: p.work === "full" ? "bad" : "warn", label: "Working", detail: "Daytime labs, studios or clinicals make steady work hours hard." },
    );
  }

  if (o.minGpa) {
    checks.push(
      p.gpa == null
        ? { level: "warn", label: "GPA", detail: `Admission needs about ${o.minGpa.toFixed(1)}. Add your GPA to check.` }
        : p.gpa >= o.minGpa
          ? { level: "ok", label: "GPA", detail: `Needs ~${o.minGpa.toFixed(1)}; you have ${p.gpa.toFixed(1)}.` }
          : p.gpa >= o.minGpa - 0.4
            ? { level: "warn", label: "GPA", detail: `Needs ~${o.minGpa.toFixed(1)}; you have ${p.gpa.toFixed(1)}. Very reachable at MDC first.` }
            : { level: "bad", label: "GPA", detail: `Needs ~${o.minGpa.toFixed(1)}; you have ${p.gpa.toFixed(1)}. Plan a semester to rebuild it.` },
    );
  }

  const score = checks.reduce((s, c) => s + POINTS[c.level], 0) / checks.length;
  return { score, checks };
}
