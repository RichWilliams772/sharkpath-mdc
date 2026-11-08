"use client";

import { useCallback } from "react";
import { getCareer } from "@/lib/careers/registry";
import { usePlanStore } from "@/store/plan-store";
import type { CareerId } from "@/types/roadmap";
import { esData } from "./es";

/** Translate data content: falls back to the English string from src/data. */
export function useLocalized() {
  const locale = usePlanStore((s) => s.locale);
  const custom = usePlanStore((s) => s.customCareers);
  const tx = useCallback(
    (key: string, fallback: string) => (locale === "es" ? (esData[key] ?? fallback) : fallback),
    [locale],
  );
  const careerTitle = useCallback(
    (id: CareerId) => tx(`career.${id}.title`, getCareer(id, custom).title),
    [tx, custom],
  );
  const careerSummary = useCallback(
    (id: CareerId) => tx(`career.${id}.summary`, getCareer(id, custom).summary),
    [tx, custom],
  );
  return { tx, careerTitle, careerSummary, locale };
}
