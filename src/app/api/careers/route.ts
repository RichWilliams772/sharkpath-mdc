// GET /api/careers → Career[] (src/types/roadmap.ts), read from Tiger Data.

import { connection } from "next/server";
import { loadCareers } from "@/lib/careers/from-db";
import { dbEnabled } from "@/lib/db";

export async function GET() {
  await connection(); // run per request, never at build time
  if (!dbEnabled) return new Response("Database not configured", { status: 501 });
  try {
    return Response.json(await loadCareers());
  } catch (err) {
    console.error("GET /api/careers failed", err);
    return new Response("Could not load careers", { status: 500 });
  }
}
