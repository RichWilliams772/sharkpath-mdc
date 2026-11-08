"use client";

import { CalendarPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { SourceChip } from "@/components/source-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DEADLINES } from "@/data/deadlines";
import { cn } from "@/lib/utils";
import { usePlanStore } from "@/store/plan-store";
import type { Deadline } from "@/types/roadmap";

async function downloadIcs(deadlines: Deadline[], filename: string) {
  const { createEvents } = await import("ics");
  const { error, value } = createEvents(
    deadlines.map((d) => {
      const [y, m, day] = d.date.split("-").map(Number);
      return {
        start: [y, m, day] as [number, number, number],
        duration: { days: 1 },
        title: d.title,
        description: `${d.description}\n\nSource: ${d.source.title} — ${d.source.url}`,
        url: d.source.url,
        categories: ["SharkPath", d.category],
        productId: "sharkpath/mdc",
      };
    }),
  );
  if (error || !value) throw error ?? new Error("Could not create calendar file");
  const url = URL.createObjectURL(new Blob([value], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const CATEGORY_COLOR: Record<Deadline["category"], string> = {
  "financial-aid": "border-kelp/40 text-kelp",
  admissions: "border-chart-2/40 text-chart-2",
  registration: "border-primary/40 text-primary",
  exam: "border-coral/40 text-coral",
  scholarship: "border-sand/40 text-sand",
};

export function DeadlineCalendar() {
  const t = useTranslations("deadlines");
  const careerId = usePlanStore((s) => s.inputs.careerId);
  const locale = usePlanStore((s) => s.locale);
  const [onlyMine, setOnlyMine] = useState(true);
  const today = new Date().toISOString().slice(0, 10);

  const list = useMemo(
    () =>
      DEADLINES.filter((d) => !onlyMine || d.careerIds.length === 0 || d.careerIds.includes(careerId)).sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    [onlyMine, careerId],
  );

  const months = useMemo(() => {
    const map = new Map<string, Deadline[]>();
    for (const d of list) map.set(d.date.slice(0, 7), [...(map.get(d.date.slice(0, 7)) ?? []), d]);
    return [...map.entries()];
  }, [list]);

  const monthName = (ym: string) =>
    new Date(`${ym}-15T12:00:00`).toLocaleDateString(locale === "es" ? "es-US" : "en-US", { month: "long", year: "numeric" });
  const shortMonth = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString(locale === "es" ? "es-US" : "en-US", { month: "short" });

  const upcoming = list.filter((d) => d.date >= today);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Switch id="only-mine" checked={onlyMine} onCheckedChange={setOnlyMine} />
          <Label htmlFor="only-mine" className="font-normal">{t("onlyMine")}</Label>
        </div>
        <Button onClick={() => downloadIcs(upcoming, "sharkpath-deadlines.ics")} disabled={upcoming.length === 0}>
          <CalendarPlus /> {t("addAll")}
        </Button>
      </div>

      <div className="space-y-6">
        {months.map(([ym, items]) => (
          <section key={ym}>
            <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">{monthName(ym)}</h3>
            <ul className="space-y-2">
              {items.map((d) => {
                const past = d.date < today;
                return (
                  <li
                    key={d.id}
                    className={cn("flex items-center gap-4 rounded-xl border border-border/60 bg-card/60 p-3", past && "opacity-50")}
                  >
                    <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-secondary py-1.5">
                      <span className="text-[10px] font-semibold text-primary uppercase">{shortMonth(d.date)}</span>
                      <span className="font-heading text-xl font-bold">{Number(d.date.slice(8))}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{d.title}</span>
                        <Badge variant="outline" className={CATEGORY_COLOR[d.category]}>
                          {t(`categories.${d.category}`)}
                        </Badge>
                        {past && <Badge variant="secondary">{t("past")}</Badge>}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{d.description}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <SourceChip source={d.source} />
                      {!past && (
                        <Button variant="outline" size="xs" onClick={() => downloadIcs([d], `${d.id}.ics`)}>
                          <CalendarPlus /> {t("add")}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-5 text-xs text-sand">{t("sampleDates")}</p>
    </div>
  );
}
