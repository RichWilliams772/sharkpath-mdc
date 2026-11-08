import "server-only"; // build error if a client component ever imports this file
import postgres from "postgres";

// Tiger Data (Postgres) connection, server-side only. DATABASE_URL has no
// NEXT_PUBLIC_ prefix, so Next.js never puts it in browser code.
//
// Vercel runs many small, short-lived server instances, so each one keeps at
// most ONE connection, closes it when idle, and reuses it across requests
// (and across hot reloads in dev, via globalThis).

export const dbEnabled = Boolean(process.env.DATABASE_URL);

const globalForDb = globalThis as unknown as { sharkpathSql?: postgres.Sql };

export function db(): postgres.Sql {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  globalForDb.sharkpathSql ??= postgres(process.env.DATABASE_URL, {
    max: 1, // one connection per server instance
    idle_timeout: 20, // seconds; free the connection when the function goes quiet
    connect_timeout: 10,
  });
  return globalForDb.sharkpathSql;
}
