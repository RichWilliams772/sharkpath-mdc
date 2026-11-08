// ⚠️ Sample dates — the Data team should confirm each against the source.

import type { Deadline } from "@/types/roadmap";
import { SOURCES as S } from "./sources";

export const DEADLINES: Deadline[] = [
  { id: "fafsa-open-27", date: "2026-10-01", title: "FAFSA 2027–28 opens", description: "Apply early — some aid is first come, first served.", category: "financial-aid", careerIds: [], source: S.fafsa },
  { id: "mdc-spring-apply", date: "2026-12-04", title: "MDC Spring 2027 application priority date", description: "Submit your MDC application and transcripts.", category: "admissions", careerIds: [], source: S.mdcCalendar },
  { id: "mdc-spring-start", date: "2027-01-06", title: "Spring 2027 classes begin", description: "First day of the Spring term at MDC.", category: "registration", careerIds: [], source: S.mdcCalendar },
  { id: "mdc-foundation", date: "2027-03-01", title: "MDC Foundation scholarship deadline", description: "One application covers hundreds of MDC scholarships.", category: "scholarship", careerIds: [], source: S.mdcCalendar },
  { id: "fiu-fall-transfer", date: "2027-03-15", title: "FIU Fall 2027 transfer priority deadline", description: "Apply to FIU for your bachelor's after your A.A.", category: "admissions", careerIds: ["architect", "civil-engineer", "software-developer"], source: S.fiuAdmissions },
  { id: "mdc-fall-reg", date: "2027-04-12", title: "Fall 2027 registration opens", description: "Register early to get the sections you need.", category: "registration", careerIds: [], source: S.mdcCalendar },
  { id: "servsafe-before-lab", date: "2027-05-01", title: "Schedule your ServSafe Manager exam", description: "Needed before advanced kitchen labs and most chef jobs.", category: "exam", careerIds: ["chef"], source: S.servSafe },
  { id: "secplus-plan", date: "2027-05-15", title: "Book CompTIA Security+ exam", description: "Plan to test after Network Defense & Countermeasures.", category: "exam", careerIds: ["cybersecurity-analyst"], source: S.comptiaSecurityPlus },
  { id: "fafsa-close-27", date: "2027-06-30", title: "FAFSA 2026–27 final deadline", description: "Last day to submit for the current school year.", category: "financial-aid", careerIds: [], source: S.fafsa },
  { id: "bright-futures", date: "2027-08-31", title: "Bright Futures application window", description: "Check eligibility and complete the Florida Financial Aid Application.", category: "scholarship", careerIds: [], source: S.brightFutures },
  { id: "fe-exam-plan", date: "2027-09-01", title: "Create your NCEES account", description: "Engineering students take the FE exam in their final year.", category: "exam", careerIds: ["civil-engineer"], source: S.nceesFe },
  { id: "ncarb-record", date: "2027-09-15", title: "Start your NCARB Record", description: "Start logging AXP hours as soon as you work in a firm.", category: "exam", careerIds: ["architect"], source: S.ncarbAre },
];
