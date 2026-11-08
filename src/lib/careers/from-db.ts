import "server-only";
import { db } from "@/lib/db";
import type {
  Career,
  CareerTrack,
  Course,
  MetaMajorId,
  PathwayRoute,
  PathwayStage,
  Program,
  QuizTrait,
  Source,
  Sourced,
  StageKind,
} from "@/types/roadmap";

// Rebuilds full `Career` objects (src/types/roadmap.ts) from the Tiger Data
// tables in db/schema.sql. Six queries in total, however many careers you ask
// for — never one query per career.

type Num = string | number; // Postgres NUMERIC arrives as a string

interface SourceRow { id: string; label: string; title: string; url: string; as_of: string | null; verified: boolean }
interface ProgramRow { id: string; name: string; degree: Program["degree"]; school: string; total_credits_value: Num; total_credits_unit: string | null; total_credits_source_id: string }
interface CourseRow { program_id: string; code: string; title: string; credits: Num; category: Course["category"] }
interface StageRow {
  career_id: string; id: string; kind: StageKind; title: string; subtitle: string | null; column_hint: number | null;
  years_value: Num | null; years_unit: string | null; years_source_id: string | null;
  fee_value: Num | null; fee_unit: string | null; fee_source_id: string | null;
  earning_while_in_stage: boolean | null;
}
interface RouteRow { career_id: string; id: string; label: string; stage_ids: string[]; requires_bachelors: boolean }
interface CareerRow {
  id: string; title: string; summary: string; origin: Career["origin"]; meta_major: MetaMajorId; track: CareerTrack;
  aliases: string[]; traits: QuizTrait[];
  median_pay_value: Num; median_pay_unit: string | null; median_pay_source_id: string;
  job_growth_value: Num; job_growth_unit: string | null; job_growth_source_id: string;
  entry_pay_value: Num; entry_pay_unit: string | null; entry_pay_source_id: string;
  typical_entry_education_value: string; typical_entry_education_source_id: string;
  license_name: string | null; license_body: string | null; license_url: string | null;
  program_id: string;
}

const groupBy = <T>(rows: readonly T[], key: (r: T) => string) => {
  const map = new Map<string, T[]>();
  for (const r of rows) map.set(key(r), [...(map.get(key(r)) ?? []), r]);
  return map;
};

/** Every career with its program, courses, stages, routes and sources. `ids` limits which ones. */
export async function loadCareers(ids?: string[]): Promise<Career[]> {
  const sql = db();
  const careers = await sql<CareerRow[]>`
    SELECT * FROM careers ${ids ? sql`WHERE id = ANY(${ids})` : sql``} ORDER BY title`;
  if (careers.length === 0) return [];

  const careerIds = careers.map((c) => c.id);
  const programIds = [...new Set(careers.map((c) => c.program_id))];

  // Everything else, fetched together.
  const [programs, courses, stages, routes] = await Promise.all([
    sql<ProgramRow[]>`SELECT * FROM programs WHERE id = ANY(${programIds})`,
    sql<CourseRow[]>`SELECT * FROM program_courses WHERE program_id = ANY(${programIds}) ORDER BY program_id, position`,
    sql<StageRow[]>`SELECT * FROM pathway_stages WHERE career_id = ANY(${careerIds}) ORDER BY career_id, position`,
    sql<RouteRow[]>`SELECT * FROM pathway_routes WHERE career_id = ANY(${careerIds}) ORDER BY career_id, position`,
  ]);

  // Only the sources these careers actually cite.
  const sourceIds = new Set<string>();
  for (const c of careers)
    [c.median_pay_source_id, c.job_growth_source_id, c.entry_pay_source_id, c.typical_entry_education_source_id].forEach((s) => sourceIds.add(s));
  for (const p of programs) sourceIds.add(p.total_credits_source_id);
  for (const s of stages) [s.years_source_id, s.fee_source_id].forEach((id) => id && sourceIds.add(id));
  const sourceRows = await sql<SourceRow[]>`SELECT * FROM sources WHERE id = ANY(${[...sourceIds]})`;

  // ── Rows → roadmap.ts shapes ──
  const sources = new Map(
    sourceRows.map((r): [string, Source] => [
      r.id,
      { id: r.id, label: r.label, title: r.title, url: r.url, ...(r.as_of != null && { asOf: r.as_of }), verified: r.verified },
    ]),
  );
  const source = (id: string): Source => {
    const s = sources.get(id);
    if (!s) throw new Error(`Missing source ${id}`);
    return s;
  };
  const sourced = (value: Num, unit: string | null, sourceId: string): Sourced => ({
    value: Number(value),
    ...(unit != null && { unit }),
    source: source(sourceId),
  });

  const coursesByProgram = groupBy(courses, (c) => c.program_id);
  const programById = new Map(
    programs.map((p): [string, Program] => [
      p.id,
      {
        id: p.id,
        name: p.name,
        degree: p.degree,
        school: p.school,
        totalCredits: sourced(p.total_credits_value, p.total_credits_unit, p.total_credits_source_id),
        courses: (coursesByProgram.get(p.id) ?? []).map((c) => ({
          code: c.code,
          title: c.title,
          credits: Number(c.credits),
          category: c.category,
        })),
      },
    ]),
  );

  const stagesByCareer = groupBy(stages, (s) => s.career_id);
  const routesByCareer = groupBy(routes, (r) => r.career_id);

  const toStage = (s: StageRow): PathwayStage => ({
    id: s.id,
    kind: s.kind,
    title: s.title,
    ...(s.subtitle != null && { subtitle: s.subtitle }),
    ...(s.column_hint != null && { column: s.column_hint }),
    ...(s.years_value != null && s.years_source_id && { years: sourced(s.years_value, s.years_unit, s.years_source_id) }),
    ...(s.fee_value != null && s.fee_source_id && { fee: sourced(s.fee_value, s.fee_unit, s.fee_source_id) }),
    ...(s.earning_while_in_stage != null && { earningWhileInStage: s.earning_while_in_stage }),
  });

  const toRoute = (r: RouteRow): PathwayRoute => ({
    id: r.id,
    label: r.label,
    stageIds: r.stage_ids,
    requiresBachelors: r.requires_bachelors,
  });

  return careers.map((c): Career => {
    const program = programById.get(c.program_id);
    if (!program) throw new Error(`Missing program ${c.program_id}`);
    return {
      id: c.id,
      title: c.title,
      summary: c.summary,
      origin: c.origin,
      metaMajor: c.meta_major,
      track: c.track,
      ...(c.aliases.length > 0 && { aliases: c.aliases }),
      traits: c.traits,
      medianPay: sourced(c.median_pay_value, c.median_pay_unit, c.median_pay_source_id),
      jobGrowth: sourced(c.job_growth_value, c.job_growth_unit, c.job_growth_source_id),
      entryPay: sourced(c.entry_pay_value, c.entry_pay_unit, c.entry_pay_source_id),
      typicalEntryEducation: { value: c.typical_entry_education_value, source: source(c.typical_entry_education_source_id) },
      ...(c.license_name && c.license_body && c.license_url && {
        license: { name: c.license_name, body: c.license_body, url: c.license_url },
      }),
      program,
      stages: (stagesByCareer.get(c.id) ?? []).map(toStage),
      routes: (routesByCareer.get(c.id) ?? []).map(toRoute),
    };
  });
}
