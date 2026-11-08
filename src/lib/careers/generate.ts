// Builds a complete, plannable Career (MDC program → stages → routes) from a
// short spec. Used by the seeded catalog AND as the local fallback when the
// AI team's /api/careers/resolve isn't live, so *any* career can be planned.

import { GEN_ED_AA, GEN_ED_AS, META_MAJORS, course, metaMajorById } from "@/data/meta-majors";
import { SOURCES as S } from "@/data/sources";
import type {
  Career,
  CareerOrigin,
  CareerTrack,
  Course,
  MetaMajorId,
  PathwayRoute,
  PathwayStage,
  QuizTrait,
  Source,
  Sourced,
} from "@/types/roadmap";

export interface CareerSpec {
  id?: string;
  title: string;
  metaMajor: MetaMajorId;
  track: CareerTrack;
  origin: CareerOrigin;
  summary?: string;
  aliases?: string[];
  traits?: QuizTrait[];
  /** MDC program name, e.g. "Nursing (R.N.)" */
  programName?: string;
  /** Bachelor's after the A.A., e.g. "B.S. Accounting" */
  bachelor?: string;
  graduate?: { title: string; years: number };
  /** Residency / apprenticeship / academy — `earning` if paid */
  training?: { title: string; years: number; earning: boolean };
  license?: { name: string; body: string; url?: string; fee?: number; years?: number; earning?: boolean; kind?: "exam" | "certification" };
  /** Optional bachelor's route for A.S. careers, e.g. "B.S.N. at MDC" */
  bachelorsOption?: string;
  medianPay?: number;
  jobGrowth?: number;
  entryEducation?: string;
  /** Source for pay/growth (defaults to BLS OOH for catalog, AI estimate for ai) */
  source?: Source;
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "career";

const n = (value: number, unit: string, source: Source): Sourced => ({ value, unit, source });

export const blsSource = (title: string): Source => ({
  id: `bls-${slugify(title)}`,
  label: "BLS OOH",
  title: `BLS Occupational Outlook Handbook — ${title}`,
  url: "https://www.bls.gov/ooh/",
  asOf: "May 2023",
  verified: false,
});

const ENTRY_EDUCATION: Record<CareerTrack, string> = {
  certificate: "Postsecondary certificate",
  as: "Associate degree",
  transfer: "Bachelor's degree",
  graduate: "Graduate or professional degree",
};

/** Interleave gen-ed and core so each semester mixes both. */
function interleave(a: Course[], b: Course[]) {
  const out: Course[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

function fill(courses: Course[], target: number, title: string, code: string, category: Course["category"]) {
  const seen = new Set<string>();
  const out = courses.filter((c) => !seen.has(c.code) && seen.add(c.code));
  let total = out.reduce((a, c) => a + c.credits, 0);
  // Trim if the pools overshoot the target.
  while (total > target && out.length) total -= out.pop()!.credits;
  let i = 1;
  while (total < target) {
    const credits = Math.min(3, target - total);
    out.push(course(`${code}${i}`, `${title} ${i}`, credits, category));
    total += credits;
    i++;
  }
  return out;
}

/** The MDC program for a spec. Exported so core careers can reuse the same course pools. */
export function buildProgram(spec: CareerSpec, id: string) {
  const mm = metaMajorById(spec.metaMajor);
  const name = spec.programName ?? `${mm.label} pathway`;
  if (spec.track === "as") {
    return {
      id: `mdc-as-${id}`,
      name: `Associate in Science · ${name}`,
      degree: "A.S." as const,
      school: "Miami Dade College",
      totalCredits: n(60, "credits", S.mdcCatalog),
      courses: fill(interleave(GEN_ED_AS, mm.core), 60, `${name} — program course`, "CORE", "program-core"),
    };
  }
  if (spec.track === "certificate") {
    return {
      id: `mdc-cert-${id}`,
      name: `Career Certificate · ${name}`,
      degree: "A.S." as const,
      school: "Miami Dade College",
      totalCredits: n(30, "credits", S.mdcCatalog),
      courses: fill(mm.core, 30, `${name} — lab / clinical`, "LAB", "program-core"),
    };
  }
  return {
    id: `mdc-aa-${spec.metaMajor}`,
    name: `Associate in Arts · ${mm.label}`,
    degree: "A.A." as const,
    school: "Miami Dade College",
    totalCredits: n(60, "credits", S.mdcCatalog),
    courses: fill(interleave(GEN_ED_AA, mm.prereqs), 60, "Transfer major elective", "ELEC", "elective"),
  };
}

export function buildCareer(spec: CareerSpec): Career {
  const id = spec.id ?? slugify(spec.title);
  const mm = metaMajorById(spec.metaMajor);
  const program = buildProgram(spec, id);
  const careerNode = `career-${id}`;
  const stages: PathwayStage[] = [];
  const add = (s: PathwayStage) => (stages.push(s), s.id);

  const mdcId = add({
    id: program.id,
    kind: "mdc",
    title: spec.track === "certificate" ? `Certificate · ${spec.programName ?? mm.label}` : spec.track === "as" ? `A.S. · ${spec.programName ?? mm.label}` : `A.A. · ${mm.label}`,
    subtitle: `MDC · ${program.totalCredits.value} credits`,
    years: n(spec.track === "certificate" ? 1 : 2, "yrs", S.mdcCatalog),
  });

  const main: string[] = ["start", mdcId];
  if (spec.track === "transfer" || spec.track === "graduate") {
    main.push(add({ id: `bachelor-${id}`, kind: "transfer", title: spec.bachelor ?? `Bachelor's · ${mm.label}`, subtitle: "FIU · FAU · UF via 2+2", years: n(2, "yrs", S.floridaTwoPlusTwo) }));
  }
  if (spec.graduate) {
    main.push(add({ id: `grad-${id}`, kind: "graduate", title: spec.graduate.title, subtitle: "Graduate / professional school", years: n(spec.graduate.years, "yrs", S.sharkpathEstimate) }));
  }
  const trainingId = spec.training
    ? add({ id: `train-${id}`, kind: "training", title: spec.training.title, subtitle: spec.training.earning ? "Paid training" : "Training", years: n(spec.training.years, "yrs", S.sharkpathEstimate), earningWhileInStage: spec.training.earning })
    : undefined;
  let licenseId: string | undefined;
  if (spec.license) {
    const src: Source = { ...S.sharkpathEstimate, id: `lic-${id}`, label: spec.license.body, title: `${spec.license.body} — ${spec.license.name}`, url: spec.license.url ?? S.sharkpathEstimate.url };
    licenseId = add({
      id: `lic-${id}`,
      kind: spec.license.kind ?? "exam",
      title: spec.license.name,
      subtitle: spec.license.body,
      years: n(spec.license.years ?? 0.25, "yrs", src),
      fee: spec.license.fee ? n(spec.license.fee, "USD", src) : undefined,
      earningWhileInStage: spec.license.earning,
    });
  }
  // Graduate paths license before residency (e.g. USMLE → residency);
  // trades license after the apprenticeship.
  const tail = spec.graduate ? [licenseId, trainingId] : [trainingId, licenseId];
  for (const s of tail) if (s) main.push(s);
  main.push(careerNode);

  const tailLabels = spec.graduate ? [spec.license?.name, spec.training?.title] : [spec.training?.title, spec.license?.name];
  const routes: PathwayRoute[] = [
    {
      id: `${id}-main`,
      label: [program.degree === "A.A." ? "A.A." : spec.track === "certificate" ? "Certificate" : "A.S.", spec.bachelor && "Bachelor's", spec.graduate?.title, ...tailLabels]
        .filter(Boolean)
        .join(" → "),
      stageIds: main,
      requiresBachelors: spec.track === "transfer" || spec.track === "graduate",
    },
  ];
  if (spec.bachelorsOption) {
    const bas = add({ id: `bas-${id}`, kind: "transfer", title: spec.bachelorsOption, subtitle: "Bachelor's while working", years: n(2, "yrs", S.mdcCatalog) });
    routes.push({
      id: `${id}-bachelors`,
      label: `A.S. → ${spec.bachelorsOption}${spec.license ? ` → ${spec.license.name}` : ""}`,
      stageIds: ["start", mdcId, bas, ...(licenseId ? [licenseId] : []), careerNode],
      requiresBachelors: true,
    });
  }

  const ai = spec.origin === "ai";
  const paySource = spec.source ?? (ai ? S.aiEstimate : blsSource(spec.title));
  const factor = { certificate: 0.85, as: 1, transfer: 1.1, graduate: 1.5 }[spec.track];
  const median = spec.medianPay ?? Math.round((mm.placeholderPay * factor) / 1000) * 1000;

  return {
    id,
    title: spec.title,
    summary: spec.summary ?? `A ${mm.label} career. SharkPath mapped it through MDC’s ${program.name.split(" · ")[1]}.`,
    origin: spec.origin,
    metaMajor: spec.metaMajor,
    track: spec.track,
    aliases: spec.aliases,
    traits: spec.traits ?? mm.traits,
    medianPay: n(median, "USD/yr", paySource),
    jobGrowth: n(spec.jobGrowth ?? 5, "% (2023–33)", spec.jobGrowth === undefined ? S.aiEstimate : paySource),
    entryPay: n(Math.round((median * 0.75) / 100) * 100, "USD/yr", ai ? S.aiEstimate : S.sharkpathEstimate),
    typicalEntryEducation: { value: spec.entryEducation ?? ENTRY_EDUCATION[spec.track], source: paySource },
    license: spec.license ? { name: spec.license.name, body: spec.license.body, url: spec.license.url ?? S.sharkpathEstimate.url } : undefined,
    program,
    stages,
    routes,
  };
}

// ── Classifying a free-text career ────────────────────────────────────────

const GRADUATE: [RegExp, { title: string; years: number }, CareerSpec["training"]?][] = [
  [/doctor|physician|surgeon|pediatric|cardiolog|dermatolog|psychiatr|médic/, { title: "M.D. / D.O.", years: 4 }, { title: "Residency", years: 3, earning: true }],
  [/dentist/, { title: "D.D.S. / D.M.D.", years: 4 }],
  [/pharmacist/, { title: "Pharm.D.", years: 4 }],
  [/veterinar/, { title: "D.V.M.", years: 4 }],
  [/lawyer|attorney|judge|abogad/, { title: "J.D. (law school)", years: 3 }],
  [/psycholog|psicólog/, { title: "Ph.D. / Psy.D.", years: 5 }],
  [/professor|researcher|research scientist/, { title: "Ph.D.", years: 5 }],
  [/physical therapist(?! assistant)/, { title: "Doctor of Physical Therapy", years: 3 }],
  [/occupational therapist(?! assistant)/, { title: "Master's in Occupational Therapy", years: 2 }],
  [/physician assistant/, { title: "Master's in PA Studies", years: 2.5 }],
  [/nurse practitioner|nurse anesthetist/, { title: "M.S.N. / D.N.P.", years: 2.5 }],
  [/optometrist/, { title: "O.D.", years: 4 }],
];

const CERTIFICATE = /electrician|plumb|hvac|weld|police|officer|sheriff|firefight|paramedic|\bemt\b|cosmetolog|barber|truck|mechanic|carpent|massage|phlebotom|medical assistant|dental assistant|pharmacy tech|bombero|policía/;
const ASSOCIATE = /\bnurse\b|\brn\b|registered nurse|hygienist|assistant|technolog|technician|paralegal|chef|cook|culinar|graphic|web develop|pilot|sonograph|respiratory|radiograph|enfermer/;

const LICENSES: [RegExp, NonNullable<CareerSpec["license"]>][] = [
  [/nurse|enfermer/, { name: "NCLEX license", body: "Florida Board of Nursing", fee: 200 }],
  [/lawyer|attorney|abogad/, { name: "Florida Bar exam", body: "Florida Board of Bar Examiners", fee: 1000 }],
  [/engineer|ingenier/, { name: "FE → PE license", body: "NCEES", fee: 575, years: 4, earning: true }],
  [/teacher|maestr|educat/, { name: "Florida teacher certification (FTCE)", body: "FL Dept. of Education", fee: 200 }],
  [/accountant|cpa|contador/, { name: "CPA exam", body: "FL Board of Accountancy", fee: 1000, years: 1, earning: true }],
  [/electrician/, { name: "Journeyman license", body: "FL DBPR", years: 4, earning: true }],
  [/police|officer|sheriff|policía/, { name: "State Officer Certification Exam", body: "FDLE", fee: 100 }],
  [/firefight|bombero/, { name: "Firefighter certification", body: "FL State Fire Marshal" }],
  [/paramedic|\bemt\b/, { name: "NREMT certification", body: "NREMT", fee: 160 }],
  [/pharmacist/, { name: "NAPLEX", body: "NABP", fee: 520 }],
  [/doctor|physician|surgeon|médic/, { name: "USMLE / COMLEX", body: "FSMB / NBOME", fee: 2000 }],
  [/psycholog|psicólog/, { name: "EPPP license", body: "ASPPB", fee: 700, years: 1, earning: true }],
  [/dentist/, { name: "Dental licensure exam", body: "FL Board of Dentistry", fee: 600 }],
  [/real estate/, { name: "Real estate license", body: "FL DBPR", fee: 90, kind: "certification" }],
];

// Capitalize each word (accent-safe: \b treats "é" as a word break).
const titleCase = (s: string) =>
  s
    .split(/(\s+|-)/)
    .map((w) => (w.trim() && w !== "-" ? w.charAt(0).toLocaleUpperCase() + w.slice(1) : w))
    .join("");
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Best-guess spec for any career a student types (local fallback for the AI). */
export function classifyCareer(query: string): CareerSpec {
  const title = titleCase(query.trim().replace(/\s+/g, " ").replace(/^(a|an|un|una)\s+/i, ""));
  const q = ` ${fold(title)} `;
  const metaMajor =
    META_MAJORS.map((m) => ({ id: m.id, hits: m.keywords.filter((k) => q.includes(fold(k))).length }))
      .sort((a, b) => b.hits - a.hits)
      .find((m) => m.hits > 0)?.id ?? "social";
  // Patterns are matched against the accent-folded text too ("médico" → "medico").
  const test = (re: RegExp) => re.test(q) || re.test(` ${title.toLowerCase()} `);
  const grad = GRADUATE.find(([re]) => test(re));
  const track: CareerTrack = grad ? "graduate" : test(CERTIFICATE) ? "certificate" : test(ASSOCIATE) ? "as" : "transfer";
  return {
    title,
    metaMajor,
    track,
    origin: "ai",
    programName: track === "as" || track === "certificate" ? title.replace(/\b(Assistant|Technician|Technologist)\b/i, "").trim() || title : undefined,
    bachelor: track === "transfer" || track === "graduate" ? `Bachelor's · ${title} prep` : undefined,
    graduate: grad?.[1],
    training: grad?.[2],
    license: LICENSES.find(([re]) => test(re))?.[1],
  };
}
