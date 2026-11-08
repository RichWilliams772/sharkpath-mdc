"use client";

import { CalendarDays, GraduationCap, LineChart, Network, PiggyBank, SlidersHorizontal, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { CareerIcon } from "@/components/career-icon";
import { Panel } from "@/components/section";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalized } from "@/i18n/use-localized";
import { useCareerLoading } from "@/lib/api/career-data";
import { isBuiltin } from "@/lib/careers/registry";
import { usePlanStore } from "@/store/plan-store";
import { CounselorTeam } from "./counselor-team";
import { DeadlineCalendar } from "./deadline-calendar";
import { ExportPdfButton } from "./export-pdf-button";
import { MoneyPlanView } from "./money-plan";
import { MoneyQuizDialog } from "./money-quiz-dialog";
import { PathwayMap } from "./pathway-map";
import { PlanStats } from "./plan-stats";
import { RoiView } from "./roi-view";
import { SavePlanButton } from "./save-plan-button";
import { SemesterPlan } from "./semester-plan";
import { useHydrated, usePlan } from "./use-plan";
import { WhatIfPanel } from "./what-if-panel";

const TABS = [
  { id: "map", icon: Network },
  { id: "semesters", icon: GraduationCap },
  { id: "money", icon: PiggyBank },
  { id: "roi", icon: LineChart },
  { id: "deadlines", icon: CalendarDays },
  { id: "team", icon: Users },
] as const;

export function PlanDashboard() {
  const tCommon = useTranslations("common");
  const hydrated = useHydrated();
  const careerId = usePlanStore((s) => s.inputs.careerId);
  const custom = usePlanStore((s) => s.customCareers);
  // Load this career from Tiger Data. Student-generated (AI) careers never live there.
  const fromApi = hydrated && !(custom[careerId] && !isBuiltin(careerId)) ? careerId : null;
  const careerLoading = useCareerLoading(fromApi);

  // Only the first load shows the skeleton; switching careers later swaps data in place.
  const [shown, setShown] = useState(false);
  const loading = !shown && (!hydrated || careerLoading);
  if (!loading && !shown) setShown(true);

  if (loading) {
    return (
      <div role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">{tCommon("loading")}</span>
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]" aria-hidden="true">
          <div className="h-[640px] animate-pulse rounded-2xl bg-card/60" />
          <div className="h-[640px] animate-pulse rounded-2xl bg-card/60" />
        </div>
      </div>
    );
  }
  return <Dashboard />;
}

function Dashboard() {
  const t = useTranslations("plan");
  const tWhatIf = useTranslations("whatIf");
  const { career } = usePlan();
  const { careerTitle } = useLocalized();
  const profile = usePlanStore((s) => s.profile);
  const tab = usePlanStore((s) => s.planTab);
  const setTab = usePlanStore((s) => s.setPlanTab);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">
            {profile ? t("greeting", { name: profile.name }) : <Link href="/onboarding" className="underline-offset-4 hover:underline">{t("personalize")} →</Link>}
          </p>
          <h1 className="mt-1 flex items-center gap-3 text-3xl font-extrabold sm:text-4xl">
            <CareerIcon id={career.id} className="size-8 text-primary" />
            {t("title", { career: careerTitle(career.id) })}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <SavePlanButton />
          <ExportPdfButton />
        </div>
      </div>

      {/* Phones: what-if controls slide up from the bottom so results stay visible. */}
      <Sheet>
        <SheetTrigger
          render={
            <Button size="lg" variant="secondary" className="fixed bottom-4 left-4 z-30 h-12 rounded-full border border-primary/40 px-5 shadow-lg lg:hidden" />
          }
        >
          <SlidersHorizontal /> {tWhatIf("title")}
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl p-2">
          <SheetTitle className="sr-only">{tWhatIf("title")}</SheetTitle>
          <WhatIfPanel />
        </SheetContent>
      </Sheet>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
          <WhatIfPanel />
        </aside>

        <div className="min-w-0 space-y-6">
          <PlanStats />
          <Panel className="p-3 sm:p-4">
            <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
              <TabsList className="mb-4 w-full flex-wrap justify-start gap-1 bg-transparent p-0 group-data-horizontal/tabs:h-auto">
                {TABS.map(({ id, icon: Icon }) => (
                  <TabsTrigger key={id} value={id} className="flex-none rounded-lg px-3 py-1.5 data-active:bg-primary/15 data-active:text-primary">
                    <Icon /> {t(`tabs.${id}`)}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="map"><PathwayMap /></TabsContent>
              <TabsContent value="semesters"><SemesterPlan /></TabsContent>
              <TabsContent value="money"><MoneyPlanView /></TabsContent>
              <TabsContent value="roi"><RoiView /></TabsContent>
              <TabsContent value="deadlines"><DeadlineCalendar /></TabsContent>
              <TabsContent value="team"><CounselorTeam /></TabsContent>
            </Tabs>
          </Panel>
        </div>
      </div>
      <MoneyQuizDialog />
    </>
  );
}
