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

/** A source someone opened on `checkedOn` and confirmed the figure is written on that exact page. */
const v = (id: string, label: string, title: string, url: string, checkedOn: string, asOf?: string): Source => ({
  ...s(id, label, title, url, asOf),
  verified: true,
  checkedOn,
});
const CHECKED = "2026-11-08";

export const SOURCES = {
  blsArchitects: v("bls-architects", "BLS OOH", "BLS Occupational Outlook Handbook — Architects", "https://www.bls.gov/ooh/architecture-and-engineering/architects.htm", CHECKED, "May 2025"),
  blsCivil: v("bls-civil", "BLS OOH", "BLS Occupational Outlook Handbook — Civil Engineers", "https://www.bls.gov/ooh/architecture-and-engineering/civil-engineers.htm", CHECKED, "May 2025"),
  blsInfosec: v("bls-infosec", "BLS OOH", "BLS Occupational Outlook Handbook — Information Security Analysts", "https://www.bls.gov/ooh/computer-and-information-technology/information-security-analysts.htm", CHECKED, "May 2025"),
  blsChefs: v("bls-chefs", "BLS OOH", "BLS Occupational Outlook Handbook — Chefs and Head Cooks", "https://www.bls.gov/ooh/food-preparation-and-serving/chefs-and-head-cooks.htm", CHECKED, "May 2025"),
  blsSoftware: v("bls-software", "BLS OOH", "BLS Occupational Outlook Handbook — Software Developers", "https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm", CHECKED, "May 2025"),
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
  nceesPe: v("ncees-pe", "NCEES", "NCEES — PE Civil exam (fee and work experience)", "https://ncees.org/exams/pe-exam/civil/", CHECKED),
  // Verified 2026-11-08. Separate rows so the unverified figures sharing the older sources stay unverified.
  ncarbFees: v("ncarb-fees", "NCARB", "NCARB fees — ARE total cost (six divisions)", "https://www.ncarb.org/fees", CHECKED),
  nceesFeFee: v("ncees-fe-fee", "NCEES", "NCEES — FE exam fee", "https://ncees.org/exams/fe-exam/", CHECKED),
  servSafeManagerPrice: v("servsafe-manager-price", "ServSafe", "ServSafe Manager Online Course & Exam (Online Proctor) price", "https://www.servsafe.com/access/ss/Catalog/ProductList/10", CHECKED),
  mdcCulinaryAs: v("mdc-culinary-as", "MDC", "MDC — Culinary Arts Management Associate in Science (two-year program)", "https://www.mdc.edu/culinaryartsmanagement/", CHECKED),
  mdcEntecAs: v("mdc-entec-as", "MDC", "MDC School of Engineering & Technology — 2-year Associate in Science degrees", "https://www.mdc.edu/entec/programs.aspx", CHECKED),
  mdcTuitionPerCredit: v("mdc-tuition-per-credit", "MDC", "MDC tuition & fees — Associate programs, total cost per credit", "http://www.mdc.edu/student-financial-services/tuition-fees/", CHECKED),
  comptiaSecurityPlusV8: v("comptia-secplus-v8", "CompTIA", "CompTIA Security+ — V8 launch date", "https://www.comptia.org/certifications/security", CHECKED),
  blsMechanical: v("bls-mechanical-engineer", "BLS OOH", "BLS Occupational Outlook Handbook — Mechanical Engineers", "https://www.bls.gov/ooh/architecture-and-engineering/mechanical-engineers.htm", CHECKED, "May 2025"),
  nceesPeMechanical: v("ncees-pe-mechanical", "NCEES", "NCEES — PE Mechanical exam (fee and work experience)", "https://ncees.org/exams/pe-exam/mechanical/", CHECKED),
  blsComputerSystemsAnalysts: v("bls-computer-systems-analysts", "BLS OOH", "BLS Occupational Outlook Handbook — Computer Systems Analysts", "https://www.bls.gov/ooh/computer-and-information-technology/computer-systems-analysts.htm", CHECKED, "May 2025"),
  mdcTuitionBachelor: v("mdc-tuition-bachelor", "MDC", "MDC tuition & fees — Baccalaureate programs, total cost per credit", "http://www.mdc.edu/student-financial-services/tuition-fees/", CHECKED),
  comptiaNetworkPlus: v("comptia-network-plus", "CompTIA", "CompTIA Network+ certification (exam N10-009)", "https://www.comptia.org/en-us/certifications/network/", CHECKED),
  comptiaSecurityPlus: s("comptia-secplus", "CompTIA", "CompTIA Security+ certification", "https://www.comptia.org/certifications/security"),
  servSafe: s("servsafe", "ServSafe", "ServSafe Manager certification (course + exam)", "https://www.servsafe.com"),
  acf: s("acf", "ACF", "American Culinary Federation — Certified Culinarian", "https://www.acfchefs.org"),
  aiEstimate: s("ai-estimate", "AI est.", "AI-generated estimate, not from our database. Confirm with an MDC advisor", "https://github.com/RichWilliams772/sharkpath-mdc"),
  sharkpathEstimate: s("sharkpath-estimate", "Estimate", "SharkPath estimate — placeholder until the Backend calculator is connected", "https://github.com/RichWilliams772/sharkpath-mdc"),
  mdcCalendar: s("mdc-calendar", "MDC", "Miami Dade College academic calendar", "https://www.mdc.edu"),
  fiuAdmissions: s("fiu-admissions", "FIU", "FIU transfer admissions deadlines", "https://admissions.fiu.edu"),
  collegeTuition: s("college-tuition", "Tuition", "College tuition & required fees per credit (College Scorecard / school tuition pages)", "https://collegescorecard.ed.gov", "2026–27"),
  nationalAverage: s("national-average", "Avg.", "National average tuition per credit for this type of college — used for colleges not in our directory", "https://collegescorecard.ed.gov", "2026–27"),
  stateAid: s("state-aid", "State aid", "State grant / scholarship programs — check your state's higher-education agency", "https://studentaid.gov/understand-aid/types/grants", "2026–27"),
  federalLoans: s("federal-loans", "StudentAid.gov", "Federal Direct Loan limits and interest rates", "https://studentaid.gov/understand-aid/types/loans/subsidized-unsubsidized", "2026–27"),
  mdcFoundation: s("mdc-foundation", "MDC Foundation", "MDC Foundation scholarships", "https://www.mdc.edu/foundation/"),
  fafsa: s("fafsa","StudentAid.gov", "FAFSA deadlines", "https://studentaid.gov/apply-for-aid/fafsa/fafsa-deadlines"),
} satisfies Record<string, Source>;
