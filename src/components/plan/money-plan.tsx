"use client";

import { CalendarClock, CircleAlert, CircleCheck, PiggyBank, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { SourceChip } from "@/components/source-chip";
import { Button } from "@/components/ui/button";
import { useLocalized } from "@/i18n/use-localized";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePlanStore } from "@/store/plan-store";
import { fillVars } from "@/lib/finance";
import type { FinanceAction, FinancePlan, FundingKind } from "@/types/roadmap";
import { useFinancePlan, usePlan } from "./use-plan";

/** Translated funding labels and to-do items, with {school}/{aid} filled in. */
export function useFinanceText() {
  const { tx, locale } = useLocalized();
  return {
    fundingLabel: (label: string) => {
      // State aid lines are named per state: "Cal Grant (tuition)", "State grant (tuition)"…
      const aid = label.match(/^(.*) \(tuition\)$/);
      if (aid && locale === "es") return `${aid[1] === "State grant" ? "Beca estatal" : aid[1]} (matrícula)`;
      return tx(`funding.${label}`, label);
    },
    actionTitle: (a: FinanceAction) => fillVars(tx(`action.${a.id}.title`, a.title), a.vars),
    actionDetail: (a: FinanceAction) => fillVars(tx(`action.${a.id}.detail`, a.detail), a.vars),
  };
}

/** Hex (not oklch) so the PDF export can reuse them. */
export const KIND_COLOR: Record<FundingKind, string> = {
  grant: "#5fd38d",
  scholarship: "#f4d58d",
  family: "#2ee6d6",
  savings: "#a78bfa",
  work: "#5ab8ff",
  loan: "#ff7f66",
};

/** Totals for the summary tiles: free money, the student's own sources, loans. */
export function fundingTotals(f: FinancePlan) {
  const sum = (kinds: FundingKind[]) => f.funding.filter((l) => kinds.includes(l.kind)).reduce((s, l) => s + l.amount, 0);
  return { free: sum(["grant", "scholarship"]), self: sum(["family", "savings", "work"]), loans: sum(["loan"]) };
}

