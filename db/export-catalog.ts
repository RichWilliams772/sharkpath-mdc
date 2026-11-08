// Writes SQL from src/data, in the db/schema.sql layout:
//   db/seed-catalog.sql     the catalog careers (src/data/catalog.ts)
//   db/seed-core-added.sql  core careers added after db/seed.sql (Mechanical Engineer, IT Consultant)
//
//   npx tsx --tsconfig tsconfig.json db/export-catalog.ts
//
// Fails instead of guessing if two careers disagree about a shared program
// or source, or if a row would break a schema rule.

import { writeFileSync } from "node:fs";
import { CORE } from "@/data/careers";
import { CATALOG } from "@/data/catalog";
import type { Career, Program, Source } from "@/types/roadmap";

/** Core careers that aren't in db/seed.sql (which holds the original 5). */
const CORE_ADDED = ["mechanical-engineer", "it-consultant"];
/** Sources the added careers used to cite when they were generated from the catalog. */
const RETIRED_SOURCES = ["lic-mechanical-engineer"];

const q = (v: string | number | boolean | null | undefined): string =>
  v === null || v === undefined ? "NULL" : typeof v === "string" ? `'${v.replace(/'/g, "''")}'` : String(v);
const arr = (xs: string[]) => (xs.length ? `ARRAY[${xs.map(q).join(", ")}]` : "'{}'::text[]");
const fail = (msg: string): never => {
  throw new Error(msg);
};

function sourcesOf(c: Career): Source[] {
  return [c.medianPay.source, c.jobGrowth.source, c.entryPay.source, c.typicalEntryEducation.source, c.program.totalCredits.source,
    ...c.stages.flatMap((s) => [s.years?.source, s.fee?.source]), ...(c.notes ?? []).map((n) => n.source)].filter((s): s is Source => !!s);
}

/** Collect unique sources/programs, refusing conflicting duplicates and schema violations. */
function collect(careers: Career[]) {
  const sources = new Map<string, Source>();
  const programs = new Map<string, Program>();
  for (const c of careers) {
    if (c.typicalEntryEducation.unit) fail(`${c.id}: typicalEntryEducation.unit has no column`);
    for (const s of sourcesOf(c)) {
      const prev = sources.get(s.id);
      if (prev && JSON.stringify(prev) !== JSON.stringify(s)) fail(`Source "${s.id}" has two different versions`);
      sources.set(s.id, s);
    }
    const prev = programs.get(c.program.id);
    if (prev && JSON.stringify(prev) !== JSON.stringify(c.program)) fail(`Program "${c.program.id}" differs between careers`);
    programs.set(c.program.id, c.program);
    const codes = new Set<string>();
    for (const course of c.program.courses) {
      if (codes.has(course.code)) fail(`${c.program.id}: course code ${course.code} repeats`);
      if (!(course.credits > 0)) fail(`${c.program.id}: ${course.code} has ${course.credits} credits`);
      codes.add(course.code);
    }
  }
  return { sources, programs };
}

const sourceCols = "INSERT INTO sources (id, label, title, url, as_of, verified, checked_on) VALUES";
const sourceRow = (s: Source) => `  (${[s.id, s.label, s.title, s.url, s.asOf, s.verified].map(q).join(", ")}, ${s.checkedOn ? `DATE ${q(s.checkedOn)}` : "NULL"})`;

function careerSql(careers: Career[], programs: Program[]): string[] {
  const out: string[] = [];
  const values = (rows: string[]) => rows.join(",\n") + ";";
  if (programs.length) {
    out.push("INSERT INTO programs (id, name, degree, school, total_credits_value, total_credits_unit, total_credits_source_id) VALUES",
      values(programs.map((p) => `  (${[p.id, p.name, p.degree, p.school, p.totalCredits.value, p.totalCredits.unit, p.totalCredits.source.id].map(q).join(", ")})`)), "",
      "INSERT INTO program_courses (program_id, position, code, title, credits, category) VALUES",
      values(programs.flatMap((p) => p.courses.map((c, i) => `  (${[p.id, i + 1, c.code, c.title, c.credits, c.category].map(q).join(", ")})`))), "");
  }
  out.push(
    "INSERT INTO careers (id, title, summary, origin, meta_major, track, aliases, traits,",
    "  median_pay_value, median_pay_unit, median_pay_source_id, job_growth_value, job_growth_unit, job_growth_source_id,",
    "  entry_pay_value, entry_pay_unit, entry_pay_source_id, typical_entry_education_value, typical_entry_education_source_id,",
    "  license_name, license_body, license_url, program_id) VALUES",
    values(careers.map((c) =>
      `  (${[c.id, c.title, c.summary, c.origin, c.metaMajor, c.track].map(q).join(", ")}, ${arr(c.aliases ?? [])}, ${arr(c.traits)},\n   ` +
      [c.medianPay.value, c.medianPay.unit, c.medianPay.source.id, c.jobGrowth.value, c.jobGrowth.unit, c.jobGrowth.source.id,
        c.entryPay.value, c.entryPay.unit, c.entryPay.source.id, c.typicalEntryEducation.value, c.typicalEntryEducation.source.id,
        c.license?.name, c.license?.body, c.license?.url, c.program.id].map(q).join(", ") + ")")),
    "",
    "INSERT INTO pathway_stages (career_id, id, position, kind, title, subtitle, column_hint,",
    "  years_value, years_unit, years_source_id, fee_value, fee_unit, fee_source_id, earning_while_in_stage, after_first_job, at_start_school) VALUES",
    values(careers.flatMap((c) => c.stages.map((s, i) =>
      `  (${[c.id, s.id, i + 1, s.kind, s.title, s.subtitle, s.column, s.years?.value, s.years?.unit, s.years?.source.id,
        s.fee?.value, s.fee?.unit, s.fee?.source.id, s.earningWhileInStage, s.afterFirstJob, s.atStartSchool].map(q).join(", ")})`))),
    "",
    "INSERT INTO pathway_routes (career_id, id, position, label, stage_ids, requires_bachelors) VALUES",
    values(careers.flatMap((c) => c.routes.map((r, i) => `  (${[c.id, r.id, i + 1, r.label].map(q).join(", ")}, ${arr(r.stageIds)}, ${q(r.requiresBachelors)})`))),
    "",
  );
  const notes = careers.flatMap((c) => (c.notes ?? []).map((n, i) => `  (${[c.id, i + 1, n.text, n.source.id].map(q).join(", ")})`));
  if (notes.length) out.push("INSERT INTO career_notes (career_id, position, text, source_id) VALUES", values(notes), "");
  return out;
}

