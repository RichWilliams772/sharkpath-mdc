"use client";

import { ArrowLeft, Check, PiggyBank } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { MONEY_QUIZ } from "@/data/money-quiz";
import { cn } from "@/lib/utils";
import { usePlanStore } from "@/store/plan-store";
import type { FinanceAnswers } from "@/types/roadmap";

/** The money plan quiz. Opened from the What-if panel, the Money tab or Export PDF. */
export function MoneyQuizDialog() {
  const open = usePlanStore((s) => s.moneyQuizOpen);
  const setOpen = usePlanStore((s) => s.setMoneyQuizOpen);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">{open && <Quiz onDone={() => setOpen(false)} />}</DialogContent>
    </Dialog>
  );
}

function Quiz({ onDone }: { onDone: () => void }) {
  const t = useTranslations("money");
  const saved = usePlanStore((s) => s.finance);
  const setFinance = usePlanStore((s) => s.setFinance);
  const setPlanTab = usePlanStore((s) => s.setPlanTab);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<FinanceAnswers>>(saved ?? {});

  const q = MONEY_QUIZ[step];
  const total = MONEY_QUIZ.length;

  function choose(value: FinanceAnswers[keyof FinanceAnswers]) {
    const next = { ...answers, [q.id]: value };
    setAnswers(next);
    if (step < total - 1) {
      setStep(step + 1);
      return;
    }
    setFinance(next as FinanceAnswers);
    setPlanTab("money");
    onDone();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <PiggyBank className="size-4" /> {t("quizTitle")}
        <span className="ml-auto pr-8 text-xs font-normal text-muted-foreground">{t("step", { n: step + 1, total })}</span>
      </div>
      <Progress value={((step + 1) / total) * 100} aria-label={t("step", { n: step + 1, total })} />

      <AnimatePresence mode="wait">
        <motion.div key={q.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
          <DialogTitle className="font-heading text-xl font-bold text-balance">{t(`q.${q.id}.prompt`)}</DialogTitle>
          <DialogDescription className="mt-1">{t(`q.${q.id}.hint`)}</DialogDescription>
          <div className="mt-4 flex flex-col gap-2">
            {q.options.map((value) => {
              const picked = answers[q.id] === value;
              return (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => choose(value)}
                  aria-pressed={picked}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                    picked ? "border-primary bg-primary/15 text-foreground" : "border-border/70 bg-card/60 hover:border-primary/50 hover:bg-primary/5",
                  )}
                >
                  {/* Keys are checked by MONEY_QUIZ's types; next-intl can't narrow the cross product. */}
                  {t(`q.${q.id}.${value}` as Parameters<typeof t>[0])}
                  {picked && <Check className="size-4 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} disabled={step === 0}>
        <ArrowLeft /> {t("back")}
      </Button>
    </div>
  );
}
