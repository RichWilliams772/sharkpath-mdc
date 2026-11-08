// Seeded catalog of common careers across all 8 meta-majors.
// ⚠️ SAMPLE DATA: pay/growth are placeholder figures (approx. BLS May 2023)
// until our Tiger Data SQL database is connected. Add a career = add one spec line.

import { buildCareer, type CareerSpec } from "@/lib/careers/generate";
import type { QuizTrait } from "@/types/roadmap";

/** Interest profile per career, used by the quiz (falls back to the meta-major's). */
const TRAITS: Record<string, QuizTrait[]> = {
  "Registered Nurse": ["helping", "hands-on"],
  "Dental Hygienist": ["hands-on", "helping", "organizing"],
  "Radiologic Technologist": ["tech", "hands-on", "helping"],
  "Physical Therapist Assistant": ["helping", "hands-on"],
  "Physician Assistant": ["helping", "analyzing", "hands-on"],
  Pharmacist: ["analyzing", "helping", "organizing"],
  Physician: ["helping", "analyzing"],
  "Data Scientist": ["analyzing", "tech"],
  "Web Developer": ["tech", "creating"],
  "Environmental Scientist": ["analyzing", "hands-on"],
  Accountant: ["organizing", "analyzing"],
  "Financial Analyst": ["analyzing", "organizing"],
  "Marketing Manager": ["creating", "organizing"],
  Paralegal: ["organizing", "analyzing"],
  "High School Teacher": ["helping", "organizing"],
  "Preschool Teacher": ["helping", "creating"],
  "Graphic Designer": ["creating", "designing", "tech"],
  "Interior Designer": ["designing", "creating"],
  "Film & Video Editor": ["creating", "tech"],
  Electrician: ["hands-on", "building", "tech"],
  "HVAC Technician": ["hands-on", "building"],
  "Construction Manager": ["building", "organizing"],
  "Commercial Pilot": ["hands-on", "tech", "organizing"],
  "Police Officer": ["helping", "hands-on", "organizing"],
  Firefighter: ["helping", "hands-on", "building"],
  Paramedic: ["helping", "hands-on"],
  "Social Worker": ["helping", "organizing"],
  Psychologist: ["helping", "analyzing"],
  Lawyer: ["analyzing", "organizing", "helping"],
};

const c = (spec: Omit<CareerSpec, "origin">): CareerSpec => ({ ...spec, traits: spec.traits ?? TRAITS[spec.title], origin: "catalog" });

