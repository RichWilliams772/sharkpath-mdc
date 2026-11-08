"use client";

import { AnimatePresence, motion } from "motion/react";
import { RotateCcw, Route, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Shark3D } from "@/components/brand/shark3d/shark-3d";
import { CareerIcon } from "@/components/career-icon";
import { useHydrated } from "@/components/plan/use-plan";
import { PageIntro } from "@/components/section";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { QUIZ } from "@/data/quiz";
import { useLocalized } from "@/i18n/use-localized";
import { resolveCareer } from "@/lib/api/careers";
import { getAiSuggestions, scoreQuiz } from "@/lib/api/quiz";
import { getCareer } from "@/lib/careers/registry";
import { cn } from "@/lib/utils";
import { usePlanStore } from "@/store/plan-store";
import type { QuizResult } from "@/types/roadmap";

export function QuizFlow() {
  const hydrated = useHydrated();
  const saved = usePlanStore((s) => s.quiz);
  if (!hydrated) return <div className="h-96 animate-pulse rounded-2xl bg-card/60" aria-busy="true" />;
  return <Quiz initial={saved} />;
}

function Quiz({ initial }: { initial: QuizResult | null }) {
  const t = useTranslations("quiz");
  const tCommon = useTranslations("common");
  const { tx } = useLocalized();
  const setQuiz = usePlanStore((s) => s.setQuiz);
  const [index, setIndex] = useState<number | null>(initial ? QUIZ.length : null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(initial);

  function answer(questionId: string, optionId: string) {
    const next = { ...answers, [questionId]: optionId };
    setAnswers(next);
    if (index! < QUIZ.length - 1) {
      setIndex(index! + 1);
    } else {
      const scored = scoreQuiz(next);
      setResult(scored);
      setQuiz(scored);
      setIndex(QUIZ.length);
    }
  }

  function restart() {
    setAnswers({});
    setResult(null);
    setQuiz(null);
    setIndex(0);
  }

  if (index === null) {
    return (
      <div className="glass mx-auto max-w-2xl rounded-3xl p-10 text-center">
        <Shark3D className="mx-auto h-20 w-40" />
        <h1 className="mt-6 text-3xl font-extrabold text-balance sm:text-4xl">{t("title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>
        <Button size="lg" className="glow mt-8 h-12 px-8 text-base" onClick={() => setIndex(0)}>
          {t("start")}
        </Button>
      </div>
    );
  }

  if (result && index >= QUIZ.length) return <Results result={result} onRestart={restart} />;

  const q = QUIZ[index];
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex justify-between text-sm text-muted-foreground">
        <span>{t("progress", { n: index + 1, total: QUIZ.length })}</span>
      </div>
      <Progress value={((index + 1) / QUIZ.length) * 100} className="mb-8" />
      <AnimatePresence mode="wait">
        <motion.div key={q.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.22 }}>
          <h2 className="text-2xl font-bold text-balance sm:text-3xl">{tx(`quiz.${q.id}`, q.prompt)}</h2>
          <div className="mt-6 grid gap-3">
            {q.options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => answer(q.id, o.id)}
                className={cn(
                  "glass rounded-xl px-5 py-4 text-left text-base font-medium transition-all hover:border-primary/60 hover:bg-primary/10",
                  answers[q.id] === o.id && "glow border-primary/60",
                )}
              >
                {tx(`quiz.${q.id}.${o.id}`, o.label)}
              </button>
            ))}
          </div>
          {index > 0 && (
            <Button variant="ghost" className="mt-6" onClick={() => setIndex(index - 1)}>
              ← {tCommon("back")}
            </Button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Results({ result, onRestart }: { result: QuizResult; onRestart: () => void }) {
  const t = useTranslations("quiz");
  const { careerTitle, careerSummary, locale } = useLocalized();
  const router = useRouter();
  const setCareer = usePlanStore((s) => s.setCareer);
  const [ai, setAi] = useState<QuizResult["aiSuggestions"]>();

  useEffect(() => {
    let live = true;
    getAiSuggestions(result).then((s) => live && setAi(s));
    return () => {
      live = false;
    };
  }, [result]);

  const [top, ...rest] = result.ranked.slice(0, 6);
  const plan = (id: string) => {
    setCareer(getCareer(id));
    router.push("/plan");
  };
  async function planSuggestion(title: string) {
    setCareer(await resolveCareer(title, locale));
    router.push("/plan");
  }

  return (
    <>
      <PageIntro title={t("results")} />
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass glow rounded-3xl p-8">
        <p className="text-sm font-semibold text-coral">{t("top")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/15">
            <CareerIcon id={top.careerId} className="size-7 text-primary" />
          </span>
          <div className="flex-1">
            <h2 className="text-3xl font-extrabold">{careerTitle(top.careerId)}</h2>
            <p className="text-primary">{t("match", { n: top.score })}</p>
          </div>
          <Button size="lg" onClick={() => plan(top.careerId)}>
            <Route /> {t("plan")}
          </Button>
        </div>
        <p className="mt-4 text-muted-foreground">{careerSummary(top.careerId)}</p>
      </motion.div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {rest.map((r, i) => (
          <motion.li
            key={r.careerId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            className="glass flex items-center gap-3 rounded-xl p-4"
          >
            <CareerIcon id={r.careerId} className="size-5 text-primary" />
            <span className="flex-1 font-semibold">{careerTitle(r.careerId)}</span>
            <span className="w-24">
              <span className="block text-right text-xs text-muted-foreground">{t("match", { n: r.score })}</span>
              <span className="mt-1 block h-1.5 rounded-full bg-secondary">
                <span className="block h-1.5 rounded-full bg-primary" style={{ width: `${r.score}%` }} />
              </span>
            </span>
            <Button size="sm" variant="ghost" onClick={() => plan(r.careerId)} aria-label={t("plan")}>
              <Route />
            </Button>
          </motion.li>
        ))}
      </ul>

      <section className="mt-8">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <Sparkles className="size-5 text-sand" /> {t("aiMore")}
        </h3>
        <p className="text-xs text-sand">{t("aiNote")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ai === undefined && <span className="h-9 w-64 animate-pulse rounded-lg bg-card/60" />}
          {ai?.map((s) => (
            <Button key={s.title} variant="outline" className="h-auto flex-col items-start border-sand/30 py-2" onClick={() => planSuggestion(s.title)}>
              <span className="font-semibold">{s.title}</span>
              <span className="text-xs font-normal text-muted-foreground">{s.why}</span>
            </Button>
          ))}
        </div>
      </section>

      <Button variant="ghost" className="mt-8" onClick={onRestart}>
        <RotateCcw /> {t("retake")}
      </Button>
    </>
  );
}
