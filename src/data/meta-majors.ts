// Florida's 8 statewide meta-majors. Every MDC program belongs to one, so any
// career can be routed through one of these.
// ⚠️ Course pools and placeholder pay are samples — the Data team replaces
// them with MDC catalog / BLS rows from Tiger Data.

import type { Course, MetaMajorId, QuizTrait } from "@/types/roadmap";

type Cat = Course["category"];
export const course = (code: string, title: string, credits = 3, category: Cat = "program-core"): Course => ({
  code,
  title,
  credits,
  category,
});
const g = (code: string, title: string, credits = 3) => course(code, title, credits, "general-education");

/** General education shared by every A.A. (36 credits in Florida). */
export const GEN_ED_AA: Course[] = [
  g("ENC1101", "English Composition I"),
  g("MAC1105", "College Algebra"),
  g("SPC1017", "Fundamentals of Speech"),
  g("ENC1102", "English Composition II"),
  g("HUM1020", "Introduction to Humanities"),
  g("PSY2012", "Introduction to Psychology"),
  g("STA2023", "Statistical Methods"),
  g("AMH2020", "U.S. History Since 1877"),
  g("BSC1005", "General Education Biology"),
  g("POS2041", "American Government"),
  g("PHI2010", "Introduction to Philosophy"),
  g("ARH1000", "Art Appreciation"),
];

/** General education inside an A.S. (15 credits). */
export const GEN_ED_AS: Course[] = [
  g("ENC1101", "English Composition I"),
  g("MAC1105", "College Algebra"),
  g("SPC1017", "Fundamentals of Speech"),
  g("PSY2012", "Introduction to Psychology"),
  g("HUM1020", "Introduction to Humanities"),
];

export interface MetaMajor {
  id: MetaMajorId;
  label: string;
  traits: QuizTrait[];
  /** Common prerequisites taken inside the A.A. for transfer majors */
  prereqs: Course[];
  /** Representative technical courses for A.S. / certificate programs */
  core: Course[];
  /** Placeholder median pay for AI-generated careers in this meta-major */
  placeholderPay: number;
  keywords: string[];
}