const SPECS: CareerSpec[] = [
  // Health Sciences
  c({ title: "Registered Nurse", metaMajor: "health", track: "as", programName: "Nursing (R.N.)", aliases: ["nurse", "rn", "nursing", "enfermera", "enfermero"], license: { name: "NCLEX-RN", body: "FL Board of Nursing", fee: 200 }, bachelorsOption: "B.S.N. at MDC", medianPay: 86070, jobGrowth: 6, summary: "Care for patients and coordinate treatment in hospitals and clinics." }),
  c({ title: "Dental Hygienist", metaMajor: "health", track: "as", programName: "Dental Hygiene", aliases: ["dental"], license: { name: "Dental hygiene license", body: "FL Board of Dentistry", fee: 300 }, medianPay: 87530, jobGrowth: 7, summary: "Clean teeth, screen for disease and teach patients oral health." }),
  c({ title: "Radiologic Technologist", metaMajor: "health", track: "as", programName: "Radiography", aliases: ["x-ray", "radiology", "rad tech"], license: { name: "ARRT certification", body: "ARRT", fee: 225 }, medianPay: 73410, jobGrowth: 6, summary: "Take X-rays and medical images that help doctors diagnose." }),
  c({ title: "Physical Therapist Assistant", metaMajor: "health", track: "as", programName: "Physical Therapist Assistant", aliases: ["pta"], license: { name: "NPTE-PTA", body: "FSBPT", fee: 485 }, medianPay: 64080, jobGrowth: 19, summary: "Help patients recover movement after injuries and surgery." }),
  c({ title: "Physician Assistant", metaMajor: "health", track: "graduate", bachelor: "B.S. Health Sciences", graduate: { title: "Master's in PA Studies", years: 2.5 }, aliases: ["pa"], license: { name: "PANCE", body: "NCCPA", fee: 550 }, medianPay: 130020, jobGrowth: 28, summary: "Diagnose and treat patients as part of a medical team." }),
  c({ title: "Pharmacist", metaMajor: "health", track: "graduate", bachelor: "B.S. Chemistry / Biology", graduate: { title: "Pharm.D.", years: 4 }, aliases: ["pharmacy"], license: { name: "NAPLEX", body: "NABP", fee: 520 }, medianPay: 136030, jobGrowth: 5, summary: "Dispense medicines and advise patients on using them safely." }),
  c({ title: "Physician", metaMajor: "health", track: "graduate", bachelor: "B.S. Biology (pre-med)", graduate: { title: "M.D. / D.O.", years: 4 }, training: { title: "Residency", years: 3, earning: true }, aliases: ["doctor", "medical doctor", "médico", "doctora"], license: { name: "USMLE / COMLEX", body: "FSMB / NBOME", fee: 2000 }, medianPay: 239200, jobGrowth: 4, summary: "Diagnose illness and treat patients — the longest path, with the biggest payoff." }),

  // STEM
  c({ title: "Data Scientist", metaMajor: "stem", track: "transfer", bachelor: "B.S. Data Science / Statistics", aliases: ["data", "machine learning", "ai engineer"], medianPay: 108020, jobGrowth: 36, summary: "Find patterns in data and build models that predict what happens next." }),
  c({ title: "Web Developer", metaMajor: "stem", track: "as", programName: "Web Development", aliases: ["web", "frontend", "front-end"], medianPay: 84960, jobGrowth: 8, summary: "Build and maintain websites and web apps." }),
  c({ title: "Environmental Scientist", metaMajor: "stem", track: "transfer", bachelor: "B.S. Environmental Science", aliases: ["environment", "ecology", "marine biologist"], medianPay: 78980, jobGrowth: 7, summary: "Study ecosystems like the Everglades and Biscayne Bay and protect them." }),

  // Business
  c({ title: "Accountant", metaMajor: "business", track: "transfer", bachelor: "B.S. Accounting", aliases: ["cpa", "accounting", "contador"], license: { name: "CPA exam", body: "FL Board of Accountancy", fee: 1000, years: 1, earning: true }, medianPay: 79880, jobGrowth: 6, summary: "Track, audit and plan money for businesses and people." }),
  c({ title: "Financial Analyst", metaMajor: "business", track: "transfer", bachelor: "B.S. Finance", aliases: ["finance", "investment"], medianPay: 99890, jobGrowth: 9, summary: "Help companies and investors make smart money decisions." }),
  c({ title: "Marketing Manager", metaMajor: "business", track: "transfer", bachelor: "B.B.A. Marketing", aliases: ["marketing", "advertising", "social media"], medianPay: 157620, jobGrowth: 8, summary: "Lead campaigns and grow brands — usually after a few years in marketing." }),
  c({ title: "Paralegal", metaMajor: "business", track: "as", programName: "Paralegal Studies", aliases: ["legal assistant"], medianPay: 60970, jobGrowth: 1, summary: "Research cases and prepare documents for lawyers." }),

  // Education
  c({ title: "High School Teacher", metaMajor: "education", track: "transfer", bachelor: "B.S. Secondary Education", aliases: ["teacher", "maestro", "maestra", "profesor"], license: { name: "Florida teacher certification (FTCE)", body: "FL Dept. of Education", fee: 200 }, medianPay: 65220, jobGrowth: 1, summary: "Teach a subject you love to the next generation." }),
  c({ title: "Preschool Teacher", metaMajor: "education", track: "as", programName: "Early Childhood Education", aliases: ["early childhood", "daycare"], medianPay: 37130, jobGrowth: 3, summary: "Help young kids learn and grow in their first classrooms." }),

  // Arts, Humanities, Communication & Design
  c({ title: "Graphic Designer", metaMajor: "arts", track: "as", programName: "Graphic & Interactive Design", aliases: ["designer", "graphic design", "illustrator"], medianPay: 58910, jobGrowth: 2, summary: "Create logos, layouts and visuals that communicate ideas." }),
  c({ title: "Interior Designer", metaMajor: "arts", track: "transfer", bachelor: "B.S. Interior Design", aliases: ["interior"], license: { name: "NCIDQ exam", body: "CIDQ", fee: 1100, years: 2, earning: true }, medianPay: 62510, jobGrowth: 4, summary: "Design spaces that look great and work well." }),
  c({ title: "Film & Video Editor", metaMajor: "arts", track: "as", programName: "Film Production Technology", aliases: ["film", "video", "editor", "youtube"], medianPay: 66600, jobGrowth: 7, summary: "Cut footage into films, shows and videos that tell a story." }),

  // Industry, Manufacturing & Construction
  c({ title: "Electrician", metaMajor: "industry", track: "certificate", programName: "Electricity", aliases: ["electrical", "electricista"], training: { title: "Apprenticeship", years: 4, earning: true }, license: { name: "Journeyman license", body: "FL DBPR" }, medianPay: 61590, jobGrowth: 11, summary: "Install and repair the wiring that powers homes and buildings." }),
  c({ title: "HVAC Technician", metaMajor: "industry", track: "certificate", programName: "HVAC/R", aliases: ["hvac", "air conditioning", "ac tech"], license: { name: "EPA 608 certification", body: "EPA", fee: 150, kind: "certification" }, medianPay: 57300, jobGrowth: 9, summary: "Keep Miami cool — install and fix air conditioning and refrigeration." }),
  c({ title: "Construction Manager", metaMajor: "industry", track: "transfer", bachelor: "B.S. Construction Management", aliases: ["construction", "project manager"], medianPay: 104900, jobGrowth: 9, summary: "Run building projects from budget to final inspection." }),
  c({ title: "Commercial Pilot", metaMajor: "industry", track: "as", programName: "Professional Pilot Technology", aliases: ["pilot", "aviation", "piloto"], training: { title: "Flight hours (CFI)", years: 2, earning: true }, license: { name: "FAA commercial pilot certificate", body: "FAA", fee: 1000, kind: "certification" }, medianPay: 113080, jobGrowth: 5, summary: "Fly aircraft for charter, cargo and regional airlines." }),

  // Public Safety
  c({ title: "Police Officer", metaMajor: "public-safety", track: "certificate", programName: "Law Enforcement Academy", aliases: ["police", "cop", "officer", "policía"], license: { name: "State Officer Certification Exam", body: "FDLE", fee: 100 }, medianPay: 74910, jobGrowth: 3, summary: "Protect the community and respond to emergencies." }),
  c({ title: "Firefighter", metaMajor: "public-safety", track: "certificate", programName: "Firefighter I/II + EMT", aliases: ["fire", "bombero"], license: { name: "Firefighter certification", body: "FL State Fire Marshal" }, medianPay: 57120, jobGrowth: 4, summary: "Fight fires and save lives in emergencies." }),
  c({ title: "Paramedic", metaMajor: "public-safety", track: "certificate", programName: "EMT → Paramedic", aliases: ["emt", "ambulance"], license: { name: "NREMT certification", body: "NREMT", fee: 160 }, medianPay: 39410, jobGrowth: 5, summary: "Give emergency medical care on the way to the hospital." }),

  // Social & Behavioral Sciences
  c({ title: "Social Worker", metaMajor: "social", track: "transfer", bachelor: "B.S.W. Social Work", aliases: ["social work", "case manager", "trabajador social"], medianPay: 58380, jobGrowth: 7, summary: "Help families and individuals get through hard times." }),
  c({ title: "Psychologist", metaMajor: "social", track: "graduate", bachelor: "B.A. Psychology", graduate: { title: "Ph.D. / Psy.D.", years: 5 }, aliases: ["psychology", "therapist", "psicólogo"], license: { name: "EPPP license", body: "ASPPB", fee: 700, years: 1, earning: true }, medianPay: 92740, jobGrowth: 7, summary: "Study behavior and help people with their mental health." }),
  c({ title: "Lawyer", metaMajor: "social", track: "graduate", bachelor: "B.A. Political Science (pre-law)", graduate: { title: "J.D. (law school)", years: 3 }, aliases: ["attorney", "law", "abogado", "abogada"], license: { name: "Florida Bar exam", body: "FL Board of Bar Examiners", fee: 1000 }, medianPay: 145760, jobGrowth: 5, summary: "Advise clients and argue cases in court." }),
];

export const CATALOG = SPECS.map(buildCareer);
