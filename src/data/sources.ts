// Source registry. Every number in the UI points at one of these.
//
// ⚠️ PLACEHOLDERS: all `verified: false`. The Data team replaces these with the
// verified rows from Tiger Data; the UI shows a "Verified" badge automatically
// once `verified` is true.

import type { Source } from "@/types/roadmap";

const s = (id: string, label: string, title: string, url: string, asOf?: string): Source => ({
  id,
  label,
  title,
  url,
  asOf,
  verified: false,
});

export const SOURCES = {
  blsArchitects: s("bls-architects", "BLS OOH", "BLS Occupational Outlook Handbook — Architects", "https://www.bls.gov/ooh/architecture-and-engineering/architects.htm", "May 2023"),
  blsCivil: s("bls-civil", "BLS OOH", "BLS Occupational Outlook Handbook — Civil Engineers", "https://www.bls.gov/ooh/architecture-and-engineering/civil-engineers.htm", "May 2023"),
  blsInfosec: s("bls-infosec", "BLS OOH", "BLS Occupational Outlook Handbook — Information Security Analysts", "https://www.bls.gov/ooh/computer-and-information-technology/information-security-analysts.htm", "May 2023"),
  blsChefs: s("bls-chefs", "BLS OOH", "BLS Occupational Outlook Handbook — Chefs and Head Cooks", "https://www.bls.gov/ooh/food-preparation-and-serving/chefs-and-head-cooks.htm", "May 2023"),
  blsSoftware: s("bls-software", "BLS OOH", "BLS Occupational Outlook Handbook — Software Developers", "https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm", "May 2023"),
  blsEducationPays: s("bls-education-pays", "BLS", "BLS — Earnings and unemployment rates by educational attainment", "https://www.bls.gov/emp/chart-unemployment-earnings-education.htm", "2023"),
  onet: s("onet", "O*NET", "O*NET OnLine career profiles", "https://www.onetonline.org"),
  mdcCatalog: s("mdc-catalog", "MDC Catalog", "Miami Dade College academic catalog", "https://www.mdc.edu/academics/"),
  mdcTuition: s("mdc-tuition", "MDC", "Miami Dade College tuition & fees (in-state, lower division)", "https://www.mdc.edu", "2026–27"),
  mdcCostOfAttendance: s("mdc-coa", "MDC", "Miami Dade College estimated cost of attendance", "https://www.mdc.edu", "2026–27"),
  fiuTuition: s("fiu-tuition", "FIU", "Florida International University tuition (in-state, upper division)", "https://www.fiu.edu", "2026–27"),
  floridaTwoPlusTwo: s("fl-2plus2", "FL 2+2", "Florida Statewide Articulation Agreement (2+2)", "https://www.fldoe.org/policy/articulation/"),
  pell: s("pell", "StudentAid.gov", "Federal Pell Grant maximum award", "https://studentaid.gov/understand-aid/types/grants/pell", "2026–27"),
  brightFutures: s("bright-futures", "FL OSFA", "Florida Bright Futures Scholarship", "https://www.floridastudentfinancialaidsg.org", "2026–27"),
  flMinWage: s("fl-min-wage", "FloridaCommerce", "Florida minimum wage (effective Sept 30, 2026)", "https://floridajobs.org"),
  ncarbAre: s("ncarb-are", "NCARB", "NCARB — Architect Registration Examination & AXP", "https://www.ncarb.org/pass-the-are"),
  nceesFe: s("ncees-fe", "NCEES", "NCEES — Fundamentals of Engineering (FE) exam", "https://ncees.org/exams/fe-exam/"),
  nceesPe: s("ncees-pe", "NCEES", "NCEES — Principles and Practice of Engineering (PE) exam", "https://ncees.org/exams/pe-exam/"),
  comptiaSecurityPlus: s("comptia-secplus", "CompTIA", "CompTIA Security+ certification", "https://www.comptia.org/certifications/security"),
  servSafe: s("servsafe", "ServSafe", "ServSafe Manager certification (course + exam)", "https://www.servsafe.com"),
  acf: s("acf", "ACF", "American Culinary Federation — Certified Culinarian", "https://www.acfchefs.org"),
  aiEstimate: s("ai-estimate", "AI est.", "AI-generated estimate (sample data). Connect /api/careers/resolve (Gemini + Tiger Data) for sourced figures", "https://github.com/RichWilliams772/sharkpath-mdc"),
  sharkpathEstimate: s("sharkpath-estimate", "Estimate", "SharkPath estimate — placeholder until the Backend calculator is connected", "https://github.com/RichWilliams772/sharkpath-mdc"),
  mdcCalendar: s("mdc-calendar", "MDC", "Miami Dade College academic calendar", "https://www.mdc.edu"),
  fiuAdmissions: s("fiu-admissions", "FIU", "FIU transfer admissions deadlines", "https://admissions.fiu.edu"),
  collegeTuition: s("college-tuition", "Tuition", "College tuition & required fees per credit (sample directory — College Scorecard / school tuition pages)", "https://collegescorecard.ed.gov", "2026–27"),
  nationalAverage: s("national-average", "Avg.", "National average tuition per credit for this type of college (sample) — used for colleges not in our directory", "https://collegescorecard.ed.gov", "2026–27"),
  stateAid: s("state-aid", "State aid", "State grant / scholarship programs (sample) — check your state's higher-education agency", "https://studentaid.gov/understand-aid/types/grants", "2026–27"),
  federalLoans: s("federal-loans", "StudentAid.gov", "Federal Direct Loan limits and interest rates", "https://studentaid.gov/understand-aid/types/loans/subsidized-unsubsidized", "2026–27"),
  mdcFoundation: s("mdc-foundation", "MDC Foundation", "MDC Foundation scholarships", "https://www.mdc.edu/foundation/"),
  fafsa: s("fafsa","StudentAid.gov", "FAFSA deadlines", "https://studentaid.gov/apply-for-aid/fafsa/fafsa-deadlines"),
} satisfies Record<string, Source>;
