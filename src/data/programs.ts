// MDC programs for the 5 careers, in recommended course order.
// ⚠️ Sample course lists — replaced by the Data team's MDC catalog rows.

import { buildProgram } from "@/lib/careers/generate";
import type { Course, Program } from "@/types/roadmap";
import { SOURCES as S } from "./sources";

type Cat = Course["category"];
const c = (code: string, title: string, credits: number, category: Cat = "program-core"): Course => ({
  code,
  title,
  credits,
  category,
});
const g = (code: string, title: string, credits = 3) => c(code, title, credits, "general-education");

const ENC1101 = g("ENC1101", "English Composition I");
const ENC1102 = g("ENC1102", "English Composition II");
const MAC1105 = g("MAC1105", "College Algebra");
const SPC1017 = g("SPC1017", "Fundamentals of Speech");
const PSY2012 = g("PSY2012", "Introduction to Psychology");
const HUM1020 = g("HUM1020", "Introduction to Humanities");
const AMH2020 = g("AMH2020", "U.S. History Since 1877");
const POS2041 = g("POS2041", "American Government");

const credits = { value: 60, unit: "credits", source: S.mdcCatalog };

export const PROGRAMS: Program[] = [
  {
    id: "mdc-aa-architecture",
    name: "Associate in Arts · Pre-Architecture",
    degree: "A.A.",
    school: "School of Architecture & Interior Design",
    totalCredits: credits,
    courses: [
      ENC1101, MAC1105, c("ARC1301", "Architectural Design I", 4), HUM1020,
      ENC1102, g("MAC1147", "Precalculus", 5), c("ARC1302", "Architectural Design II", 4),
      c("ARC1701", "History of Architecture I", 3), g("PHY2053", "College Physics I + Lab", 4), c("ARC2303", "Architectural Design III", 4),
      SPC1017, c("ARC1702", "History of Architecture II", 3), c("ARC2304", "Architectural Design IV", 4),
      c("ARC1461", "Materials & Methods of Construction", 3), PSY2012, AMH2020, POS2041,
      c("ARC2201", "Theory of Architecture", 2, "elective"),
    ],
  },
  {
    id: "mdc-aa-engineering",
    name: "Associate in Arts · Pre-Engineering",
    degree: "A.A.",
    school: "School of Engineering & Technology",
    totalCredits: credits,
    courses: [
      ENC1101, c("MAC2311", "Calculus I", 4), c("EGS1006", "Introduction to Engineering", 3), c("SLS1106", "First-Year Experience", 1, "elective"),
      ENC1102, c("MAC2312", "Calculus II", 4), c("CHM1045", "General Chemistry I + Lab", 4), SPC1017,
      c("MAC2313", "Calculus III", 4), c("PHY2048", "Physics with Calculus I + Lab", 5), c("COP2271", "MATLAB for Engineers", 3),
      c("MAP2302", "Differential Equations", 3), c("PHY2049", "Physics with Calculus II + Lab", 5), c("EGN2312", "Statics", 3),
      g("ECO2013", "Principles of Macroeconomics"), HUM1020, AMH2020, POS2041,
    ],
  },
  {
    id: "mdc-as-cybersecurity",
    name: "Associate in Science · Cybersecurity",
    degree: "A.S.",
    school: "School of Engineering & Technology",
    totalCredits: credits,
    courses: [
      ENC1101, MAC1105, c("CGS1060C", "Introduction to Computer Technology", 4), c("CTS1134", "Networking Technologies", 4),
      c("CTS1120", "Cybersecurity Fundamentals", 4), c("CTS1111", "Linux Administration", 4), SPC1017, c("COP1047", "Python Programming", 3),
      c("CTS1650", "Cisco Networking I", 4), c("CTS1328", "Windows Server Administration", 4), PSY2012,
      c("CTS2314", "Network Defense & Countermeasures", 4), c("CIS2352", "Ethical Hacking", 4), HUM1020,
      c("CIS2350", "Digital Forensics", 4), c("CIS2353", "Incident Response", 4), c("CGS2940", "Cybersecurity Internship", 2, "elective"),
    ],
  },
  {
    id: "mdc-as-culinary",
    name: "Associate in Science · Culinary Arts Management",
    degree: "A.S.",
    school: "Miami Culinary Institute",
    totalCredits: credits,
    courses: [
      c("FOS2201", "Food Service Sanitation (ServSafe)", 3), c("FSS1221C", "Culinary Fundamentals I", 4), c("HFT1000", "Introduction to Hospitality", 3), ENC1101,
      c("FSS1222C", "Culinary Fundamentals II", 4), c("FSS1246C", "Baking & Pastry", 4), MAC1105, SPC1017,
      c("FSS1063C", "Garde Manger", 3), c("FSS2242C", "International Cuisine", 4), c("FSS2120", "Purchasing & Cost Control", 3), PSY2012,
      c("FSS2284C", "Catering & Banquets", 3), c("FSS2500", "Menu Planning & Nutrition", 3), c("HFT2600", "Hospitality Law", 3), HUM1020,
      c("HFT1410", "Front of House Operations", 3), c("FSS2941", "Culinary Internship", 5, "elective"),
    ],
  },
  {
    id: "mdc-as-programming",
    name: "Associate in Science · Computer Programming & Analysis",
    degree: "A.S.",
    school: "School of Engineering & Technology",
    totalCredits: credits,
    courses: [
      ENC1101, MAC1105, c("CGS1060C", "Introduction to Computer Technology", 4), c("COP1047", "Python Programming", 3),
      c("COP1334", "Introduction to C++ Programming", 4), c("COP2800", "Java Programming", 4), SPC1017,
      c("COP2805", "Advanced Java Programming", 4), c("COP2822", "Web Development", 4), c("CTS2437", "Database Systems", 4), PSY2012,
      c("COP2836", "Full-Stack Web Applications", 4), c("CIS2321", "Systems Analysis & Design", 3), HUM1020,
      c("COP2900", "Mobile App Development", 4), c("CEN2721", "UX Design for Developers", 3), c("CGS2940", "Software Internship", 4, "elective"),
    ],
  },
];

// Mechanical: MDC lists an "Engineering - Mechanical" A.A. pathway (mdc.edu/entec/programs.aspx).
// Its course list isn't published in a readable form, so it uses the same sample
// lower-division engineering sequence as Pre-Engineering (unverified).
const preEngineering = PROGRAMS.find((p) => p.id === "mdc-aa-engineering")!;
PROGRAMS.push({ ...preEngineering, id: "mdc-aa-mechanical-engineering", name: "Associate in Arts · Engineering - Mechanical" });

// IT Consultant: MDC's "Computer Information Technology Associate in Science". Courses come
// from the STEM meta-major pool (placeholder titles), like other catalog A.S. programs.
PROGRAMS.push({
  ...buildProgram({ title: "IT Consultant", metaMajor: "stem", track: "as", origin: "catalog", programName: "Computer Information Technology" }, "cit"),
  school: "School of Engineering & Technology",
});

export const programById = (id: string) => PROGRAMS.find((p) => p.id === id)!;