// ── Checks across everything ──
const ids = new Set<string>();
const routeIds = new Set<string>();
for (const c of [...CORE, ...CATALOG]) {
  if (ids.has(c.id)) fail(`Career id "${c.id}" appears twice`);
  ids.add(c.id);
  for (const r of c.routes) {
    if (routeIds.has(r.id)) fail(`Route id "${r.id}" repeats (must be unique)`);
    routeIds.add(r.id);
  }
}
const added = CORE_ADDED.map((id) => CORE.find((c) => c.id === id) ?? fail(`Core career ${id} not found`));
for (const c of CATALOG) if (c.origin !== "catalog") fail(`${c.id}: origin is ${c.origin}`);
const coreSources = new Set(CORE.flatMap(sourcesOf).map((s) => s.id));
const corePrograms = new Set(CORE.map((c) => c.program.id));
for (const c of CATALOG) if (corePrograms.has(c.program.id)) fail(`${c.id}: program ${c.program.id} clashes with a core career's program`);
collect([...CORE, ...CATALOG]); // one consistent version of every shared source and program

// ── db/seed-catalog.sql ──
{
  const { sources, programs } = collect(CATALOG);
  const newSources = [...sources.values()].filter((s) => !coreSources.has(s.id));
  const out = [
    "-- SharkPath catalog careers: generated by db/export-catalog.ts from src/data/catalog.ts.",
    "-- Run after db/schema.sql and db/seed.sql. Don't edit by hand; re-run the script.",
    "",
    "BEGIN;",
    "",
    sourceCols,
    newSources.map(sourceRow).join(",\n"),
    // seed.sql may already hold some of these shared citations; keep its rows.
    "ON CONFLICT (id) DO NOTHING;",
    "",
    ...careerSql(CATALOG, [...programs.values()]),
    "COMMIT;",
    "",
  ];
  writeFileSync("db/seed-catalog.sql", out.join("\n"));
  console.log(`db/seed-catalog.sql: ${CATALOG.length} careers, ${programs.size} programs, ${newSources.length} sources`);
}

// ── db/seed-core-added.sql ──
{
  const { sources, programs } = collect(added);
  const out = [
    "-- SharkPath core careers added after db/seed.sql: generated by db/export-catalog.ts from src/data/careers.ts.",
    "-- Run after db/seed-catalog.sql and db/migrations/*. Safe to re-run (replaces these careers). Don't edit by hand.",
    "",
    "BEGIN;",
    "",
    `DELETE FROM careers WHERE id IN (${added.map((c) => q(c.id)).join(", ")});`,
    `DELETE FROM programs WHERE id IN (${[...programs.keys()].map(q).join(", ")});`,
    "",
    // These careers' sources are canonical in src/data, so update any existing rows to match.
    sourceCols,
    [...sources.values()].map(sourceRow).join(",\n"),
    "ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, title = EXCLUDED.title, url = EXCLUDED.url,",
    "  as_of = EXCLUDED.as_of, verified = EXCLUDED.verified, checked_on = EXCLUDED.checked_on;",
    "",
    ...careerSql(added, [...programs.values()]),
    `DELETE FROM sources WHERE id IN (${RETIRED_SOURCES.map(q).join(", ")});`,
    "",
    "COMMIT;",
    "",
  ];
  writeFileSync("db/seed-core-added.sql", out.join("\n"));
  console.log(`db/seed-core-added.sql: ${added.length} careers, ${programs.size} programs, ${sources.size} sources`);
}
