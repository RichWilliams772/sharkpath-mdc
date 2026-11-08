// The 5 core careers, hand-built with specific MDC courses and stages. Every
// other career comes from the catalog (src/data/catalog.ts) or is generated on
// demand (src/lib/careers/).
// ⚠️ SAMPLE DATA — replaced by rows from our Tiger Data SQL database.

import type { Career, PathwayStage, Sourced, Source } from "@/types/roadmap";
import { programById } from "./programs";
import { SOURCES as S } from "./sources";

type CoreSpec = Omit<Career, "program" | "stages" | "origin"> & { programId: string };

const n = (value: number, unit: string, source: Source): Sourced => ({ value, unit, source });
const t = (value: string, source: Source): Sourced<string> => ({ value, source });

/** Early-career pay placeholder: 75% of BLS median, flagged as an estimate. */
const entry = (median: number) => n(Math.round((median * 0.75) / 100) * 100, "USD/yr", S.sharkpathEstimate);

const SPECS: CoreSpec[] = [
  {
    id: "architect",
    aliases: ["architecture", "arquitecto", "arquitecta"],
    metaMajor: "arts",
    track: "transfer",
    title: "Architect",
    summary: "Design buildings and spaces — from Miami high-rises to hurricane-ready homes.",
    traits: ["designing", "creating", "building"],
    medianPay: n(93310, "USD/yr", S.blsArchitects),
    jobGrowth: n(8, "% (2023–33)", S.blsArchitects),
    entryPay: entry(93310),
    typicalEntryEducation: t("Bachelor's or Master's (NAAB-accredited)", S.blsArchitects),
    license: { name: "Registered Architect (AXP + ARE)", body: "NCARB", url: S.ncarbAre.url },
    programId: "mdc-aa-architecture",
    routes: [
      {
        id: "architect-transfer",
        label: "A.A. → FIU Architecture → License",
        stageIds: ["start", "mdc-aa-architecture", "fiu-architecture", "ncarb", "career-architect"],
        requiresBachelors: true,
      },
    ],
  },
  {
    id: "civil-engineer",
    aliases: ["civil engineering", "structural engineer", "ingeniero civil"],
    metaMajor: "stem",
    track: "transfer",
    title: "Civil Engineer",
    summary: "Plan the roads, bridges, seawalls and water systems a growing city needs.",
    traits: ["building", "analyzing", "hands-on"],
    medianPay: n(95890, "USD/yr", S.blsCivil),
    jobGrowth: n(6, "% (2023–33)", S.blsCivil),
    entryPay: entry(95890),
    typicalEntryEducation: t("Bachelor's degree", S.blsCivil),
    license: { name: "Professional Engineer (FE → EIT → PE)", body: "NCEES", url: S.nceesPe.url },
    programId: "mdc-aa-engineering",
    routes: [
      {
        id: "civil-transfer",
        label: "A.A. → FIU B.S. Civil → FE → PE",
        stageIds: ["start", "mdc-aa-engineering", "fiu-civil", "ncees-fe", "ncees-pe", "career-civil-engineer"],
        requiresBachelors: true,
      },
    ],
  },
  {
    id: "cybersecurity-analyst",
    aliases: ["cybersecurity", "cyber security", "security analyst", "ethical hacker", "ciberseguridad"],
    metaMajor: "stem",
    track: "as",
    title: "Cybersecurity Analyst",
    summary: "Defend networks and data from attackers — one of the fastest-growing jobs anywhere.",
    traits: ["tech", "analyzing", "organizing"],
    medianPay: n(120360, "USD/yr", S.blsInfosec),
    jobGrowth: n(33, "% (2023–33)", S.blsInfosec),
    entryPay: entry(120360),
    typicalEntryEducation: t("Bachelor's degree", S.blsInfosec),
    license: { name: "CompTIA Security+", body: "CompTIA", url: S.comptiaSecurityPlus.url },
    programId: "mdc-as-cybersecurity",
    routes: [
      {
        id: "cyber-direct",
        label: "A.S. → Security+ → Work",
        stageIds: ["start", "mdc-as-cybersecurity", "cert-security-plus", "career-cybersecurity-analyst"],
        requiresBachelors: false,
      },
      {
        id: "cyber-bachelors",
        label: "A.S. → MDC B.S. Cybersecurity → Security+",
        stageIds: ["start", "mdc-as-cybersecurity", "mdc-bs-cybersecurity", "cert-security-plus", "career-cybersecurity-analyst"],
        requiresBachelors: true,
      },
    ],
  },
  {
    id: "chef",
    aliases: ["cook", "culinary", "cocinero", "cocinera"],
    metaMajor: "business",
    track: "as",
    title: "Chef",
    summary: "Run a kitchen, create menus and lead a team in Miami's food scene.",
    traits: ["creating", "hands-on", "organizing"],
    medianPay: n(58920, "USD/yr", S.blsChefs),
    jobGrowth: n(8, "% (2023–33)", S.blsChefs),
    entryPay: entry(58920),
    typicalEntryEducation: t("High school diploma + culinary training", S.blsChefs),
    license: { name: "ServSafe Manager + ACF Certified Culinarian", body: "ServSafe / ACF", url: S.acf.url },
    programId: "mdc-as-culinary",
    routes: [
      {
        id: "chef-direct",
        label: "A.S. Culinary → ServSafe → ACF",
        stageIds: ["start", "mdc-as-culinary", "cert-servsafe", "acf-cc", "career-chef"],
        requiresBachelors: false,
      },
    ],
  },
  {
    id: "software-developer",
    aliases: ["programmer", "coder", "coding", "software engineer", "programador"],
    metaMajor: "stem",
    track: "as",
    title: "Software Developer",
    summary: "Build the apps, websites and AI tools people use every day.",
    traits: ["tech", "creating", "analyzing"],
    medianPay: n(132270, "USD/yr", S.blsSoftware),
    jobGrowth: n(17, "% (2023–33)", S.blsSoftware),
    entryPay: entry(132270),
    typicalEntryEducation: t("Bachelor's degree", S.blsSoftware),
    programId: "mdc-as-programming",
    routes: [
      {
        id: "software-direct",
        label: "A.S. → Work (portfolio route)",
        stageIds: ["start", "mdc-as-programming", "career-software-developer"],
        requiresBachelors: false,
      },
      {
        id: "software-transfer",
        label: "A.S. → FIU B.S. Computer Science",
        stageIds: ["start", "mdc-as-programming", "fiu-cs", "career-software-developer"],
        requiresBachelors: true,
      },
    ],
  },
];

