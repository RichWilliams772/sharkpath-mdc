/**
 * SharkPath shared data types — the contract between every branch.
 *
 *   Data (Tiger Data)  → returns Career / Program / Stage / Deadline rows in these shapes
 *   AI / Backend       → API routes return these shapes (validate with Zod)
 *   Frontend           → renders them
 *
 * Change this file together (post in Discord first) so nobody's branch breaks.
 */

// ─── Sources ────────────────────────────────────────────────────────────────
// Rule: every number shown to a student carries a source.

export interface Source {
  id: string;
  /** Short label shown in the chip, e.g. "BLS OOH" */
  label: string;
  /** Full citation shown on hover, e.g. "BLS Occupational Outlook Handbook, Architects" */
  title: string;
  url: string;
  /** Data period the figure describes, e.g. "May 2024" */
  asOf?: string;
  /** true once the Data team has checked it into Tiger Data */
  verified: boolean;
}

export interface Sourced<T = number> {
  value: T;
  /** e.g. "USD/yr", "%", "credits" */
  unit?: string;
  source: Source;
}

// ─── Careers & pathways ─────────────────────────────────────────────────────

/** Slug, e.g. "registered-nurse". Any career — not a fixed list. */
export type CareerId = string;

/** Florida's statewide meta-majors — every MDC program belongs to one. */
export type MetaMajorId =
  | "arts"
  | "business"
  | "education"
  | "health"
  | "industry"
  | "public-safety"
  | "stem"
  | "social";

/**
 * Where a career's data came from:
 *  - verified: checked by the Data team in Tiger Data
 *  - catalog:  seeded sample data, awaiting verification
 *  - ai:       generated on demand (Gemini via /api/careers/resolve, or the local fallback)
 */
export type CareerOrigin = "verified" | "catalog" | "ai";

/** The shape of the path after high school. */
export type CareerTrack = "as" | "transfer" | "graduate" | "certificate";

export type StageKind =
  | "start"
  | "mdc"
  | "transfer"
  | "graduate"
  | "training"
  | "certification"
  | "exam"
  | "career";

/** One stop on the pathway map (a node). */
export interface PathwayStage {
  id: string;
  kind: StageKind;
  title: string;
  subtitle?: string;
  /** Optional layout hint — the map computes columns from route order. */
  column?: number;
  /** Typical time in this stage, in years */
  years?: Sourced;
  /** One-time cost such as an exam fee, USD */
  fee?: Sourced;
  /** Can you work in the field while doing this stage? (AXP, EIT…) */
  earningWhileInStage?: boolean;
}

export interface PathwayRoute {
  id: string;
  label: string;
  /** Ordered stage ids: "start", the career's own stages, then `career-<id>` */
  stageIds: string[];
  /** Requires a bachelor's (transfer) before the career */
  requiresBachelors: boolean;
}

export interface Course {
  code: string;
  title: string;
  credits: number;
  category: "general-education" | "program-core" | "elective";
}

export interface Program {
  id: string;
  name: string;
  degree: "A.A." | "A.S." | "B.S." | "B.A.S.";
  school: string;
  totalCredits: Sourced;
  courses: Course[];
}

export interface License {
  name: string;
  body: string;
  url: string;
}

/**
 * A career and everything needed to plan it. Self-contained, so a career
 * generated on demand works everywhere a hand-verified one does.
 */
export interface Career {
  id: CareerId;
  title: string;
  summary: string;
  origin: CareerOrigin;
  metaMajor: MetaMajorId;
  track: CareerTrack;
  /** Extra search terms, e.g. ["rn", "nursing", "enfermera"] */
  aliases?: string[];
  /** Holland/RIASEC-style tags used by the quiz */
  traits: QuizTrait[];
  medianPay: Sourced;
  jobGrowth: Sourced;
  /** Early-career pay (e.g. BLS 25th percentile) */
  entryPay: Sourced;
  typicalEntryEducation: Sourced<string>;
  license?: License;
  /** The MDC program the path starts with */
  program: Program;
  /** The career's stages (excluding "start" and the career node itself) */
  stages: PathwayStage[];
  routes: PathwayRoute[];
}

// ─── Schools (any U.S. college) ────────────────────────────────────────────

/** Two-letter U.S. state / DC code, e.g. "FL" */
export type StateCode = string;

export interface School {
  id: string;
  name: string;
  /** Short label for chips and map nodes, e.g. "MDC", "UT Austin" */
  shortName: string;
  state: StateCode;
  city?: string;
  /** community = 2-year college (start here); university = 4-year (transfer or start) */
  kind: "community" | "university";
  /** Tuition & required fees per credit hour */
  tuitionPerCredit: { inState: Sourced; outOfState: Sourced };
  /** Typed in by the student ("my college isn't listed") — uses national averages */
  custom?: boolean;
}

export type Residency = "in-state" | "out-of-state";

/** The colleges a plan runs through, and whether the student pays in-state rates at each. */
export interface SchoolContext {
  start: School;
  transfer: School;
  homeState: StateCode;
  residency: { start: Residency; transfer: Residency };
}

// ─── What-if inputs & plan results ─────────────────────────────────────────

