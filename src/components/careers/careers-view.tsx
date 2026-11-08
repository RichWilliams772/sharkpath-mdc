"use client";

import { motion } from "motion/react";
import { MessageCircle, Route } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CareerIcon, META_ICONS } from "@/components/career-icon";
import { CareerPicker, OriginBadge } from "@/components/career-picker";
import { Figure } from "@/components/source-chip";
import { PageIntro } from "@/components/section";
import { Button } from "@/components/ui/button";
import { META_MAJORS } from "@/data/meta-majors";
import { useLocalized } from "@/i18n/use-localized";
import { useAllCareers } from "@/lib/careers/registry";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/chat-store";
import { usePlanStore } from "@/store/plan-store";
import type { Career, MetaMajorId } from "@/types/roadmap";

const ORDER = { verified: 0, catalog: 1, ai: 2 } as const;

export function CareersView() {
  const t = useTranslations("careers");
  const tMeta = useTranslations("metaMajors");
  const tPicker = useTranslations("picker");
  const router = useRouter();
  const setCareer = usePlanStore((s) => s.setCareer);
  const all = useAllCareers();
  const [filter, setFilter] = useState<MetaMajorId | "all">("all");

  const careers = all
    .filter((c) => filter === "all" || c.metaMajor === filter)
    .sort((a, b) => ORDER[a.origin] - ORDER[b.origin]);

  function plan(c: Career) {
    setCareer(c);
    router.push("/plan");
  }

  return (
    <>
      <PageIntro title={t("title")}>{t("subtitle")}</PageIntro>

      <div className="glass mb-6 rounded-2xl p-4 sm:p-5">
        <CareerPicker onSelect={plan} className="max-w-2xl" />
        <p className="mt-2 text-xs text-muted-foreground">{tPicker("hint")}</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5" role="group" aria-label={t("filter")}>
        {(["all", ...META_MAJORS.map((m) => m.id)] as const).map((id) => {
          const Icon = id === "all" ? null : META_ICONS[id];
          return (
            <Button key={id} size="sm" variant={filter === id ? "default" : "outline"} aria-pressed={filter === id} onClick={() => setFilter(id)}>
              {Icon && <Icon />}
              {tMeta(id)}
            </Button>
          );
        })}
      </div>

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {careers.map((c, i) => (
          <CareerCard key={c.id} career={c} index={i} onPlan={() => plan(c)} />
        ))}
      </ul>
    </>
  );
}

function CareerCard({ career: c, index, onPlan }: { career: Career; index: number; onPlan: () => void }) {
  const t = useTranslations("careers");
  const tTracks = useTranslations("tracks");
  const { careerTitle, careerSummary } = useLocalized();
  const ask = useChatStore((s) => s.ask);

  return (
    <motion.li
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.4) }}
      className={cn("glass flex flex-col rounded-2xl p-6", c.origin === "verified" && "border-kelp/30")}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/15">
          <CareerIcon id={c.id} className="size-5 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold">{careerTitle(c.id)}</h2>
          <p className="text-xs text-muted-foreground">{tTracks(c.track)}</p>
        </div>
        <OriginBadge career={c} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{careerSummary(c.id)}</p>

      <dl className="mt-5 space-y-2.5 text-sm">
        <Row label={t("median")}><Figure source={c.medianPay.source}>{formatMoney(c.medianPay.value)}</Figure></Row>
        <Row label={t("growth")}><Figure source={c.jobGrowth.source}>{`${c.jobGrowth.value}%`}</Figure></Row>
        <Row label={t("entry")}><Figure source={c.typicalEntryEducation.source} className="whitespace-normal text-right">{c.typicalEntryEducation.value}</Figure></Row>
        <Row label={t("license")}>
          <span className="text-right">{c.license ? c.license.name : t("none")}</span>
        </Row>
      </dl>

      <div className="mt-auto flex flex-wrap gap-2 pt-6">
        <Button onClick={onPlan}>
          <Route /> {t("plan")}
        </Button>
        <Button variant="outline" onClick={() => ask(t("askAbout", { career: careerTitle(c.id) }))}>
          <MessageCircle /> {t("ask")}
        </Button>
      </div>
    </motion.li>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}
