import type { PathOption, Roadmap } from "./types";

// Offline/demo roadmaps for the five careers in the challenge brief, starting at MDC.
// Costs are rough in-state tuition estimates for demo purposes, not quotes.

const MDC = "Miami Dade College";

const s = (stage: string, institution: string, duration: string, costUSD: number, detail: string) => ({
  stage, institution, duration, costUSD, detail,
});

const DEMO: Record<string, PathOption[]> = {
  architect: [
    {
      id: "arch-fiu", title: "MDC → FIU Master of Architecture",
      summary: "Transfer with an A.A., finish architecture at FIU, then license.",
      metrics: { costUSD: 42000, relevancy: 82, difficulty: 8, years: 7 },
      steps: [
        s("A.A. — Architecture pathway", MDC, "2 years", 7100, "General education plus design studio prerequisites."),
        s("B.A. Architectural Studies → M.Arch", "Florida International University", "4 years", 32000, "Accredited professional degree required for licensure."),
        s("AXP hours + ARE exams", "NCARB", "1–3 years (overlaps work)", 2900, "Paid internship hours and six licensing exams."),
      ],
    },
    {
      id: "arch-tech", title: "Drafting first, degree later",
      summary: "Start working as an architectural drafter, then return for the M.Arch.",
      metrics: { costUSD: 39000, relevancy: 70, difficulty: 6, years: 9 },
      steps: [
        s("A.S. Architectural Design & Construction Technology", MDC, "2 years", 7400, "CAD, BIM and construction documents — job-ready drafting skills."),
        s("Work as drafter / BIM technician", "Architecture firm", "2–3 years", 0, "Earn while you build a portfolio; many firms help with tuition."),
        s("M.Arch (part-time track)", "Florida International University", "3–4 years", 31600, "Required to sit for licensure in Florida."),
      ],
    },
    {
      id: "arch-uf", title: "MDC → UF Design + M.Arch",
      summary: "Transfer to UF's design program for a highly ranked school name.",
      metrics: { costUSD: 58000, relevancy: 85, difficulty: 9, years: 7 },
      steps: [
        s("A.A. — Architecture pathway", MDC, "2 years", 7100, "Keep a strong GPA; UF admission to design is competitive."),
        s("B.Des → M.Arch", "University of Florida", "4 years", 48000, "Includes Gainesville living costs beyond tuition."),
        s("AXP hours + ARE exams", "NCARB", "1–3 years", 2900, "Licensure path as with any accredited M.Arch."),
      ],
    },
  ],
  "mechanical engineer": [
    {
      id: "me-fiu", title: "MDC → FIU B.S. Mechanical Engineering",
      summary: "The classic 2+2: engineering A.A., transfer to FIU, take the FE exam.",
      metrics: { costUSD: 22000, relevancy: 88, difficulty: 8, years: 4.5 },
      steps: [
        s("A.A. — Engineering pathway", MDC, "2 years", 7100, "Calculus I–III, physics with calculus, chemistry, programming."),
        s("B.S. Mechanical Engineering", "Florida International University", "2–2.5 years", 14600, "ABET-accredited; co-op and internships in Miami's aerospace sector."),
        s("Fundamentals of Engineering (FE) exam", "NCEES", "Final semester", 225, "First step toward a PE license."),
      ],
    },
    {
      id: "me-uf", title: "MDC → UF B.S. Mechanical Engineering",
      summary: "Same 2+2 shape with a top-ranked engineering school.",
      metrics: { costUSD: 34000, relevancy: 90, difficulty: 9, years: 4.5 },
      steps: [
        s("A.A. — Engineering pathway", MDC, "2 years", 7100, "Finish state common prerequisites before transfer."),
        s("B.S. Mechanical Engineering", "University of Florida", "2–2.5 years", 26700, "Includes relocation and living costs."),
        s("FE exam", "NCEES", "Final semester", 225, "Toward PE licensure."),
      ],
    },
    {
      id: "me-tech", title: "Engineering technician route", soc: "17-3027", landsAs: "Mechanical engineering technician",
      summary: "Get hired fast as a technician; engineer title comes later or not at all.",
      metrics: { costUSD: 7600, relevancy: 66, difficulty: 5, years: 2 },
      steps: [
        s("A.S. Engineering Technology", MDC, "2 years", 7400, "Hands-on manufacturing, CAD and instrumentation."),
        s("Certified technician credentials", "Industry (e.g. SolidWorks CSWA)", "Weeks", 200, "Strengthens a technician résumé."),
        s("Mechanical / manufacturing technician", "Employer", "Ongoing", 0, "Option to bridge into a B.S. later with employer support."),
      ],
    },
  ],
  chef: [
    {
      id: "chef-mci", title: "Miami Culinary Institute A.S.",
      summary: "Full culinary degree at MDC's culinary school, then the kitchen ladder.",
      metrics: { costUSD: 9800, relevancy: 72, difficulty: 5, years: 2 },
      steps: [
        s("A.S. Culinary Arts Management", `${MDC} — Miami Culinary Institute`, "2 years", 9300, "Classical technique, kitchen management, food cost control."),
        s("ServSafe Manager certification", "National Restaurant Association", "1 day", 180, "Expected for anyone running a kitchen."),
        s("Line cook → sous chef → chef", "Restaurant industry", "3–7 years", 0, "Miami's dining scene rewards stage experience."),
      ],
    },
    {
      id: "chef-cert", title: "Certificate and straight into kitchens",
      summary: "Shortest path in; you learn mostly on the line.",
      metrics: { costUSD: 4300, relevancy: 64, difficulty: 4, years: 1 },
      steps: [
        s("Culinary Arts certificate", `${MDC} — Miami Culinary Institute`, "1 year", 4100, "Core technique and sanitation."),
        s("ServSafe Food Handler/Manager", "National Restaurant Association", "1 day", 180, "Required by most employers."),
        s("Work the line", "Restaurant industry", "Ongoing", 0, "Advancement depends on mentorship and hustle."),
      ],
    },
    {
      id: "chef-hosp", title: "Culinary A.S. → FIU Hospitality B.S.",
      summary: "Chef skills plus a business degree for executive chef / owner roles.",
      metrics: { costUSD: 24000, relevancy: 78, difficulty: 6, years: 4 },
      steps: [
        s("A.S. Culinary Arts Management", `${MDC} — Miami Culinary Institute`, "2 years", 9300, "Transfers into hospitality programs."),
        s("B.S. Hospitality Management", "FIU Chaplin School of Hospitality", "2 years", 14600, "Operations, finance, restaurant management."),
        s("Executive chef / F&B management", "Hotels, restaurant groups", "Ongoing", 0, "Higher ceiling for leadership roles."),
      ],
    },
  ],
  "cybersecurity specialist": [
    {
      id: "cyber-as", title: "A.S. Cybersecurity + certifications",
      summary: "Two years and a couple of certs puts you in a SOC analyst seat.",
      metrics: { costUSD: 8200, relevancy: 86, difficulty: 6, years: 2 },
      steps: [
        s("A.S. Cybersecurity", MDC, "2 years", 7400, "Networking, Linux, security operations labs."),
        s("CompTIA Security+ (+ Network+)", "CompTIA", "2–3 months", 800, "The baseline cert most entry job posts ask for."),
        s("SOC analyst / security technician", "Employer", "Ongoing", 0, "Grow toward incident response or pentesting."),
      ],
    },
    {
      id: "cyber-bs", title: "Stay at MDC for the B.S. Cybersecurity",
      summary: "MDC's own bachelor's — four years without changing schools.",
      metrics: { costUSD: 16000, relevancy: 90, difficulty: 7, years: 4 },
      steps: [
        s("A.S. Cybersecurity", MDC, "2 years", 7400, "Ladders directly into the bachelor's."),
        s("B.S. Cybersecurity", MDC, "2 years", 7800, "Bachelor's tuition at state-college rates."),
        s("Security+ / CySA+", "CompTIA", "During program", 800, "Pair the degree with industry certs."),
      ],
    },
    {
      id: "cyber-fiu", title: "MDC → FIU B.S. Cybersecurity",
      summary: "Transfer for research labs and a large-university network.",
      metrics: { costUSD: 22500, relevancy: 90, difficulty: 8, years: 4 },
      steps: [
        s("A.A. — Computer science pathway", MDC, "2 years", 7100, "Math and programming prerequisites."),
        s("B.S. Cybersecurity", "Florida International University", "2 years", 14600, "NSA-designated center of academic excellence."),
        s("Security+ / internship", "Industry", "Final year", 800, "Internships often convert into offers."),
      ],
    },
  ],
  "it consultant": [
    {
      id: "it-mdc", title: "MDC A.S. → MDC B.S. Information Systems Technology",
      summary: "Build technical depth at MDC, then move into client-facing consulting.",
      metrics: { costUSD: 16500, relevancy: 80, difficulty: 6, years: 4 },
      steps: [
        s("A.S. Networking Services Technology", MDC, "2 years", 7400, "Infrastructure, cloud and systems administration."),
        s("B.S. Information Systems Technology", MDC, "2 years", 7800, "Project management, systems analysis, business tech."),
        s("Junior IT consultant", "Consulting firm / MSP", "Ongoing", 0, "Certs like AWS Cloud Practitioner help early on."),
      ],
    },
    {
      id: "it-fiu", title: "MDC → FIU B.S. Information Technology",
      summary: "Transfer route with a broader university recruiting pipeline.",
      metrics: { costUSD: 22000, relevancy: 82, difficulty: 6, years: 4 },
      steps: [
        s("A.A. — Information technology pathway", MDC, "2 years", 7100, "Programming and statistics prerequisites."),
        s("B.S. Information Technology", "Florida International University", "2 years", 14600, "Big-four and consultancy campus recruiting."),
        s("Analyst → consultant", "Consulting firm", "2–4 years", 0, "Most consultants start as analysts."),
      ],
    },
    {
      id: "it-help", title: "Help desk first, consult later", soc: "15-1232", landsAs: "Computer user support specialist",
      summary: "Fastest way to earn; consulting comes from years of field experience.",
      metrics: { costUSD: 8100, relevancy: 68, difficulty: 4, years: 1.5 },
      steps: [
        s("IT Support certificate / A.S. courses", MDC, "1–1.5 years", 4300, "Hardware, OS, networking fundamentals."),
        s("CompTIA A+, Network+", "CompTIA", "3 months", 800, "Gets you past résumé filters."),
        s("Help desk → systems admin → consultant", "Employer", "4–6 years", 3000, "Add cloud certs as you climb."),
      ],
    },
  ],
};

