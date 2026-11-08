import type { FactorKey, PathOption, Weights } from "./types";

export const DEFAULT_WEIGHTS: Weights = { relevancy: 40, cost: 30, difficulty: 20, time: 10 };

export const FACTORS: { key: FactorKey; label: string; hint: string }[] = [
  { key: "relevancy", label: "Job relevancy", hint: "Demand for this credential in the field" },
  { key: "cost", label: "Cost", hint: "Lower total cost scores higher" },
  { key: "difficulty", label: "Difficulty", hint: "Easier routes score higher" },
  { key: "time", label: "Time", hint: "Faster routes score higher" },
];

/** Rescale weights so they always sum to 100. */
export function normalize(w: Weights): Weights {
  const sum = w.relevancy + w.cost + w.difficulty + w.time || 1;
  return {
    relevancy: (w.relevancy / sum) * 100,
    cost: (w.cost / sum) * 100,
    difficulty: (w.difficulty / sum) * 100,
    time: (w.time / sum) * 100,
  };
}

// Cost and time are scored relative to the other routes for the same career,
// since "cheap" for a chef and "cheap" for an architect are very different numbers.
const relative = (v: number, lo: number, hi: number) => (hi === lo ? 100 : ((hi - v) / (hi - lo)) * 100);

export type Scored = PathOption & { score: number; parts: Record<FactorKey, number> };

export function scoreOptions(options: PathOption[], weights: Weights): Scored[] {
  const w = normalize(weights);
  const costs = options.map((o) => o.metrics.costUSD);
  const years = options.map((o) => o.metrics.years);
  const [cLo, cHi, yLo, yHi] = [Math.min(...costs), Math.max(...costs), Math.min(...years), Math.max(...years)];

  return options
    .map((o) => {
      const parts = {
        relevancy: Math.max(0, Math.min(100, o.metrics.relevancy)),
        cost: relative(o.metrics.costUSD, cLo, cHi),
        difficulty: ((10 - o.metrics.difficulty) / 9) * 100,
        time: relative(o.metrics.years, yLo, yHi),
      };
      const score = (Object.keys(parts) as FactorKey[]).reduce((s, k) => s + (parts[k] * w[k]) / 100, 0);
      return { ...o, score, parts };
    })
    .sort((a, b) => b.score - a.score);
}

/** The guides split when the top two routes are this close. */
export const SPLIT_MARGIN = 6;

export const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
