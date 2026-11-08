"use client";

import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { SourceChip } from "@/components/source-chip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Course } from "@/types/roadmap";
import { usePlan } from "./use-plan";

const CATEGORY_STYLE: Record<Course["category"], string> = {
  "general-education": "bg-secondary text-secondary-foreground",
  "program-core": "bg-primary/15 text-primary",
  elective: "bg-coral/15 text-coral",
};

export function SemesterPlan() {
  const t = useTranslations("semesters");
  const { plan, career } = usePlan();
  const program = career.program;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {program.name} · {program.school}
        </span>
        <span className="flex items-center gap-1.5">
          {t("total", { n: plan.semesters.length, credits: plan.creditsPerTerm })}
          <SourceChip source={program.totalCredits.source} />
        </span>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {plan.semesters.map((s, i) => {
          const transfer = s.school !== "Miami Dade College";
          return (
            <motion.li
              key={`${s.term}-${s.school}`}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className={cn("rounded-xl border p-4", transfer ? "border-coral/30 bg-coral/5" : "border-border/70 bg-card/70")}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">
                    {s.label}
                    {i === 0 && <Badge className="ml-2 align-middle">{t("upNext")}</Badge>}
                  </h3>
                  <p className={cn("text-xs", transfer ? "text-coral" : "text-muted-foreground")}>{s.school}</p>
                </div>
                <span className="text-sm text-muted-foreground">{t("credits", { n: s.credits })}</span>
              </div>
              <ul className="mt-3 divide-y divide-border/50">
                {s.courses.map((c) => (
                  <li key={c.code + c.title} className="flex items-center gap-2 py-2 text-sm">
                    {c.code !== "UPPER" && <span className="w-[4.5rem] shrink-0 font-mono text-[11px] text-muted-foreground">{c.code}</span>}
                    <span className="flex-1 leading-snug">{c.title}</span>
                    {c.code !== "UPPER" && (
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", CATEGORY_STYLE[c.category])}>
                        {t(`categories.${c.category}`)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
