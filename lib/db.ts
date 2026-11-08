import { Pool } from "pg";
import seed from "./seed.json";

// Three-layer cache for generated roadmaps and route details:
//   1. memory (this server process)
//   2. lib/seed.json — pregenerated results for the demo careers, committed so the demo is instant
//   3. TigerData (Timescale Postgres) when DATABASE_URL is set, so every generation is kept

type Kind = "roadmap" | "detail";
const memory = new Map<string, unknown>();
const SEED = seed as Record<string, unknown>;

let pool: Pool | null = null;
let ready: Promise<void> | null = null;

function db() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3 });
    ready = pool
      .query(`create table if not exists sharkpath_cache (
        key text primary key,
        kind text not null,
        data jsonb not null,
        created_at timestamptz not null default now()
      )`)
      .then(() => undefined);
  }
  return pool;
}

export const cacheKey = (kind: Kind, ...parts: string[]) => `${kind}|${parts.map((p) => p.trim().toLowerCase()).join("|")}`;

export async function getCached<T>(key: string): Promise<{ data: T; from: "cache" | "seed" } | null> {
  if (memory.has(key)) return { data: memory.get(key) as T, from: "cache" };
  if (key in SEED) return { data: SEED[key] as T, from: "seed" };
  const p = db();
  if (!p) return null;
  try {
    await ready;
    const r = await p.query("select data from sharkpath_cache where key = $1", [key]);
    if (!r.rows[0]) return null;
    memory.set(key, r.rows[0].data);
    return { data: r.rows[0].data as T, from: "cache" };
  } catch (e) {
    console.error("TigerData read failed", e);
    return null;
  }
}

export async function putCached(key: string, data: unknown) {
  memory.set(key, data);
  const p = db();
  if (!p) return;
  try {
    await ready;
    await p.query(
      "insert into sharkpath_cache (key, kind, data) values ($1, $2, $3) on conflict (key) do update set data = excluded.data, created_at = now()",
      [key, key.split("|")[0], data],
    );
  } catch (e) {
    console.error("TigerData write failed", e);
  }
}
