// GET /api/careers/:id → one full Career (src/types/roadmap.ts), read from Tiger Data.

import { connection } from "next/server";
import { loadCareers } from "@/lib/careers/from-db";
import { dbEnabled } from "@/lib/db";

export async function GET(_request: Request, ctx: RouteContext<"/api/careers/[id]">) {
  await connection();
  if (!dbEnabled) return new Response("Database not configured", { status: 501 });
  const { id } = await ctx.params;
  try {
    const [career] = await loadCareers([id]);
    if (!career) return new Response(`No career "${id}"`, { status: 404 });
    return Response.json(career);
  } catch (err) {
    console.error(`GET /api/careers/${id} failed`, err);
    return new Response("Could not load career", { status: 500 });
  }
}
