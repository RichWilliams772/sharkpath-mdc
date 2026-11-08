import "server-only";
import { createHash } from "node:crypto";
import { db, dbEnabled } from "@/lib/db";

// Basic per-visitor rate limit for the AI routes, shared across Vercel instances
// through Tiger Data (table ai_rate_limits). Visitors are identified by a SHA-256
// hash of route + IP address; raw IPs are never stored.
// If the database is unreachable it falls back to a per-instance in-memory counter.

export interface Limit {
  /** Route name, e.g. "chat" */
  name: string;
  /** Requests allowed per window */
  max: number;
  windowSeconds: number;
}

export interface LimitResult {
  ok: boolean;
  /** Seconds until the window resets (for Retry-After) */
  retryAfter: number;
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

const memory = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(request: Request, limit: Limit): Promise<LimitResult> {
  const bucket = createHash("sha256").update(`${limit.name}:${clientIp(request)}`).digest("hex");
  const windowMs = limit.windowSeconds * 1000;
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const retryAfter = Math.ceil((windowStart + windowMs - Date.now()) / 1000);

  if (dbEnabled) {
    try {
      const sql = db();
      const [row] = await sql<{ count: number }[]>`
        INSERT INTO ai_rate_limits (bucket, window_start, count)
        VALUES (${bucket}, ${new Date(windowStart)}, 1)
        ON CONFLICT (bucket, window_start) DO UPDATE SET count = ai_rate_limits.count + 1
        RETURNING count`;
      // Now and then, drop windows older than a day so the table stays small.
      if (Math.random() < 0.02) void sql`DELETE FROM ai_rate_limits WHERE window_start < now() - interval '1 day'`.catch(() => {});
      return { ok: row.count <= limit.max, retryAfter };
    } catch (err) {
      console.error("rateLimit: database unavailable, using in-memory counter", err);
    }
  }

  const entry = memory.get(bucket);
  if (!entry || entry.resetAt <= Date.now()) {
    memory.set(bucket, { count: 1, resetAt: windowStart + windowMs });
    return { ok: true, retryAfter };
  }
  entry.count += 1;
  return { ok: entry.count <= limit.max, retryAfter };
}

export const tooMany = (r: LimitResult) =>
  new Response("Too many requests — please wait a moment and try again.", {
    status: 429,
    headers: { "Retry-After": String(r.retryAfter) },
  });
