"use client";

// Every career the app knows about: the 5 core careers, the seeded catalog,
// and any career a student has generated (kept in the store so it persists).

import { useMemo } from "react";
import { CORE } from "@/data/careers";
import { CATALOG } from "@/data/catalog";
import { metaMajorById } from "@/data/meta-majors";
import { usePlanStore } from "@/store/plan-store";
import type { Career } from "@/types/roadmap";

export const BUILTIN: Career[] = [...CORE, ...CATALOG];
const BY_ID = new Map(BUILTIN.map((c) => [c.id, c]));
const CORE_IDS = new Set(CORE.map((c) => c.id));
export const DEFAULT_CAREER = CORE.find((c) => c.id === "software-developer") ?? CORE[0];

export function getCareer(id: string, custom: Record<string, Career> = usePlanStore.getState().customCareers): Career {
  return BY_ID.get(id) ?? custom[id] ?? DEFAULT_CAREER;
}

export const isBuiltin = (id: string) => BY_ID.has(id);

export function useCareer(id: string) {
  const custom = usePlanStore((s) => s.customCareers);
  return getCareer(id, custom);
}

export function useAllCareers() {
  const custom = usePlanStore((s) => s.customCareers);
  return useMemo(() => [...BUILTIN, ...Object.values(custom).filter((c) => !BY_ID.has(c.id))], [custom]);
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

/** Career whose title, id or alias equals the query. */
export function exactMatch(query: string, list: Career[] = BUILTIN): Career | undefined {
  const q = norm(query);
  return list.find((c) => norm(c.title) === q || c.id === q || c.aliases?.some((a) => norm(a) === q));
}

/** Ranked search across titles, aliases and meta-major names. */
export function searchCareers(query: string, list: Career[], limit = 8): Career[] {
  const q = norm(query);
  if (!q) return [];
  const score = (c: Career) => {
    const title = norm(c.title);
    if (title === q) return 100;
    let s = 0;
    if (title.startsWith(q)) s = Math.max(s, 60);
    if (title.includes(q)) s = Math.max(s, 40);
    for (const a of c.aliases ?? []) {
      const al = norm(a);
      if (al === q) s = Math.max(s, 80);
      else if (al.startsWith(q) || q.includes(al)) s = Math.max(s, 35);
    }
    if (norm(metaMajorById(c.metaMajor).label).includes(q)) s = Math.max(s, 15);
    return s + (c.origin === "verified" ? 3 : CORE_IDS.has(c.id) ? 2.5 : c.origin === "catalog" ? 2 : 0);
  };
  return list
    .map((c) => ({ c, s: score(c) }))
    .filter((x) => x.s > 5)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.c);
}

/** Careers to show next to this one on the map and in "related". */
export function relatedCareers(career: Career, list: Career[] = BUILTIN, n = 3): Career[] {
  const same = list.filter((c) => c.id !== career.id && c.metaMajor === career.metaMajor);
  const sorted = [...same.filter((c) => CORE_IDS.has(c.id)), ...same.filter((c) => !CORE_IDS.has(c.id))];
  const fill = CORE.filter((c) => c.id !== career.id && !sorted.includes(c));
  return [...sorted, ...fill].slice(0, n);
}
