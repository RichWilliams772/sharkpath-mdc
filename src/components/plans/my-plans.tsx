"use client";

import { Cloud, FolderOpen, HardDrive, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { CareerIcon } from "@/components/career-icon";
import { LinkButton } from "@/components/link-button";
import { useHydrated } from "@/components/plan/use-plan";
import { useAccount, useOwnerId } from "@/components/providers";
import { PageIntro, Panel } from "@/components/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deletePlan, listPlans, type PlanStorage } from "@/lib/api/plans";
import { formatMoney } from "@/lib/format";
import { usePlanStore } from "@/store/plan-store";
import type { SavedPlan } from "@/types/roadmap";

export function MyPlans() {
  const t = useTranslations("myPlans");
  const hydrated = useHydrated();
  const { user, isLoading } = useAccount();
  const ownerId = useOwnerId();
  const router = useRouter();
  const setInputs = usePlanStore((s) => s.setInputs);
  const setCareer = usePlanStore((s) => s.setCareer);
  const locale = usePlanStore((s) => s.locale);
  const [data, setData] = useState<{ owner: string; plans: SavedPlan[]; storage: PlanStorage }>();

  const load = useCallback(() => {
    listPlans(ownerId).then((r) => setData({ owner: ownerId, ...r }));
  }, [ownerId]);

  useEffect(() => {
    if (hydrated && user) load();
  }, [hydrated, user, load]);

  const ready = data && data.owner === ownerId;

  // Guests can't save plans, so there's nothing to list — invite them to sign up.
  if (!isLoading && !user) {
    return (
      <>
        <PageIntro title={t("title")}>{t("subtitle")}</PageIntro>
        <Panel className="flex flex-col items-center gap-4 text-center">
          <p className="text-muted-foreground">{t("guestBanner")}</p>
          <LinkButton href="/login">{t("loginCta")}</LinkButton>
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageIntro title={t("title")}>{t("subtitle")}</PageIntro>

      {!ready ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-32 animate-pulse rounded-2xl bg-card/60" />
          <div className="h-32 animate-pulse rounded-2xl bg-card/60" />
        </div>
      ) : data.plans.length === 0 ? (
        <Panel className="text-center">
          <p className="text-muted-foreground">{t("empty")}</p>
          <LinkButton href="/plan" className="mt-4">{t("goPlan")}</LinkButton>
        </Panel>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.plans.map((p) => (
            <li key={p.id} className="glass flex flex-col gap-3 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <CareerIcon id={p.inputs.careerId} className="mt-1 size-5 text-primary" />
                <div className="flex-1">
                  <h2 className="font-semibold">{p.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleString(locale === "es" ? "es-US" : "en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <Badge variant="outline">
                  {data.storage === "cloud" ? <Cloud /> : <HardDrive />}
                  {data.storage === "cloud" ? t("cloud") : t("browser")}
                </Badge>
              </div>
              <p className="text-sm">
                {t("years", { n: p.summary.yearsToCareer })} · {t("net", { amount: formatMoney(p.summary.netCost) })}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (p.career) setCareer(p.career);
                    setInputs(p.inputs);
                    router.push("/plan");
                  }}
                >
                  <FolderOpen /> {t("open")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await deletePlan(ownerId, p.id);
                    load();
                  }}
                >
                  <Trash2 /> {t("delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
