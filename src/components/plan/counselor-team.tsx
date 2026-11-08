"use client";

import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, Briefcase, CheckCircle2, GraduationCap, Loader2, PiggyBank, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SharkIcon } from "@/components/brand/shark";
import { Button } from "@/components/ui/button";
import { AGENT_ORDER, runCounselorTeam } from "@/lib/api/counselor";
import { cn } from "@/lib/utils";
import { usePlanStore } from "@/store/plan-store";
import type { AgentReport, AgentRole, WhatIfInputs } from "@/types/roadmap";
import { usePlan } from "./use-plan";

const ICON: Record<AgentRole, React.ComponentType<{ className?: string }>> = {
  career: Briefcase,
  education: GraduationCap,
  finance: PiggyBank,
  licensing: BadgeCheck,
  coordinator: SharkIcon,
};

export function CounselorTeam() {
  const t = useTranslations("team");
  const { plan, career } = usePlan();
  const locale = usePlanStore((s) => s.locale);
  const [reports, setReports] = useState<Partial<Record<AgentRole, AgentReport>>>({});
  const [running, setRunning] = useState(false);
  const [lastInputs, setLastInputs] = useState<WhatIfInputs | null>(null);

  const ran = Object.keys(reports).length > 0;
  const stale = ran && lastInputs && JSON.stringify(lastInputs) !== JSON.stringify(plan.inputs);

  async function run() {
    setRunning(true);
    setReports({});
    setLastInputs(plan.inputs);
    await runCounselorTeam(plan, career, (r) => setReports((prev) => ({ ...prev, [r.role]: r })), locale);
    setRunning(false);
  }

  const specialists = AGENT_ORDER.filter((r) => r !== "coordinator");

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">{t("subtitle")}</p>
        <Button onClick={run} disabled={running} className={cn(!ran && "glow")}>
          {running ? <Loader2 className="animate-spin" /> : <Users />}
          {ran && stale ? t("rerun") : t("run")}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {specialists.map((role) => (
          <AgentCard key={role} role={role} report={reports[role]} />
        ))}
      </div>
      <div className="relative mt-3">
        {/* "currents" flowing from the specialists into the coordinator */}
        <div aria-hidden className="mx-auto hidden h-6 w-3/4 border-x border-b border-dashed border-primary/30 lg:block" />
        <AgentCard role="coordinator" report={reports.coordinator} wide />
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{t("mock")}</p>
    </div>
  );
}

function AgentCard({ role, report, wide }: { role: AgentRole; report?: AgentReport; wide?: boolean }) {
  const t = useTranslations("team.agents");
  const tTeam = useTranslations("team");
  const Icon = ICON[role];
  const status = report?.status ?? "idle";

  return (
    <motion.article
      layout
      className={cn(
        "rounded-xl border p-4 transition-colors",
        wide ? "border-primary/40 bg-primary/5" : "border-border/70 bg-card/70",
        status === "thinking" && "border-primary/50",
      )}
    >
      <header className="flex items-center gap-3">
        <span className={cn("grid size-9 place-items-center rounded-full bg-secondary", status === "thinking" && "animate-pulse")}>
          <Icon className={cn(role === "coordinator" ? "h-4 w-7" : "size-4", "text-primary")} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{t(role)}</h3>
          <p className="text-xs text-muted-foreground">{t(`${role}Desc`)}</p>
        </div>
        {status === "thinking" && <Loader2 className="size-4 animate-spin text-primary" />}
        {status === "done" && <CheckCircle2 className="size-4 text-kelp" />}
      </header>
      <AnimatePresence mode="wait">
        {status === "thinking" && (
          <motion.p key="t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 text-xs text-muted-foreground">
            {tTeam("thinking")}
          </motion.p>
        )}
        {(status === "done" || status === "error") && report && (
          <motion.div key="d" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
            <p className={cn("text-sm font-semibold", status === "error" && "text-destructive")}>{report.headline}</p>
            <ul className={cn("mt-2 space-y-1 text-xs text-muted-foreground", wide && "sm:columns-2")}>
              {report.points.map((p) => (
                <li key={p} className="flex gap-1.5">
                  <span className="text-primary">›</span>
                  {p}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