export const DEMO_CAREERS = ["Architect", "Mechanical Engineer", "Chef", "Cybersecurity Specialist", "IT Consultant"];

/** Generic three-route template for any career/college when there is no LLM key. */
function generic(career: string, college: string): PathOption[] {
  return [
    {
      id: "gen-transfer", title: `${college} A.A. → four-year transfer`,
      summary: `Knock out general education at ${college}, then transfer for a bachelor's related to ${career}.`,
      metrics: { costUSD: 24000, relevancy: 82, difficulty: 7, years: 4 },
      steps: [
        s("Associate in Arts (transfer track)", college, "2 years", 7500, "Take the prerequisites your target university lists for the major."),
        s(`Bachelor's degree for ${career}`, "State university", "2 years", 16000, "Look for articulation agreements that guarantee admission."),
        s("Internship → first role", "Industry", "Final year", 0, "Internships are the strongest predictor of a first offer."),
      ],
    },
    {
      id: "gen-as", title: `${college} career A.S.`,
      summary: "A workforce-focused associate degree that gets you hired sooner.",
      metrics: { costUSD: 8000, relevancy: 70, difficulty: 5, years: 2 },
      steps: [
        s(`A.S. related to ${career}`, college, "2 years", 7500, "Applied coursework designed with local employers."),
        s("Industry certification", "Certifying body", "Weeks–months", 500, "Ask your program advisor which credential employers want."),
        s("Entry-level role", "Employer", "Ongoing", 0, "Many employers reimburse tuition if you continue later."),
      ],
    },
    {
      id: "gen-cert", title: "Certificate + apprenticeship",
      summary: "Shortest route in; learn on the job with a mentor.",
      metrics: { costUSD: 3500, relevancy: 60, difficulty: 4, years: 1 },
      steps: [
        s("Technical certificate", college, "6–12 months", 3500, "Focused, job-specific skills."),
        s("Apprenticeship / trainee position", "Employer", "1–2 years", 0, "Paid while learning."),
        s(`Grow into ${career}`, "Employer", "Ongoing", 0, "Stack credentials as you go."),
      ],
    },
  ];
}

// SOC codes for the demo careers, so offline routes still get real BLS wages.
const SOC: Record<string, string> = {
  architect: "17-1011", "mechanical engineer": "17-2141", chef: "35-1011",
  "cybersecurity specialist": "15-1212", "it consultant": "15-1211",
};

export function demoRoadmap(career: string, college: string): Roadmap {
  const key = career.trim().toLowerCase();
  const known = DEMO[key];
  const isMdc = /miami dade|mdc/i.test(college);
  const withSoc = (o: PathOption): PathOption => ({ ...o, soc: o.soc ?? SOC[key], landsAs: o.landsAs ?? career });
  if (known && isMdc) return { career, college: MDC, options: known.map(withSoc), source: "demo" };
  return {
    career, college, options: generic(career, college).map(withSoc), source: "demo",
    note: "Demo routes: the AI guide couldn't be reached, so these are general templates.",
  };
}
