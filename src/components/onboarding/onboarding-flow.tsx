"use client";

import { AnimatePresence, motion } from "motion/react";
import { HelpCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { CareerIcon } from "@/components/career-icon";
import { CareerPicker } from "@/components/career-picker";
import { useHydrated } from "@/components/plan/use-plan";
import { PageIntro } from "@/components/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { CORE } from "@/data/careers";
import { useLocalized } from "@/i18n/use-localized";
import { getCareer } from "@/lib/careers/registry";
import { cn } from "@/lib/utils";
import { usePlanStore } from "@/store/plan-store";
import type { Career, StudentProfile } from "@/types/roadmap";

const STEPS = ["about", "career", "situation"] as const;
const GOALS = ["transfer", "workforce", "exploring"] as const;

export function OnboardingFlow() {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="h-[28rem] animate-pulse rounded-2xl bg-card/60" aria-busy="true" />;
  return <Form />;
}

function Form() {
  const t = useTranslations("onboarding");
  const tCommon = useTranslations("common");
  const tPicker = useTranslations("picker");
  const { careerTitle, careerSummary } = useLocalized();
  const router = useRouter();
  const store = usePlanStore();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(store.profile?.name ?? "");
  const [goal, setGoal] = useState<StudentProfile["goal"]>(store.profile?.goal ?? "transfer");
  const [career, setCareer] = useState<Career>(() =>
    getCareer(store.quiz?.ranked[0]?.careerId ?? store.inputs.careerId, store.customCareers),
  );
  // Suggestions: quiz matches if taken, otherwise the 5 core careers — plus whatever they picked.
  const suggested = store.quiz ? store.quiz.ranked.slice(0, 5).map((r) => getCareer(r.careerId)) : CORE;
  const options = [career, ...suggested.filter((c) => c.id !== career.id)].slice(0, 6);
  const [credits, setCredits] = useState(store.inputs.creditsEarned);
  const [work, setWork] = useState(store.inputs.workHoursPerWeek);

  const canContinue = step !== 0 || name.trim().length > 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!canContinue) return;
    if (step < STEPS.length - 1) return setStep(step + 1);
    store.setProfile({ name: name.trim(), goal, language: store.locale });
    store.setCareer(career);
    store.setInputs({ creditsEarned: credits, workHoursPerWeek: work });
    router.push("/plan");
  }

  return (
    <>
      <PageIntro eyebrow={t("step", { n: step + 1, total: STEPS.length })} title={t(`steps.${STEPS[step]}`)}>
        {store.profile ? t("edit") : t("quick")}
      </PageIntro>

      <div className="mb-6 grid grid-cols-3 gap-2" aria-hidden>
        {STEPS.map((s, i) => (
          <div key={s} className={cn("h-1.5 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-secondary")} />
        ))}
      </div>

      <form onSubmit={submit} className="glass rounded-2xl p-6 sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            className="space-y-7"
          >
            {step === 0 && (
              <>
                <div>
                  <Label htmlFor="name" className="mb-2 text-base font-semibold">{t("nameLabel")}</Label>
                  <Input id="name" autoFocus autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} className="h-11 text-base" />
                </div>
                <fieldset>
                  <legend className="mb-3 font-semibold">{t("goalLabel")}</legend>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {GOALS.map((g) => (
                      <Choice key={g} checked={goal === g} onSelect={() => setGoal(g)} name="goal" title={t(`goals.${g}`)} body={t(`goals.${g}Hint`)} />
                    ))}
                  </div>
                </fieldset>
              </>
            )}

            {step === 1 && (
              <fieldset>
                <legend className="mb-3 font-semibold">{t("careerLabel")}</legend>
                <CareerPicker onSelect={setCareer} className="mb-2" />
                <p className="mb-4 text-xs text-muted-foreground">{tPicker("hint")}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {options.map((c) => (
                    <Choice
                      key={c.id}
                      name="career"
                      checked={career.id === c.id}
                      onSelect={() => setCareer(c)}
                      title={careerTitle(c.id)}
                      body={careerSummary(c.id)}
                      icon={<CareerIcon id={c.id} className="size-5 text-primary" />}
                    />
                  ))}
                  <Link href="/quiz" className="flex items-center gap-3 rounded-xl border border-dashed border-coral/50 p-4 text-coral transition-colors hover:bg-coral/10">
                    <HelpCircle className="size-5" />
                    <span>
                      <span className="block font-semibold">{t("notSure")}</span>
                      <span className="text-sm">{t("takeQuiz")} →</span>
                    </span>
                  </Link>
                </div>
              </fieldset>
            )}

            {step === 2 && (
              <>
                <div>
                  <div className="mb-3 flex justify-between font-semibold">
                    <span>{t("creditsLabel")}</span>
                    <span className="text-primary">{credits}</span>
                  </div>
                  <Slider value={[credits]} max={60} step={3} onValueChange={(v) => setCredits(Array.isArray(v) ? v[0] : (v as number))} aria-label={t("creditsLabel")} />
                  <p className="mt-2 text-xs text-muted-foreground">{t("creditsHint")}</p>
                </div>
                <div>
                  <div className="mb-3 flex justify-between font-semibold">
                    <span>{t("workLabel")}</span>
                    <span className="text-primary">{work}</span>
                  </div>
                  <Slider value={[work]} max={40} step={5} onValueChange={(v) => setWork(Array.isArray(v) ? v[0] : (v as number))} aria-label={t("workLabel")} />
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
          <Button type="button" variant="ghost" onClick={() => setStep(step - 1)} className={step === 0 ? "invisible" : ""}>
            {tCommon("back")}
          </Button>
          <Button type="submit" size="lg" disabled={!canContinue}>
            {step < STEPS.length - 1 ? tCommon("continue") : t("finish")}
          </Button>
        </div>
      </form>
    </>
  );
}

function Choice({
  name,
  checked,
  onSelect,
  title,
  body,
  icon,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  body: string;
  icon?: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer gap-3 rounded-xl border p-4 transition-all has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        checked ? "glow border-primary/60 bg-primary/10" : "border-border/70 bg-card/50 hover:border-primary/40",
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="sr-only" />
      {icon}
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{body}</span>
      </span>
    </label>
  );
}