const formatDate =(iso: string, locale: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(locale === "es" ? "es-US" : "en-US", { month: "short", day: "numeric", year: "numeric" });

function Status({ finance, className }: { finance: FinancePlan; className?: string }) {
  const t = useTranslations("money");
  const short = finance.gap > 0;
  return (
    <p className={cn("flex items-center gap-2 font-semibold", short ? "text-coral" : "text-kelp", className)}>
      {short ? <CircleAlert className="size-4 shrink-0" /> : <CircleCheck className="size-4 shrink-0" />}
      {short ? t("gap", { amount: formatMoney(finance.gap) }) : finance.gap < 0 ? t("spare", { amount: formatMoney(-finance.gap) }) : t("covered")}
    </p>
  );
}

/** Stacked bar: how each kind of money fills the total cost. */
function FundingBar({ finance, className }: { finance: FinancePlan; className?: string }) {
  const total = Math.max(finance.totalCost, 1);
  return (
    <div className={cn("flex h-3 w-full overflow-hidden rounded-full bg-muted", className)} role="img" aria-hidden>
      {finance.funding.map((l, i) => (
        <span key={i} style={{ width: `${(l.amount / total) * 100}%`, background: KIND_COLOR[l.kind] }} />
      ))}
      {finance.gap > 0 && (
        <span
          style={{ width: `${(finance.gap / total) * 100}%` }}
          className="bg-[repeating-linear-gradient(45deg,rgba(255,127,102,0.5)_0_4px,transparent_4px_8px)]"
        />
      )}
    </div>
  );
}

/** Replaces the old Pell / Bright Futures / living toggles in the What-if panel. */
export function MoneyPlanCard() {
  const t = useTranslations("money");
  const finance = useFinancePlan();
  const openQuiz = usePlanStore((s) => s.setMoneyQuizOpen);
  const setPlanTab = usePlanStore((s) => s.setPlanTab);

  if (!finance) {
    return (
      <div className="rounded-xl border border-sand/40 bg-sand/5 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-sand">
          <PiggyBank className="size-4" /> {t("ctaTitle")}
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">{t("ctaBody")}</p>
        <Button size="sm" className="mt-3 w-full" onClick={() => openQuiz(true)}>
          {t("start")}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <PiggyBank className="size-4 text-primary" /> {t("title")}
      </p>
      <FundingBar finance={finance} className="mt-3" />
      <Status finance={finance} className="mt-2 text-sm" />
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Button size="sm" variant="secondary" onClick={() => setPlanTab("money")}>
          {t("seeFull")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => openQuiz(true)}>
          <RotateCcw /> {t("retake")}
        </Button>
      </div>
    </div>
  );
}

/** The full "Financial plan" tab. */
export function MoneyPlanView() {
  const t = useTranslations("money");
  const { locale } = useLocalized();
  const ft = useFinanceText();
  const { plan } = usePlan();
  const finance = useFinancePlan();
  const openQuiz = usePlanStore((s) => s.setMoneyQuizOpen);

  if (!finance) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <PiggyBank className="mx-auto size-10 text-sand" />
        <h3 className="mt-3 text-xl font-bold">{t("ctaTitle")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t("ctaBody")}</p>
        <Button className="mt-5" onClick={() => openQuiz(true)}>
          {t("start")}
        </Button>
      </div>
    );
  }

  const kinds = [...new Set(finance.funding.map((l) => l.kind))];
  const totals = fundingTotals(finance);

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">{t("title")}</h3>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => openQuiz(true)}>
            <RotateCcw /> {t("retake")}
          </Button>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              [t("totalCost"), plan.totalCost, "var(--foreground)"],
              [t("free"), totals.free, KIND_COLOR.grant],
              [t("self"), totals.self, KIND_COLOR.family],
              [t("loans"), totals.loans, KIND_COLOR.loan],
            ] as const
          ).map(([label, value, color]) => (
            <div key={label} className="rounded-xl border border-border/60 bg-card/40 p-3" style={{ borderTop: `3px solid ${color}` }}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 font-heading text-lg font-bold sm:text-xl">{formatMoney(value)}</dd>
            </div>
          ))}
        </dl>

        <FundingBar finance={finance} className="mt-5 h-4" />
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {kinds.map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: KIND_COLOR[k] }} /> {t(`kinds.${k}`)}
            </span>
          ))}
        </div>
        <Status finance={finance} className="mt-3" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h4 className="mb-3 font-bold">{t("howYouPay")}</h4>
          <ul className="divide-y divide-border/50 text-sm">
            {finance.funding.map((l, i) => (
              <li key={i} className="flex items-center gap-3 py-2">
                <span className="size-2.5 shrink-0 rounded-sm" style={{ background: KIND_COLOR[l.kind] }} />
                <span className="flex-1">{ft.fundingLabel(l.label)}</span>
                <span className="font-semibold tabular-nums">{formatMoney(l.amount)}</span>
                <SourceChip source={l.source} />
              </li>
            ))}
            {finance.gap > 0 && (
              <li className="flex items-center gap-3 py-2 text-coral">
                <span className="size-2.5 shrink-0 rounded-sm border border-coral" />
                <span className="flex-1">{t("gapLabel")}</span>
                <span className="font-semibold tabular-nums">{formatMoney(finance.gap)}</span>
              </li>
            )}
          </ul>
        </section>

        <section className="space-y-4">
          <div>
            <h4 className="mb-2 font-bold">{t("monthlyTitle")}</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                <p className="text-xs text-muted-foreground">{t("monthlyCost")}</p>
                <p className="mt-1 font-heading text-lg font-bold">{t("perMonth", { amount: formatMoney(finance.monthly.cost) })}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                <p className="text-xs text-muted-foreground">{t("monthlyIncome")}</p>
                <p className="mt-1 font-heading text-lg font-bold">{t("perMonth", { amount: formatMoney(finance.monthly.income) })}</p>
              </div>
            </div>
          </div>
          <div>
            <h4 className="mb-2 font-bold">{t("loanTitle")}</h4>
            {finance.loanPayment ? (
              <p className="text-sm">
                {t("loanBody", {
                  total: formatMoney(finance.loanPayment.total),
                  monthly: formatMoney(finance.loanPayment.monthly),
                  pct: Math.round(finance.loanPayment.shareOfPay * 100),
                })}{" "}
                <span className={finance.loanPayment.shareOfPay < 0.1 ? "text-kelp" : "text-coral"}>
                  {finance.loanPayment.shareOfPay < 0.1 ? t("loanOk") : t("loanHigh")}
                </span>
              </p>
            ) : (
              <p className="text-sm text-kelp">{t("noLoans")}</p>
            )}
          </div>
        </section>
      </div>

      <section>
        <h4 className="mb-3 font-bold">{t("actionsTitle")}</h4>
        <ol className="grid gap-2 sm:grid-cols-2">
          {finance.actions.map((a, i) => (
            <li key={a.id} className="flex gap-3 rounded-xl border border-border/60 bg-card/40 p-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">{i + 1}</span>
              <div className="min-w-0 text-sm">
                <p className="font-semibold">
                  {ft.actionTitle(a)}
                  {a.amount ? <span className="text-primary"> · {a.id === "save" ? t("perMonth", { amount: formatMoney(a.amount) }) : formatMoney(a.amount)}</span> : null}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{ft.actionDetail(a)}</p>
                {a.due && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-sand">
                    <CalendarClock className="size-3" /> {t("due", { date: formatDate(a.due, locale) })}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-xs text-muted-foreground">{t("sample")}</p>
    </div>
  );
}
