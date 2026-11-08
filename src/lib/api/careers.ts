// Turn any career a student types into a plannable Career.
// Real version: AI/Backend implements ENDPOINTS.resolveCareer (Gemini grounded
// in Tiger Data + pgvector catalog). Fallback: local generator, labeled "AI est.".

import { buildCareer, classifyCareer, slugify } from "@/lib/careers/generate";
import { BUILTIN, exactMatch } from "@/lib/careers/registry";
import type { Career } from "@/types/roadmap";
import { callEndpoint, EndpointMissing, ENDPOINTS } from "./endpoints";

const cache = new Map<string, Career>();

export async function resolveCareer(query: string, locale: "en" | "es" = "en"): Promise<Career> {
  const known = exactMatch(query, BUILTIN);
  if (known) return known;

  const key = slugify(query);
  const hit = cache.get(key);
  if (hit) return hit;

  let career: Career;
  try {
    const res = await callEndpoint(ENDPOINTS.resolveCareer, { method: "POST", body: JSON.stringify({ query, locale }) });
    career = (await res.json()) as Career;
  } catch (err) {
    if (!(err instanceof EndpointMissing)) throw err;
    career = buildCareer(classifyCareer(query));
  }
  cache.set(key, career);
  return career;
}
