import { Pool } from "pg";

// Tiger Data (Postgres) connection. Server-only: never import from a client component.
// One small pool per server instance, reused across requests and hot reloads.

export const dbEnabled = Boolean(process.env.DATABASE_URL);

const globalForDb = globalThis as unknown as { sharkpathPool?: Pool };

export function db(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  globalForDb.sharkpathPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 10_000,
  });
  return globalForDb.sharkpathPool;
}