export const META_MAJORS: MetaMajor[] = [
  {
    id: "health",
    label: "Health Sciences",
    traits: ["helping", "hands-on", "analyzing"],
    prereqs: [course("BSC2085", "Anatomy & Physiology I", 4), course("BSC2086", "Anatomy & Physiology II", 4), course("MCB2010", "Microbiology", 4), course("CHM1045", "General Chemistry I + Lab", 4), course("DEP2004", "Human Growth & Development")],
    core: [course("HSC1531", "Medical Terminology"), course("BSC2085", "Anatomy & Physiology I", 4), course("BSC2086", "Anatomy & Physiology II", 4), course("HSC2400", "First Aid & Safety", 2), course("HUN1201", "Human Nutrition"), course("MCB2010", "Microbiology", 4), course("HSC1000", "Introduction to Health Care")],
    placeholderPay: 72000,
    keywords: ["nurs", "medic", "doctor", "physician", "dent", "pharm", "therap", "health", "hospital", "clinic", "surg", "radiolog", "sonograph", "patient", "vet", "optom", "nutrition", "diet", "emt", "enfermer", "salud"],
  },
  {
    id: "stem",
    label: "Science, Technology, Engineering & Math",
    traits: ["analyzing", "tech", "building"],
    prereqs: [course("MAC2311", "Calculus I", 4), course("MAC2312", "Calculus II", 4), course("CHM1045", "General Chemistry I + Lab", 4), course("PHY2048", "Physics with Calculus I + Lab", 5), course("COP1334", "Introduction to C++ Programming", 4)],
    core: [course("CGS1060C", "Introduction to Computer Technology", 4), course("COP1047", "Python Programming"), course("COP2800", "Java Programming", 4), course("CTS2437", "Database Systems", 4), course("CTS1134", "Networking Technologies", 4), course("COP2822", "Web Development", 4)],
    placeholderPay: 95000,
    keywords: ["engineer", "scien", "math", "data", "comput", "software", "develop", "program", "cyber", "tech", "it ", "game", "ai ", "robot", "chem", "physic", "bio", "astro", "statist", "ingenier", "cienc"],
  },
  {
    id: "business",
    label: "Business",
    traits: ["organizing", "analyzing"],
    prereqs: [course("ACG2021", "Financial Accounting"), course("ACG2071", "Managerial Accounting"), course("ECO2013", "Principles of Macroeconomics"), course("ECO2023", "Principles of Microeconomics"), course("MAC2233", "Calculus for Business")],
    core: [course("GEB1011", "Introduction to Business"), course("ACG2021", "Financial Accounting"), course("MAN2021", "Principles of Management"), course("MAR2011", "Principles of Marketing"), course("BUL2241", "Business Law"), course("CGS1100", "Microcomputer Applications")],
    placeholderPay: 78000,
    keywords: ["business", "account", "financ", "market", "manag", "sales", "real estate", "bank", "entrepreneur", "hr ", "human resources", "consult", "econom", "paralegal", "negocio", "contador"],
  },
  {
    id: "education",
    label: "Education",
    traits: ["helping", "organizing"],
    prereqs: [course("EDF1005", "Introduction to Education"), course("EDF2085", "Introduction to Diversity for Educators"), course("EME2040", "Introduction to Educational Technology"), course("DEP2004", "Human Growth & Development")],
    core: [course("EEC1000", "Introduction to Early Childhood Education"), course("EEC1601", "Child Growth & Development"), course("EEC2401", "Home, School & Community"), course("EEX2010", "Introduction to Special Education"), course("EME2040", "Introduction to Educational Technology")],
    placeholderPay: 58000,
    keywords: ["teach", "educat", "school", "tutor", "professor", "coach", "librar", "counselor", "maestr", "profesor"],
  },
  {
    id: "arts",
    label: "Arts, Humanities, Communication & Design",
    traits: ["creating", "designing"],
    prereqs: [course("ART1300C", "Drawing I"), course("ART1201C", "2-D Design"), course("ARH2050", "Art History I"), course("MMC1000", "Survey of Mass Communication")],
    core: [course("GRA1100C", "Introduction to Graphic Design"), course("ART1201C", "2-D Design"), course("DIG2000", "Introduction to Digital Media"), course("PGY1800C", "Digital Photography"), course("GRA2190C", "Typography"), course("DIG2109C", "Digital Imaging")],
    placeholderPay: 56000,
    keywords: ["art", "design", "music", "film", "photo", "journal", "writer", "animat", "fashion", "actor", "media", "communicat", "translat", "interior", "artist", "diseñ", "músic"],
  },
  {
    id: "industry",
    label: "Industry, Manufacturing & Construction",
    traits: ["building", "hands-on"],
    prereqs: [course("BCN1251", "Construction Drawing"), course("BCN1210", "Construction Materials"), course("ETD1103", "CAD Fundamentals")],
    core: [course("EET1015C", "DC Circuits", 4), course("ETD1103", "CAD Fundamentals"), course("BCN1210", "Construction Materials"), course("ETI1701", "Industrial Safety (OSHA)"), course("BCN2613", "Construction Estimating"), course("ETM1010", "Mechanical Measurement & Instruments")],
    placeholderPay: 60000,
    keywords: ["electric", "plumb", "hvac", "weld", "mechanic", "construct", "carpent", "manufactur", "aviation", "pilot", "auto", "technician", "contractor", "machin", "electricist"],
  },
  {
    id: "public-safety",
    label: "Public Safety",
    traits: ["helping", "hands-on", "organizing"],
    prereqs: [course("CCJ1020", "Introduction to Criminal Justice"), course("CJL2100", "Criminal Law"), course("CCJ2191", "Human Behavior in Criminal Justice")],
    core: [course("CCJ1020", "Introduction to Criminal Justice"), course("CJE1000", "Introduction to Law Enforcement"), course("CJL2100", "Criminal Law"), course("FFP1000", "Introduction to Fire Science"), course("EMS1119", "Emergency Medical Technician", 7), course("CJE2600", "Criminal Investigation")],
    placeholderPay: 62000,
    keywords: ["police", "fire", "sheriff", "detective", "officer", "security guard", "corrections", "emergency", "paramedic", "border", "military", "coast guard", "policía", "bombero"],
  },
  {
    id: "social",
    label: "Social & Behavioral Sciences & Human Services",
    traits: ["helping", "analyzing"],
    prereqs: [course("SYG2000", "Introduction to Sociology"), course("CLP2140", "Abnormal Psychology"), course("ANT2000", "Introduction to Anthropology"), course("DEP2004", "Human Growth & Development")],
    core: [course("SOW1054", "Introduction to Social Work"), course("SYG2000", "Introduction to Sociology"), course("HUS1001", "Introduction to Human Services"), course("CLP2140", "Abnormal Psychology"), course("DEP2004", "Human Growth & Development")],
    placeholderPay: 60000,
    keywords: ["psych", "social", "counsel", "lawyer", "law", "attorney", "judge", "politic", "sociolog", "histor", "human services", "therapist", "abogad", "psicólog"],
  },
];

export const metaMajorById = (id: MetaMajorId) => META_MAJORS.find((m) => m.id === id)!;
