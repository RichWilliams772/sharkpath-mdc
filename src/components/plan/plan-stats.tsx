"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { SourceChip } from "@/components/source-chip";
import { SOURCES } from "@/data/sources";
import { formatMoney } from "@/lib/format";
import type { Source } from "@/types/roadmap";
import { usePlan } from "./use-plan";

export function PlanStats() {
  const t = useTranslations("plan.stats");
  const { plan } = usePlan();

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label={t("years")} source={SOURCES.sharkpathEstimate} value={`${plan.yearsToCareer}`} />
      <Stat label={t("netCost")} source={SOURCES.sharkpathEstimate} value={formatMoney(plan.netCost)} />
      <Stat label={t("startingPay")} source={plan.startingPay.source} value={formatMoney(plan.startingPay.value)} />
      <Stat
        label={t("breakEven")}
        source={SOURCES.blsEducationPays}
        value={plan.breakEvenYear ? t("breakEvenYear", { n: plan.breakEvenYear }) : t("never")}
        accent
      />
    </dl>
  );
}

function Stat({ label, value, source, accent }: { label: string; value: ReactNode; source: Source; accent?: boolean }) {
  return (
    <div className="glass rounded-2xl p-4">
      <dt className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        {label}
        <SourceChip source={source} />
      </dt>
      <dd className="mt-2 overflow-hidden">
        <motion.span
          key={String(value)}
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`block font-heading text-2xl font-bold sm:text-3xl ${accent ? "text-coral" : "text-foreground"}`}
        >
          {value}
        </motion.span>
      </dd>
    </div>
  );
}