export interface WhatIfInputs {
  careerId: CareerId;
  routeId: string;
  creditsEarned: number;
  workHoursPerWeek: number;
  takeSummerClasses: boolean;
  pellEligible: boolean;
  brightFutures: boolean;
  livesAtHome: boolean;
  hasCertification: boolean;
  /** e.g. "spring-2027" */
  startTerm: string;
  /** Starting college (School id). Defaults to the demo school when missing. */
  schoolId?: string;
  /** Where the student transfers for a bachelor's (School id). Defaults to a public university in the same state. */
  transferSchoolId?: string;
  /** Student's home state (2-letter). In-state vs out-of-state tuition is worked out from this. */
  homeState?: StateCode;
  /** Share of the max Pell Grant expected, 0–1 (set by the money plan quiz; default 1 when pellEligible) */
  pellShare?: number;
  /** Share of tuition Bright Futures covers, 0–1 (FAS = 1, FMS = 0.75; default 1) */
  brightFuturesShare?: number;
}

// ─── Money plan (financial quiz) ───────────────────────────────────────────

export interface FinanceAnswers {
  /** Household income — the best quick proxy for Pell eligibility */
  income: "under30" | "30to60" | "60to100" | "over100" | "unsure";
  fafsa: "done" | "planning" | "unknown";
  brightFutures: "fas" | "fms" | "none";
  housing: "family" | "own";
  /** Work hours per week during school */
  work: 0 | 10 | 20 | 30;
  /** Family help per school year, USD */
  family: 0 | 1500 | 3500 | 6000;
  /** Savings available now, USD */
  savings: 0 | 500 | 3000 | 6000;
  loans: "no" | "federal" | "yes";
  scholarships: "yes" | "maybe" | "no";
}

export type FundingKind = "grant" | "scholarship" | "family" | "savings" | "work" | "loan";

export interface FundingLine {
  kind: FundingKind;
  label: string;
  amount: number;
  source: Source;
}

export interface FinanceAction {
  id: string;
  title: string;
  detail: string;
  /** ISO date, when there's a real deadline */
  due?: string;
  amount?: number;
  /** Values for {placeholders} in title/detail, e.g. { school: "MDC", aid: "Cal Grant" } */
  vars?: Record<string, string>;
}

export interface FinancePlan {
  answers: FinanceAnswers;
  yearsInSchool: number;
  /** Full cost before any help */
  totalCost: number;
  /** Ordered: grants first, loans last. Sums to totalCost minus any gap. */
  funding: FundingLine[];
  covered: number;
  /** > 0 = still short; < 0 = money to spare */
  gap: number;
  monthly: { cost: number; income: number };
  loanPayment: { total: number; monthly: number; shareOfPay: number } | null;
  actions: FinanceAction[];
}

export interface SemesterPlan {
  term: string;
  label: string;
  school: string;
  credits: number;
  courses: Course[];
}

export interface TimelineSegment {
  stageId: string;
  label: string;
  startYear: number;
  years: number;
  earning: boolean;
}

export interface CostLine {
  label: string;
  amount: number;
  source: Source;
}

export interface RoiPoint {
  year: number;
  /** cumulative earnings minus costs, this pathway */
  pathway: number;
  /** cumulative earnings, no-degree baseline */
  baseline: number;
}

export interface PlanResult {
  inputs: WhatIfInputs;
  creditsPerTerm: number;
  semesters: SemesterPlan[];
  timeline: TimelineSegment[];
  yearsToCareer: number;
  /** Years paying tuition (MDC + transfer + graduate) */
  schoolYears: number;
  costs: CostLine[];
  aid: CostLine[];
  totalCost: number;
  netCost: number;
  startingPay: Sourced;
  breakEvenYear: number | null;
  roi: RoiPoint[];
  assumptions: { text: string; source: Source }[];
}

// ─── Deadlines ──────────────────────────────────────────────────────────────

export interface Deadline {
  id: string;
  /** ISO date, YYYY-MM-DD */
  date: string;
  title: string;
  description: string;
  category: "financial-aid" | "admissions" | "registration" | "exam" | "scholarship";
  /** Empty = relevant to every career */
  careerIds: CareerId[];
  source: Source;
}

// ─── Quiz ───────────────────────────────────────────────────────────────────

export type QuizTrait =
  | "building"
  | "designing"
  | "analyzing"
  | "helping"
  | "creating"
  | "organizing"
  | "hands-on"
  | "tech";

export interface QuizQuestion {
  id: string;
  prompt: string;
  /** `tracks` nudges results toward a preferred path length (school-length question) */
  options: { id: string; label: string; traits: QuizTrait[]; tracks?: CareerTrack[] }[];
}

export interface QuizResult {
  ranked: { careerId: CareerId; score: number }[];
  traits: Record<QuizTrait, number>;
  /** Filled by Gemini: more careers to explore (each can be resolved into a full path) */
  aiSuggestions?: { title: string; why: string }[];
}

// ─── AI counselor (Gemini chat + Swarms team) ──────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Verified facts the answer relied on — rendered with source chips */
  facts?: { label: string; value: string; source: Source }[];
  /** true when the answer goes beyond verified data */
  extended?: boolean;
  /** A career the student can jump straight into planning */
  suggestedCareer?: Career;
}

export type AgentRole = "career" | "education" | "finance" | "licensing" | "coordinator";

export interface AgentReport {
  role: AgentRole;
  status: "idle" | "thinking" | "done" | "error";
  headline: string;
  points: string[];
}

export interface CounselorTeamResult {
  agents: AgentReport[];
}

// ─── Accounts & saved plans ─────────────────────────────────────────────────

export interface StudentProfile {
  name: string;
  goal: "transfer" | "workforce" | "exploring";
  language: "en" | "es";
}

export interface SavedPlan {
  id: string;
  name: string;
  /** Auth0 user id (`sub`), or "guest" */
  ownerId: string;
  createdAt: string;
  inputs: WhatIfInputs;
  /** Included for AI-generated careers so the plan opens on any device */
  career?: Career;
  summary: { yearsToCareer: number; netCost: number; breakEvenYear: number | null };
}
