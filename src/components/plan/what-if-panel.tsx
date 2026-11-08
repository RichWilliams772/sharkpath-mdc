"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { CareerIcon } from "@/components/career-icon";
import { CareerPicker, OriginBadge } from "@/components/career-picker";
import { Panel } from "@/components/section";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useLocalized } from "@/i18n/use-localized";
import { creditsPerTermFor, termLabel } from "@/lib/calculator";
import { relatedCareers, useAllCareers, useCareer } from "@/lib/careers/registry";
import { routeOf, stageIn } from "@/lib/careers/stages";
import { cn } from "@/lib/utils";
import { DEFAULT_INPUTS, usePlanStore } from "@/store/plan-store";
import type { WhatIfInputs } from "@/types/roadmap";
import { MoneyPlanCard } from "./money-plan";

const TERMS = ["spring-2027", "summer-2027", "fall-2027"];

export function WhatIfPanel() {
  const t = useTranslations("whatIf");
  const { careerTitle } = useLocalized();
  const inputs = usePlanStore((s) => s.inputs);
  const setInputs = usePlanStore((s) => s.setInputs);
  const setCareer = usePlanStore((s) => s.setCareer);
  const tPicker = useTranslations("picker");
  const uid = useId();
  const all = useAllCareers();

  const career = useCareer(inputs.careerId);
  const route = routeOf(career, inputs.routeId);
  const hasCert = route.stageIds.some((id) => stageIn(career, id).kind === "certification");
  const related = relatedCareers(career, all, 4);

  const toggles: { key: keyof WhatIfInputs; label: string; show?: boolean }[] = [
    { key: "takeSummerClasses", label: t("summer") },
    { key: "hasCertification", label: t("cert"), show: hasCert },
  ];

  return (
    <Panel className="space-y-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("reset")}
          onClick={() => setInputs({ ...DEFAULT_INPUTS, careerId: inputs.careerId, routeId: inputs.routeId })}
        >
          <RotateCcw />
        </Button>
      </div>

      <fieldset className="space-y-2.5">
        <legend className="mb-2 text-sm font-semibold">{t("career")}</legend>
        <div className="glow flex items-center gap-2.5 rounded-lg border border-primary/60 bg-primary/10 px-3 py-2 text-sm font-semibold">
          <CareerIcon id={career.id} className="size-4 shrink-0 text-primary" />
          <span className="flex-1 truncate">{careerTitle(career.id)}</span>
          <OriginBadge career={career} />
        </div>
        <CareerPicker onSelect={setCareer} />
        <p className="text-xs text-muted-foreground">{tPicker("related")}</p>
        <div className="flex flex-wrap gap-1.5">
          {related.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCareer(c)}
              className="flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <CareerIcon id={c.id} className="size-3.5" />
              {careerTitle(c.id)}
            </button>
          ))}
        </div>
      </fieldset>

      {career.routes.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{t("route")}</legend>
          <div className="flex flex-col gap-1.5">
            {career.routes.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={r.id === route.id}
                onClick={() => setInputs({ routeId: r.id })}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                  r.id === route.id ? "border-coral/60 bg-coral/10 text-foreground" : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <SliderField
        label={`${t("credits")}: ${inputs.creditsEarned}`}
        value={inputs.creditsEarned}
        max={60}
        step={3}
        onChange={(v) => setInputs({ creditsEarned: v })}
      />
      <SliderField
        label={t("work", { n: inputs.workHoursPerWeek })}
        hint={t("load", { n: creditsPerTermFor(inputs.workHoursPerWeek) })}
        value={inputs.workHoursPerWeek}
        max={40}
        step={5}
        onChange={(v) => setInputs({ workHoursPerWeek: v })}
      />

      <div className="space-y-3">
        {toggles
          .filter((x) => x.show !== false)
          .map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <Label htmlFor={`${uid}-${key}`} className="text-sm font-normal">
                {label}
              </Label>
              <Switch
                id={`${uid}-${key}`}
                checked={Boolean(inputs[key])}
                onCheckedChange={(checked) => setInputs({ [key]: checked } as Partial<WhatIfInputs>)}
              />
            </div>
          ))}
      </div>

      {/* Aid, housing and work come from the money plan quiz now. */}
      <MoneyPlanCard />

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">{t("startTerm")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {TERMS.map((term) => (
            <Button
              key={term}
              size="sm"
              variant={inputs.startTerm === term ? "default" : "outline"}
              onClick={() => setInputs({ startTerm: term })}
              aria-pressed={inputs.startTerm === term}
            >
              {termLabel(term)}
            </Button>
          ))}
        </div>
      </fieldset>
    </Panel>
  );
}

function SliderField({
  label,
  hint,
  value,
  max,
  step,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold">{label}</span>
        {hint && <span className="text-xs text-primary">{hint}</span>}
      </div>
      <Slider
        value={[value]}
        min={0}
        max={max}
        step={step}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : (v as number))}
        aria-label={label}
      />
    </div>
  );
}
