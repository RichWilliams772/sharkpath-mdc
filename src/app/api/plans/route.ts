// Saved plans, stored in Tiger Data's `saved_plans` table (db/schema.sql).
// Contract: src/lib/api/plans.ts — GET → SavedPlan[] · POST SavedPlan · DELETE ?id=
//
// 501 when Auth0 or the database isn't configured, so the UI falls back to
// browser storage. The owner always comes from the Auth0 session, never the body.

import type postgres from "postgres";
import { auth0 } from "@/lib/auth0";
import { db, dbEnabled } from "@/lib/db";
import type { SavedPlan } from "@/types/roadmap";

interface PlanRow {
  id: string;
  name: string;
  owner_id: string;
  created_at: Date;
  inputs: SavedPlan["inputs"];
  career: SavedPlan["career"] | null;
  summary_years_to_career: string | number;
  summary_net_cost: string | number;
  summary_break_even_year: number | null;
}

const toPlan = (r: PlanRow): SavedPlan => ({
  id: r.id,
  name: r.name,
  ownerId: r.owner_id,
  createdAt: r.created_at.toISOString(),
  inputs: r.inputs,
  ...(r.career ? { career: r.career } : {}),
  summary: {
    yearsToCareer: Number(r.summary_years_to_career),
    netCost: Number(r.summary_net_cost),
    breakEvenYear: r.summary_break_even_year,
  },
});

/** The signed-in user's id, or a Response to return early. */
async function owner(): Promise<string | Response> {
  if (!auth0 || !dbEnabled) return new Response("Saved plans backend not configured", { status: 501 });
  const session = await auth0.getSession();
  if (!session?.user?.sub) return new Response("Sign in to save plans", { status: 401 });
  return session.user.sub;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function parsePlan(body: unknown): SavedPlan | null {
  const p = body as Partial<SavedPlan> | null;
  if (!p || typeof p !== "object") return null;
  if (typeof p.id !== "string" || !p.id || p.id.length > 200) return null;
  if (typeof p.name !== "string" || !p.name || p.name.length > 200) return null;
  if (!p.inputs || typeof p.inputs !== "object") return null;
  const s = p.summary;
  if (!s || !isNum(s.yearsToCareer) || !isNum(s.netCost)) return null;
  if (s.breakEvenYear !== null && !Number.isInteger(s.breakEvenYear)) return null;
  return p as SavedPlan;
}

export async function GET() {
  const me = await owner();
  if (me instanceof Response) return me;
  const rows = await db()<PlanRow[]>`
    SELECT * FROM saved_plans WHERE owner_id = ${me} ORDER BY created_at DESC LIMIT 200`;
  return Response.json(rows.map(toPlan));
}

export async function POST(request: Request) {
  const me = await owner();
  if (me instanceof Response) return me;
  const plan = parsePlan(await request.json().catch(() => null));
  if (!plan) return new Response("Invalid plan", { status: 400 });

  const createdAt = Number.isNaN(Date.parse(plan.createdAt)) ? new Date() : new Date(plan.createdAt);
  // Upsert, but only ever overwrite a plan this user already owns.
  const sql = db();
  const json = (v: unknown) => sql.json(v as postgres.JSONValue);
  const rows = await sql<PlanRow[]>`
    INSERT INTO saved_plans
      (id, name, owner_id, created_at, inputs, career,
       summary_years_to_career, summary_net_cost, summary_break_even_year)
    VALUES (${plan.id}, ${plan.name}, ${me}, ${createdAt}, ${json(plan.inputs)},
            ${plan.career ? json(plan.career) : null},
            ${plan.summary.yearsToCareer}, ${plan.summary.netCost}, ${plan.summary.breakEvenYear})
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, inputs = EXCLUDED.inputs, career = EXCLUDED.career,
      summary_years_to_career = EXCLUDED.summary_years_to_career,
      summary_net_cost = EXCLUDED.summary_net_cost,
      summary_break_even_year = EXCLUDED.summary_break_even_year
    WHERE saved_plans.owner_id = EXCLUDED.owner_id
    RETURNING *`;
  if (rows.length === 0) return new Response("Plan id belongs to another user", { status: 409 });
  return Response.json(toPlan(rows[0]), { status: 201 });
}

export async function DELETE(request: Request) {
  const me = await owner();
  if (me instanceof Response) return me;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return new Response("Missing ?id=", { status: 400 });
  await db()`DELETE FROM saved_plans WHERE id = ${id} AND owner_id = ${me}`;
  return new Response(null, { status: 204 });
}