const STAGES: PathwayStage[] = [
  { id: "mdc-aa-architecture", kind: "mdc", title: "A.A. · Pre-Architecture", subtitle: "MDC · 60 credits", column: 1, years: n(2, "yrs", S.mdcCatalog) },
  { id: "mdc-aa-engineering", kind: "mdc", title: "A.A. · Pre-Engineering", subtitle: "MDC · 60 credits", column: 1, years: n(2, "yrs", S.mdcCatalog) },
  { id: "mdc-as-cybersecurity", kind: "mdc", title: "A.S. · Cybersecurity", subtitle: "MDC · 60 credits", column: 1, years: n(2, "yrs", S.mdcCatalog) },
  { id: "mdc-as-culinary", kind: "mdc", title: "A.S. · Culinary Arts", subtitle: "MDC · Culinary Institute", column: 1, years: n(2, "yrs", S.mdcCatalog) },
  { id: "mdc-as-programming", kind: "mdc", title: "A.S. · Programming", subtitle: "MDC · 60 credits", column: 1, years: n(2, "yrs", S.mdcCatalog) },

  { id: "fiu-architecture", kind: "transfer", title: "B.A. + M.Arch", subtitle: "FIU · 2+2 transfer", column: 2, years: n(4, "yrs", S.floridaTwoPlusTwo) },
  { id: "fiu-civil", kind: "transfer", title: "B.S. Civil Engineering", subtitle: "FIU · or UF / FAU", column: 2, years: n(2.5, "yrs", S.floridaTwoPlusTwo) },
  { id: "mdc-bs-cybersecurity", kind: "transfer", title: "B.S. Cybersecurity", subtitle: "Stay at MDC", column: 2, years: n(2, "yrs", S.mdcCatalog) },
  { id: "fiu-cs", kind: "transfer", title: "B.S. Computer Science", subtitle: "FIU · A.S. → B.S.", column: 2, years: n(2, "yrs", S.floridaTwoPlusTwo) },
  { id: "cert-servsafe", kind: "certification", title: "ServSafe Manager", subtitle: "Food safety cert", column: 2, years: n(0.1, "yrs", S.servSafe), fee: n(179, "USD", S.servSafe) },

  { id: "cert-security-plus", kind: "certification", title: "CompTIA Security+", subtitle: "Industry cert", column: 3, years: n(0.25, "yrs", S.comptiaSecurityPlus), fee: n(404, "USD", S.comptiaSecurityPlus) },
  { id: "ncarb", kind: "exam", title: "AXP + ARE exams", subtitle: "NCARB · work + 6 exams", column: 3, years: n(3, "yrs", S.ncarbAre), fee: n(1410, "USD", S.ncarbAre), earningWhileInStage: true },
  { id: "ncees-fe", kind: "exam", title: "FE exam → EIT", subtitle: "NCEES", column: 3, years: n(0.25, "yrs", S.nceesFe), fee: n(175, "USD", S.nceesFe) },
  { id: "acf-cc", kind: "certification", title: "ACF Culinarian", subtitle: "While working", column: 3, years: n(1, "yrs", S.acf), earningWhileInStage: true },
  { id: "ncees-pe", kind: "exam", title: "PE license", subtitle: "NCEES · 4 yrs work", column: 4, years: n(4, "yrs", S.nceesPe), fee: n(400, "USD", S.nceesPe), earningWhileInStage: true },

];

// origin "catalog" = sample data. Switch to "verified" once Tiger Data confirms them.
export const CORE: Career[] = SPECS.map(({ programId, ...spec }) => ({
  ...spec,
  origin: "catalog",
  program: programById(programId),
  stages: STAGES.filter((st) => spec.routes.some((r) => r.stageIds.includes(st.id))),
}));
