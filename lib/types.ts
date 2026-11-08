export type FactorKey = "relevancy" | "cost" | "difficulty" | "time";
export type Weights = Record<FactorKey, number>;

export type Step = {
  stage: string; // e.g. "A.S. in Computer Engineering Technology"
  institution: string;
  duration: string; // human readable, e.g. "2 years" or "Fall 2027 – Spring 2028"
  costUSD: number;
  detail: string;
};

export type Metrics = {
  costUSD: number; // total out-of-pocket estimate for the whole route, before aid
  relevancy: number; // 0–100, job-market demand for this route's credential
  difficulty: number; // 1–10
  years: number; // time until working in the career
};

/** Real pay for the job a route lands in — BLS Occupational Employment and Wage Statistics. */
export type Wages = {
  soc: string; // e.g. "17-2141"
  year?: string;
  nationalMedian?: number;
  national25?: number; // 25th percentile: a reasonable proxy for early-career pay
  miamiMedian?: number; // Miami–Fort Lauderdale–West Palm Beach metro
};

export type PathOption = {
  id: string;
  title: string;
  summary: string;
  kind?: string; // e.g. "Transfer", "Workforce A.S.", "Apprenticeship", "Military", "Online"
  landsAs?: string; // the job title this route gets you hired as first
  soc?: string; // SOC code for landsAs, used for the BLS lookup
  weeklyHours?: number; // study + class hours per week while in the route
  workFriendly?: boolean; // realistic to hold a part-time job alongside it
  minGpa?: number | null; // admission GPA threshold anywhere along the route
  metrics: Metrics;
  steps: Step[]; // milestones; full term-by-term detail comes from RouteDetail
  wages?: Wages;
};

export type Roadmap = {
  career: string;
  college: string;
  options: PathOption[];
  source: "llm" | "demo" | "cache" | "seed";
  outlook?: { growthPct: number; summary: string }; // AI estimate, labeled in the UI
  note?: string;
};

export type RouteDetail = {
  timeline: Step[]; // term-by-term or phase-by-phase
  costs: { tuition: number; booksFees: number; living: number; aidEstimate: number; aidNote: string };
  requirements: string[];
  risks: string[];
  nextActions: string[];
  dayInLife: string;
  source: "llm" | "demo" | "cache" | "seed";
};

export type Profile = {
  budgetPerYear: number; // USD the student can put toward school each year
  hoursPerWeek: number; // available for class + study
  work: "none" | "part" | "full";
  gpa: number | null;
};

export type Voice = "sonar" | "tide";
export type GuideLine = { voice: Voice; text: string };
export type GuideReply = {
  stance: "agree" | "split";
  lines: GuideLine[];
  picks?: Partial<Record<Voice, string>>; // option id each voice argues for when split
  source: "llm" | "demo";
};

export type LlmProvider = "gemini" | "anthropic" | "openai";
export type LlmPref = { provider: LlmProvider; apiKey?: string; model?: string };
