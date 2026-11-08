// The 7 core careers (the 5 originals + Mechanical Engineer and IT Consultant), hand-built with specific MDC courses and stages. Every
// other career comes from the catalog (src/data/catalog.ts) or is generated on
// demand (src/lib/careers/).
// ⚠️ SAMPLE DATA — replaced by rows from our Tiger Data SQL database.

import type { Career, PathwayStage, Sourced, Source } from "@/types/roadmap";
import { programById } from "./programs";
import { SOURCES as S } from "./sources";

type CoreSpec = Omit<Career, "program" | "stages" | "origin"> & { programId: string };

const n = (value: number, unit: string, source: Source): Sourced => ({ value, unit, source });
const t = (value: string, source: Source): Sourced<string> => ({ value, source });

/** Early-career pay placeholder: 75% of the May 2023 BLS median, flagged as an estimate.
 *  Pass the OLD median: entry pay stays as-is until it has its own official source. */
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
    medianPay: n(99280, "USD/yr", S.blsArchitects),
    jobGrowth: n(4, "% (2025–35)", S.blsArchitects),
    entryPay: entry(93310),
    typicalEntryEducation: t("Bachelor's degree", S.blsArchitects),
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
    medianPay: n(100840, "USD/yr", S.blsCivil),
    jobGrowth: n(6, "% (2025–35)", S.blsCivil),
    entryPay: entry(95890),
    typicalEntryEducation: t("Bachelor's degree", S.blsCivil),
    license: { name: "Professional Engineer (FE → EIT → PE)", body: "NCEES", url: S.nceesPe.url },
    programId: "mdc-aa-engineering",
    routes: [
      {
        id: "civil-transfer",
        label: "A.A. → FIU B.S. Civil → Work · FE → PE later",
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
    medianPay: n(129180, "USD/yr", S.blsInfosec),
    jobGrowth: n(21, "% (2025–35)", S.blsInfosec),
    entryPay: entry(120360),
    typicalEntryEducation: t("Bachelor's degree", S.blsInfosec),
    license: { name: "CompTIA Security+", body: "CompTIA", url: S.comptiaSecurityPlus.url },
    programId: "mdc-as-cybersecurity",
    notes: [
      {
        text: "CompTIA Security+ V8 is expected to launch on or around November 17, 2026. Check which exam version to study for.",
        source: S.comptiaSecurityPlusV8,
      },
    ],
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
    medianPay: n(62470, "USD/yr", S.blsChefs),
    jobGrowth: n(7, "% (2025–35)", S.blsChefs),
    entryPay: entry(58920),
    typicalEntryEducation: t("High school diploma or equivalent", S.blsChefs),
    license: { name: "ServSafe Manager + ACF Certified Culinarian", body: "ServSafe / ACF", url: S.acf.url },
    programId: "mdc-as-culinary",
    notes: [
      { text: "Chefs and head cooks typically need 5 years or more of work experience in a related occupation.", source: S.blsChefs },
    ],
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
    medianPay: n(135980, "USD/yr", S.blsSoftware),
    jobGrowth: n(10, "% (2025–35)", S.blsSoftware),
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
  {
    id: "mechanical-engineer",
    aliases: ["engineer", "mechanical", "mechanical engineering", "ingeniero mecánico"],
    metaMajor: "stem",
    track: "transfer",
    title: "Mechanical Engineer",
    summary: "Design machines, engines and devices — from AC units to rockets.",
    traits: ["building", "analyzing", "tech"],
    medianPay: n(104110, "USD/yr", S.blsMechanical),
    jobGrowth: n(11, "% (2025–35)", S.blsMechanical),
    entryPay: n(74600, "USD/yr", S.sharkpathEstimate), // unchanged estimate (75% of the May 2023 median)
    typicalEntryEducation: t("Bachelor's degree", S.blsMechanical),
    license: { name: "Professional Engineer (FE → PE)", body: "NCEES", url: S.nceesPeMechanical.url },
    programId: "mdc-aa-mechanical-engineering",
    notes: [{ text: "Licensure is not required for entry-level positions as a mechanical engineer.", source: S.blsMechanical }],
    routes: [
      {
        id: "mechanical-transfer",
        label: "A.A. → B.S. Mechanical → Work · FE → PE later",
        stageIds: ["start", "mdc-aa-mechanical", "fiu-mechanical", "ncees-fe-mechanical", "ncees-pe-mechanical", "career-mechanical-engineer"],
        requiresBachelors: true,
      },
    ],
  },
  {
    id: "it-consultant",
    aliases: ["it", "information technology", "computer systems analyst", "systems analyst", "tech consultant", "consultor de ti"],
    metaMajor: "stem",
    track: "as",
    title: "IT Consultant",
    summary: "Help businesses choose, set up and fix the technology they run on.",
    traits: ["tech", "analyzing", "organizing"],
    medianPay: n(105850, "USD/yr", S.blsComputerSystemsAnalysts),
    jobGrowth: n(8, "% (2025–35)", S.blsComputerSystemsAnalysts),
    entryPay: entry(105850),
    typicalEntryEducation: t("Bachelor's degree", S.blsComputerSystemsAnalysts),
    license: { name: "CompTIA Network+ (optional)", body: "CompTIA", url: S.comptiaNetworkPlus.url },
    programId: "mdc-as-cit",
    notes: [
      {
        text: "Pay and job outlook come from BLS data for computer systems analysts. BLS notes that some systems analysts work as consultants.",
        source: S.blsComputerSystemsAnalysts,
      },
    ],
    routes: [
      {
        id: "it-direct",
        label: "A.S. → Network+ → Work",
        stageIds: ["start", "mdc-as-cit", "cert-network-plus", "career-it-consultant"],
        requiresBachelors: false,
      },
      {
        id: "it-bachelors",
        label: "A.S. → MDC B.S. Information Systems Technology",
        stageIds: ["start", "mdc-as-cit", "mdc-bs-ist", "career-it-consultant"],
        requiresBachelors: true,
      },
    ],
  },
];

const STAGES: PathwayStage[] = [
  { id: "mdc-aa-architecture", kind: "mdc", title: "A.A. · Pre-Architecture", subtitle: "MDC · 60 credits", column: 1, years: n(2, "yrs", S.mdcCatalog) },
  { id: "mdc-aa-engineering", kind: "mdc", title: "A.A. · Pre-Engineering", subtitle: "MDC · 60 credits", column: 1, years: n(2, "yrs", S.mdcCatalog) },
  { id: "mdc-as-cybersecurity", kind: "mdc", title: "A.S. · Cybersecurity", subtitle: "MDC · 60 credits", column: 1, years: n(2, "yrs", S.mdcEntecAs) },
  { id: "mdc-as-culinary", kind: "mdc", title: "A.S. · Culinary Arts", subtitle: "MDC · Culinary Institute", column: 1, years: n(2, "yrs", S.mdcCulinaryAs) },
  { id: "mdc-as-programming", kind: "mdc", title: "A.S. · Programming", subtitle: "MDC · 60 credits", column: 1, years: n(2, "yrs", S.mdcEntecAs) },

  { id: "fiu-architecture", kind: "transfer", title: "B.A. + M.Arch", subtitle: "FIU · 2+2 transfer", column: 2, years: n(4, "yrs", S.floridaTwoPlusTwo) },
  { id: "fiu-civil", kind: "transfer", title: "B.S. Civil Engineering", subtitle: "FIU · or UF / FAU", column: 2, years: n(2.5, "yrs", S.floridaTwoPlusTwo) },
  { id: "mdc-bs-cybersecurity", kind: "transfer", title: "B.S. Cybersecurity", subtitle: "Stay at MDC", column: 2, years: n(2, "yrs", S.mdcCatalog), atStartSchool: true },
  { id: "fiu-cs", kind: "transfer", title: "B.S. Computer Science", subtitle: "FIU · A.S. → B.S.", column: 2, years: n(2, "yrs", S.floridaTwoPlusTwo) },
  { id: "cert-servsafe", kind: "certification", title: "ServSafe Manager", subtitle: "Food safety cert", column: 2, years: n(0.1, "yrs", S.servSafe), fee: n(179, "USD", S.servSafeManagerPrice) },

  { id: "cert-security-plus", kind: "certification", title: "CompTIA Security+", subtitle: "Industry cert", column: 3, years: n(0.25, "yrs", S.comptiaSecurityPlus), fee: n(404, "USD", S.comptiaSecurityPlus) },
  { id: "ncarb", kind: "exam", title: "AXP + ARE exams", subtitle: "NCARB · work + 6 exams", column: 3, years: n(3, "yrs", S.ncarbAre), fee: n(1578, "USD", S.ncarbFees), earningWhileInStage: true },
  { id: "ncees-fe", kind: "exam", title: "FE exam → EIT", subtitle: "NCEES", column: 3, years: n(0.25, "yrs", S.nceesFe), fee: n(225, "USD", S.nceesFeFee), afterFirstJob: true },
  { id: "acf-cc", kind: "certification", title: "ACF Culinarian", subtitle: "While working", column: 3, years: n(1, "yrs", S.acf), earningWhileInStage: true },
  { id: "ncees-pe", kind: "exam", title: "PE license", subtitle: "NCEES · 4 yrs work", column: 4, years: n(4, "yrs", S.nceesPe), fee: n(400, "USD", S.nceesPe), earningWhileInStage: true, afterFirstJob: true },

  // Mechanical Engineer: same shape as Civil (first job after the B.S.; FE → PE later).
  { id: "mdc-aa-mechanical", kind: "mdc", title: "A.A. · Engineering - Mechanical", subtitle: "MDC · 60 credits", column: 1, years: n(2, "yrs", S.mdcCatalog) },
  { id: "fiu-mechanical", kind: "transfer", title: "B.S. Mechanical Engineering", subtitle: "FIU · or UF / FAU", column: 2, years: n(2, "yrs", S.floridaTwoPlusTwo) },
  { id: "ncees-fe-mechanical", kind: "exam", title: "FE exam (Mechanical)", subtitle: "NCEES", column: 3, years: n(0.25, "yrs", S.nceesFe), fee: n(225, "USD", S.nceesFeFee), afterFirstJob: true },
  { id: "ncees-pe-mechanical", kind: "exam", title: "PE license (Mechanical)", subtitle: "NCEES · 4 yrs work", column: 4, years: n(4, "yrs", S.nceesPeMechanical), fee: n(400, "USD", S.nceesPeMechanical), earningWhileInStage: true, afterFirstJob: true },

  // IT Consultant
  { id: "mdc-as-cit", kind: "mdc", title: "A.S. · Computer Information Technology", subtitle: "MDC · 60 credits", column: 1, years: n(2, "yrs", S.mdcEntecAs) },
  { id: "mdc-bs-ist", kind: "transfer", title: "B.S. Information Systems Technology", subtitle: "Stay at MDC", column: 2, years: n(2, "yrs", S.mdcCatalog), atStartSchool: true },
  // CompTIA's page names the cert and exam but shows no price or study time: no fee, time is our estimate.
  { id: "cert-network-plus", kind: "certification", title: "CompTIA Network+", subtitle: "Optional industry cert", column: 2, years: n(0.25, "yrs", S.sharkpathEstimate) },

];

// origin "catalog" = sample data. Switch to "verified" once Tiger Data confirms them.
export const CORE: Career[] = SPECS.map(({ programId, ...spec }) => ({
  ...spec,
  origin: "catalog",
  program: programById(programId),
  stages: STAGES.filter((st) => spec.routes.some((r) => r.stageIds.includes(st.id))),
}));
