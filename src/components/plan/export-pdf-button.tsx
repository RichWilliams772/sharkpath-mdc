"use client";

import { FileDown, Loader2, PiggyBank } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { stateName } from "@/data/schools";
import { useLocalized } from "@/i18n/use-localized";
import { deadlinesFor } from "@/lib/schools";
import { stageIn } from "@/lib/careers/stages";
import { formatMoney } from "@/lib/format";
import { usePlanStore } from "@/store/plan-store";
import type { Career, FinancePlan, PlanResult, Source } from "@/types/roadmap";
import { fundingTotals, KIND_COLOR, useFinanceText } from "./money-plan";
import { useFinancePlan, usePlan, useSchools } from "./use-plan";

// US Letter in PDF points, and the sheet's CSS width (8.5in at 96dpi).
const PAGE_W = 612;
const PAGE_H = 792;
const SHEET_W = 816;
const MARGIN_TOP = 40;
const MARGIN_BOTTOM = 44;
const PX_PER_PT = SHEET_W / PAGE_W;

/** "Export PDF" — asks for the money plan first, then renders a print sheet and paginates it between sections. */
export function ExportPdfButton() {
  const t = useTranslations("pdf");
  const tMoney = useTranslations("money");
  const { plan, career } = usePlan();
  const finance = useFinancePlan();
  const name = usePlanStore((s) => s.profile?.name);
  const openMoneyQuiz = usePlanStore((s) => s.setMoneyQuizOpen);
  const { careerTitle } = useLocalized();
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const careerName = careerTitle(career.id);

  async function exportPdf() {
    setPrompt(false);
    setBusy(true);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const [{ jsPDF }, html2canvas] = await Promise.all([import("jspdf"), import("html2canvas").then((m) => m.default)]);
    const pdf = new jsPDF({ unit: "pt", format: "letter" });
    try {
      const root = sheet.current!;
      const pages = pageBreaks(root, (PAGE_H - MARGIN_TOP - MARGIN_BOTTOM) * PX_PER_PT);
      const canvas = await html2canvas(root, { scale: 2, backgroundColor: "#ffffff", logging: false });
      const scale = canvas.width / SHEET_W;
      pages.forEach(([start, end], i) => {
        if (i > 0) pdf.addPage();
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = Math.ceil((end - start) * scale);
        slice.getContext("2d")!.drawImage(canvas, 0, start * scale, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
        pdf.addImage(slice.toDataURL("image/jpeg", 0.88), "JPEG", 0, MARGIN_TOP, PAGE_W, (end - start) / PX_PER_PT);
        // Running header (after page 1) and footer on every page.
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(110, 125, 140);
        if (i > 0) pdf.text(`${t("title")} — ${careerName}`, 48, 26);
        pdf.setDrawColor(220, 228, 236);
        pdf.line(48, PAGE_H - 32, PAGE_W - 48, PAGE_H - 32);
        pdf.text(`SharkPath · ${t("sample")}`, 48, PAGE_H - 20);
        pdf.text(t("page", { n: i + 1, total: pages.length }), PAGE_W - 48, PAGE_H - 20, { align: "right" });
      });
    } catch (err) {
      // Fallback: text-only PDF if the browser can't rasterize the sheet.
      console.warn("html2canvas failed, exporting text PDF", err);
      textPdf(pdf, plan, career, name);
    }
    pdf.save(`sharkpath-${career.id}-plan.pdf`);
    setBusy(false);
  }

  return (
    <>
      <Button onClick={() => (finance ? exportPdf() : setPrompt(true))} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <FileDown />}
        {busy ? t("exporting") : t("export")}
      </Button>

      <Dialog open={prompt} onOpenChange={setPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PiggyBank className="size-5 text-sand" /> {tMoney("exportPrompt.title")}
            </DialogTitle>
            <DialogDescription>{tMoney("exportPrompt.body")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={exportPdf}>
              {tMoney("exportPrompt.skip")}
            </Button>
            <Button
              onClick={() => {
                setPrompt(false);
                openMoneyQuiz(true);
              }}
            >
              {tMoney("exportPrompt.start")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {busy &&
        createPortal(
          <div style={{ position: "fixed", left: -10000, top: 0 }} aria-hidden>
            <PrintSheet ref={sheet} plan={plan} career={career} careerName={careerName} student={name} finance={finance} />
          </div>,
          document.body,
        )}
    </>
  );
}

/**
 * Page ranges (CSS px) that only break between `[data-block]` elements.
 * `data-block="keep"` sticks a block to the next one (headings never end a page).
 */
function pageBreaks(root: HTMLElement, pageH: number): [number, number][] {
  const top0 = root.getBoundingClientRect().top;
  const blocks = [...root.querySelectorAll<HTMLElement>("[data-block]")].map((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top - top0, bottom: r.bottom - top0, keep: el.dataset.block === "keep" };
  });
  const units: { top: number; bottom: number }[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const unit = { top: blocks[i].top, bottom: blocks[i].bottom };
    while (blocks[i].keep && i + 1 < blocks.length) unit.bottom = blocks[++i].bottom;
    units.push(unit);
  }
  const pages: [number, number][] = [];
  let start = 0;
  for (const u of units) {
    if (u.bottom - start <= pageH) continue;
    if (u.top > start) {
      pages.push([start, u.top]);
      start = u.top;
    }
    // A single block taller than a page (rare) is sliced.
    while (u.bottom - start > pageH) {
      pages.push([start, start + pageH]);
      start += pageH;
    }
  }
  pages.push([start, root.scrollHeight]);
  return pages;
}

// ─── Print sheet ────────────────────────────────────────────────────────────
// Inline hex styles only: html2canvas can't parse Tailwind's oklch colors.

const C = {
  ink: "#0b1b2e",
  sub: "#5a6d80",
  faint: "#8a9aab",
  line: "#e2e8ef",
  card: "#f5f8fb",
  navy: "#03203a",
  teal: "#0a8f86",
  tealSoft: "#e5f6f4",
  coral: "#d9573d",
  coralSoft: "#fdeee9",
  kelp: "#2f8f57",
  kelpSoft: "#e8f6ee",
  sand: "#9a7314",
  sandSoft: "#fdf5e1",
};
const FONT = "Helvetica, Arial, sans-serif";

const SEASON_START: Record<string, number> = { spring: 0, summer: 0.45, fall: 0.65 };
/** Approximate term for a point in time `offset` years after the start term. */
function termAt(startTerm: string, offset: number) {
  const [season, y] = startTerm.split("-");
  const at = Number(y) + (SEASON_START[season] ?? 0) + offset;
  const year = Math.floor(at);
  const f = at - year;
  return `${f < 0.4 ? "Spring" : f < 0.6 ? "Summer" : "Fall"} ${year}`;
}
/** The last term of a stage running from `start` to `end` years after the start term. */
const lastTerm = (startTerm: string, start: number, end: number) => termAt(startTerm, Math.max(start, end - 0.3));

const fmtDate = (iso: string, locale: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(locale === "es" ? "es-US" : "en-US", { month: "short", day: "numeric", year: "numeric" });

function Heading({ n, children, note }: { n: number; children: React.ReactNode; note?: string }) {
  return (
    <div data-block="keep" style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "30px 0 12px", borderBottom: `2px solid ${C.ink}`, paddingBottom: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: C.teal }}>{String(n).padStart(2, "0")}</span>
      <span style={{ fontSize: 19, fontWeight: 700, color: C.ink }}>{children}</span>
      {note && <span style={{ marginLeft: "auto", fontSize: 10.5, color: C.faint }}>{note}</span>}
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ flex: 1, background: C.card, borderRadius: 10, padding: "12px 14px", borderTop: `3px solid ${accent ?? C.teal}` }}>
      <div style={{ fontSize: 10.5, color: C.sub, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: C.ink }}>{value}</div>
    </div>
  );
}

function PrintSheet({
  ref,
  plan,
  career,
  careerName,
  student,
  finance,
}: {
  ref: React.Ref<HTMLDivElement>;
  plan: PlanResult;
  career: Career;
  careerName: string;
  student?: string;
  finance: FinancePlan | null;
}) {
  const t = useTranslations("pdf");
  const tMoney = useTranslations("money");
  const tStats = useTranslations("plan.stats");
  const tSchool = useTranslations("school");
  const { careerSummary, locale } = useLocalized();
  const ft = useFinanceText();
  const schools = useSchools();
  const route = career.routes.find((r) => r.id === plan.inputs.routeId) ?? career.routes[0];

  // Numbered citations, collected in order of use.
  const sources = new Map<string, Source>();
  const cite = (s: Source) => {
    if (!sources.has(s.id)) sources.set(s.id, s);
    return `[${[...sources.keys()].indexOf(s.id) + 1}]`;
  };
  const sup = (s: Source) => <sup style={{ fontSize: 8, color: C.faint, marginLeft: 2 }}>{cite(s)}</sup>;

  const deadlines = deadlinesFor(career.id, schools).sort((a, b) => a.date.localeCompare(b.date));
  const steps = plan.timeline.map((seg) => ({ seg, stage: stageIn(career, seg.stageId) }));
  const mdcSemesters = plan.semesters;
  const semesterRows: (typeof mdcSemesters)[] = [];
  for (let i = 0; i < mdcSemesters.length; i += 2) semesterRows.push(mdcSemesters.slice(i, i + 2));
  let section = 0;

  return (
    <div ref={ref} style={{ width: SHEET_W, padding: "0 56px 24px", background: "#ffffff", color: C.ink, fontFamily: FONT, lineHeight: 1.4 }}>
      {/* ── Cover ── */}
      <div data-block style={{ background: C.navy, color: "#ffffff", borderRadius: 14, padding: "26px 28px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -40, top: -40, width: 180, height: 180, borderRadius: 999, background: "rgba(46,230,214,0.12)" }} />
        <div style={{ fontSize: 11, letterSpacing: 2, color: "#2ee6d6", fontWeight: 700 }}>SHARKPATH · {schools.start.name.toUpperCase()}</div>
        <div style={{ fontSize: 30, fontWeight: 800, marginTop: 8 }}>{t("title")}</div>
        <div style={{ fontSize: 16, marginTop: 4, color: "#cfe9f2" }}>
          {student ? `${student} · ` : ""}
          {careerName}
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 14, fontSize: 11, color: "#9fc3d4" }}>
          <span>{t("route")}: <b style={{ color: "#ffffff" }}>{route.label}</b></span>
          <span>{t("starts")}: <b style={{ color: "#ffffff" }}>{termAt(plan.inputs.startTerm, 0)}</b></span>
          <span>{t("made")}: <b style={{ color: "#ffffff" }}>{fmtDate(new Date().toISOString().slice(0, 10), locale)}</b></span>
        </div>
        <div style={{ fontSize: 11, marginTop: 6, color: "#9fc3d4" }}>
          {tSchool("colleges")}:{" "}
          <b style={{ color: "#ffffff" }}>
            {schools.start.name}
            {schools.transfer.id !== schools.start.id ? ` → ${schools.transfer.name}` : ""}
          </b>{" "}
          · {tSchool("home")}: <b style={{ color: "#ffffff" }}>{stateName(schools.homeState)}</b> ·{" "}
          <b style={{ color: schools.residency.start === "in-state" && schools.residency.transfer === "in-state" ? "#5fd38d" : "#ffb199" }}>
            {schools.residency.start === "in-state" && schools.residency.transfer === "in-state" ? tSchool("inState") : tSchool("outOfState")}
          </b>
        </div>
      </div>

      <div data-block style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <Tile label={tStats("years")} value={`${plan.yearsToCareer}`} />
        <Tile label={tStats("netCost")} value={formatMoney(plan.netCost)} accent={C.sand} />
        <Tile label={tStats("startingPay")} value={formatMoney(plan.startingPay.value)} accent={C.kelp} />
        <Tile
          label={tStats("breakEven")}
          value={plan.breakEvenYear ? tStats("breakEvenYear", { n: plan.breakEvenYear }) : tStats("never")}
          accent={C.coral}
        />
      </div>

      {/* ── 1. The career ── */}
      <Heading n={++section}>{t("career")}</Heading>
      <div data-block style={{ display: "flex", gap: 20 }}>
        <p style={{ flex: 1.4, margin: 0, fontSize: 12.5, color: C.ink }}>{careerSummary(career.id)}</p>
        <table style={{ flex: 1, fontSize: 11.5, borderCollapse: "collapse" }}>
          <tbody>
            {[
              [t("medianPay"), <>{formatMoney(career.medianPay.value)}{sup(career.medianPay.source)}</>],
              [t("growth"), <>{career.jobGrowth.value}{career.jobGrowth.unit?.startsWith("%") ? "%" : ""}{sup(career.jobGrowth.source)}</>],
              [t("education"), <>{career.typicalEntryEducation.value}{sup(career.typicalEntryEducation.source)}</>],
              ...(career.license ? [[t("license"), <>{career.license.name}</>]] : []),
            ].map(([k, v], i) => (
              <tr key={i}>
                <td style={{ padding: "4px 0", color: C.sub, verticalAlign: "top", width: 110 }}>{k}</td>
                <td style={{ padding: "4px 0", fontWeight: 700 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 2. Roadmap ── */}
      <Heading n={++section} note={t("roadmapNote")}>{t("roadmap")}</Heading>
      {steps.map(({ seg, stage }, i) => (
        <div key={seg.stageId} data-block style={{ display: "flex", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 28 }}>
            <div style={{ width: 26, height: 26, borderRadius: 999, background: C.teal, color: "#ffffff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</div>
            <div style={{ flex: 1, width: 2, background: C.line, minHeight: 14 }} />
          </div>
          <div style={{ flex: 1, paddingBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{stage.title}</div>
              <div style={{ fontSize: 11, color: C.teal, fontWeight: 700, whiteSpace: "nowrap" }}>
                {termAt(plan.inputs.startTerm, seg.startYear)} → {lastTerm(plan.inputs.startTerm, seg.startYear, seg.startYear + seg.years)}
              </div>
            </div>
            <div style={{ fontSize: 11.5, color: C.sub, marginTop: 2 }}>
              {stage.subtitle ? `${stage.subtitle} · ` : ""}
              {t("duration", { n: Math.round(seg.years * 10) / 10 })}
              {stage.fee ? ` · ${t("fee")} ${formatMoney(stage.fee.value)}` : ""}
              {seg.earning ? ` · ${t("earning")}` : ""}
            </div>
          </div>
        </div>
      ))}
      <div data-block style={{ display: "flex", gap: 14 }}>
        <div style={{ width: 28, display: "flex", justifyContent: "center" }}>
          <div style={{ width: 26, height: 26, borderRadius: 999, background: C.coral, color: "#ffffff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>★</div>
        </div>
        <div style={{ flex: 1, background: C.coralSoft, borderRadius: 10, padding: "8px 12px" }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{careerName}</div>
          <div style={{ fontSize: 11.5, color: C.sub }}>
            {t("arrive", { term: termAt(plan.inputs.startTerm, plan.yearsToCareer), pay: formatMoney(plan.startingPay.value) })}
          </div>
        </div>
      </div>

      {/* ── 3. Semesters ── */}
      <Heading n={++section} note={t("semestersNote", { n: plan.creditsPerTerm })}>{t("semesters")}</Heading>
      {semesterRows.map((row, ri) => (
        <div key={ri} data-block style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          {row.map((s) => (
            <div key={s.term + s.school} style={{ flex: 1, border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden" }}>
              <div style={{ background: C.card, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{s.label}</span>
                <span style={{ fontSize: 10.5, color: C.sub }}>{s.school} · {s.credits} cr</span>
              </div>
              <div style={{ padding: "6px 12px 8px" }}>
                {s.courses.map((c, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, padding: "2.5px 0", borderBottom: i < s.courses.length - 1 ? `1px dashed ${C.line}` : "none" }}>
                    {c.code !== "UPPER" && <span style={{ width: 64, color: C.teal, fontWeight: 700, flexShrink: 0 }}>{c.code}</span>}
                    <span style={{ flex: 1 }}>{c.title}</span>
                    <span style={{ color: C.faint }}>{c.credits}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {row.length === 1 && <div style={{ flex: 1 }} />}
        </div>
      ))}

      {/* ── 4. Money plan ── */}
      <Heading n={++section}>{tMoney("title")}</Heading>
      {finance ? (
        <>
          <div data-block>
            <div style={{ display: "flex", gap: 10 }}>
              <Tile label={tMoney("totalCost")} value={formatMoney(plan.totalCost)} accent={C.ink} />
              <Tile label={tMoney("free")} value={formatMoney(fundingTotals(finance).free)} accent={KIND_COLOR.grant} />
              <Tile label={tMoney("self")} value={formatMoney(fundingTotals(finance).self)} accent={KIND_COLOR.family} />
              <Tile label={tMoney("loans")} value={formatMoney(fundingTotals(finance).loans)} accent={KIND_COLOR.loan} />
            </div>
            <div style={{ display: "flex", height: 16, borderRadius: 8, overflow: "hidden", background: C.line, marginTop: 14 }}>
              {finance.funding.map((l, i) => (
                <div key={i} style={{ width: `${(l.amount / Math.max(1, finance.totalCost)) * 100}%`, background: KIND_COLOR[l.kind] }} />
              ))}
            </div>
            <div
              style={{
                marginTop: 10,
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                background: finance.gap > 0 ? C.coralSoft : C.kelpSoft,
                color: finance.gap > 0 ? C.coral : C.kelp,
              }}
            >
              {finance.gap > 0
                ? tMoney("gap", { amount: formatMoney(finance.gap) })
                : finance.gap < 0
                  ? tMoney("spare", { amount: formatMoney(-finance.gap) })
                  : tMoney("covered")}
            </div>
          </div>

          <div data-block style={{ display: "flex", gap: 20, marginTop: 16 }}>
            <div style={{ flex: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{tMoney("howYouPay")}</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                <tbody>
                  {finance.funding.map((l, i) => (
                    <tr key={i}>
                      <td style={{ padding: "5px 0", borderBottom: `1px solid ${C.line}`, width: 14 }}>
                        <div style={{ width: 9, height: 9, borderRadius: 2, background: KIND_COLOR[l.kind] }} />
                      </td>
                      <td style={{ padding: "5px 0", borderBottom: `1px solid ${C.line}` }}>{ft.fundingLabel(l.label)}</td>
                      <td style={{ padding: "5px 0", borderBottom: `1px solid ${C.line}`, textAlign: "right", fontWeight: 700 }}>
                        {formatMoney(l.amount)}{sup(l.source)}
                      </td>
                    </tr>
                  ))}
                  {finance.gap > 0 && (
                    <tr>
                      <td />
                      <td style={{ padding: "5px 0", color: C.coral }}>{tMoney("gapLabel")}</td>
                      <td style={{ padding: "5px 0", textAlign: "right", fontWeight: 700, color: C.coral }}>{formatMoney(finance.gap)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ background: C.card, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{tMoney("monthlyTitle")}</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginTop: 6 }}>
                  <span style={{ color: C.sub }}>{tMoney("monthlyCost")}</span>
                  <b>{tMoney("perMonth", { amount: formatMoney(finance.monthly.cost) })}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginTop: 3 }}>
                  <span style={{ color: C.sub }}>{tMoney("monthlyIncome")}</span>
                  <b>{tMoney("perMonth", { amount: formatMoney(finance.monthly.income) })}</b>
                </div>
              </div>
              <div style={{ background: C.card, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{tMoney("loanTitle")}</div>
                <div style={{ fontSize: 11.5, marginTop: 4 }}>
                  {finance.loanPayment ? (
                    <>
                      {tMoney("loanBody", {
                        total: formatMoney(finance.loanPayment.total),
                        monthly: formatMoney(finance.loanPayment.monthly),
                        pct: Math.round(finance.loanPayment.shareOfPay * 100),
                      })}{" "}
                      <b style={{ color: finance.loanPayment.shareOfPay < 0.1 ? C.kelp : C.coral }}>
                        {finance.loanPayment.shareOfPay < 0.1 ? tMoney("loanOk") : tMoney("loanHigh")}
                      </b>
                    </>
                  ) : (
                    <b style={{ color: C.kelp }}>{tMoney("noLoans")}</b>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div data-block style={{ background: C.sandSoft, borderRadius: 10, padding: "12px 14px", fontSize: 12, color: C.sand }}>
          <b>{t("noMoneyTitle")}</b> {t("noMoneyBody")}
        </div>
      )}

      <div data-block style={{ display: "flex", gap: 20, marginTop: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{t("costs")}</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
            <tbody>
              {plan.costs.map((c) => (
                <tr key={c.label}>
                  <td style={{ padding: "4px 0", borderBottom: `1px solid ${C.line}` }}>{c.label}</td>
                  <td style={{ padding: "4px 0", borderBottom: `1px solid ${C.line}`, textAlign: "right" }}>{formatMoney(c.amount)}{sup(c.source)}</td>
                </tr>
              ))}
              <tr>
                <td style={{ padding: "5px 0", fontWeight: 700 }}>{tMoney("totalCost")}</td>
                <td style={{ padding: "5px 0", fontWeight: 700, textAlign: "right" }}>{formatMoney(plan.totalCost)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{t("aid")}</div>
          {plan.aid.length ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <tbody>
                {plan.aid.map((a) => (
                  <tr key={a.label}>
                    <td style={{ padding: "4px 0", borderBottom: `1px solid ${C.line}`, color: C.kelp }}>{ft.fundingLabel(a.label)}</td>
                    <td style={{ padding: "4px 0", borderBottom: `1px solid ${C.line}`, textAlign: "right", color: C.kelp }}>−{formatMoney(a.amount)}{sup(a.source)}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: "5px 0", fontWeight: 700 }}>{tMoney("afterGrants")}</td>
                  <td style={{ padding: "5px 0", fontWeight: 700, textAlign: "right" }}>{formatMoney(plan.netCost)}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div style={{ fontSize: 11.5, color: C.sub }}>{t("noAid")}</div>
          )}
        </div>
      </div>

      {/* ── 5. Checklist ── */}
      <Heading n={++section} note={t("checklistNote")}>{t("checklist")}</Heading>
      {finance && (
        <>
          <div data-block="keep" style={{ fontSize: 13, fontWeight: 700, color: C.teal, margin: "4px 0 6px" }}>{tMoney("actionsTitle")}</div>
          {finance.actions.map((a) => (
            <Check key={a.id} title={ft.actionTitle(a)} detail={ft.actionDetail(a)}
              right={a.due ? fmtDate(a.due, locale) : a.amount ? (a.id === "save" ? tMoney("perMonth", { amount: formatMoney(a.amount) }) : formatMoney(a.amount)) : undefined}
            />
          ))}
        </>
      )}
      <div data-block="keep" style={{ fontSize: 13, fontWeight: 700, color: C.teal, margin: "14px 0 6px" }}>{t("milestones")}</div>
      {steps.map(({ seg, stage }) => (
        <Check
          key={seg.stageId}
          title={t(stage.kind === "exam" || stage.kind === "certification" ? "pass" : "finish", { stage: stage.title })}
          detail={stage.subtitle ?? ""}
          right={`≈ ${lastTerm(plan.inputs.startTerm, seg.startYear, seg.startYear + seg.years)}`}
        />
      ))}
      {/* Only list the license separately when no exam step already covers it. */}
      {career.license && !steps.some(({ stage }) => stage.title === career.license!.name) && (
        <Check title={t("getLicensed", { license: career.license.name })} detail={career.license.body} />
      )}
      <div data-block="keep" style={{ fontSize: 13, fontWeight: 700, color: C.teal, margin: "14px 0 6px" }}>{t("dates")}</div>
      {deadlines.map((d) => (
        <Check key={d.id} title={<>{d.title}{sup(d.source)}</>} detail={d.description} right={fmtDate(d.date, locale)} />
      ))}
      <div data-block="keep" style={{ fontSize: 13, fontWeight: 700, color: C.teal, margin: "14px 0 6px" }}>{t("habits")}</div>
      {(["advisor", "gpa", "tutoring", "experience", "fafsa"] as const).map((k) => (
        <Check key={k} title={t(`habit.${k}`)} detail="" />
      ))}

      {/* ── Sources ── */}
      <Heading n={++section}>{t("sources")}</Heading>
      <div data-block style={{ fontSize: 10, color: C.sub }}>
        <div style={{ fontWeight: 700, color: C.ink, marginBottom: 4 }}>{t("assumptions")}</div>
        {plan.assumptions.map((a) => (
          <div key={a.text}>• {a.text}</div>
        ))}
      </div>
      {/* Numbers drawn by hand — html2canvas drops <ol> markers. */}
      <div data-block style={{ marginTop: 10, fontSize: 9.5, color: C.sub, lineHeight: 1.55 }}>
        {[...sources.values()].map((s, i) => (
          <div key={s.id} style={{ display: "flex", gap: 6 }}>
            <span style={{ width: 18, flexShrink: 0, color: C.teal, fontWeight: 700 }}>[{i + 1}]</span>
            <span>
              {s.title}
              {s.asOf ? ` (${s.asOf})` : ""} — {s.url}
              {s.verified ? "" : ` — ${t("sampleShort")}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Check({ title, detail, right }: { title: React.ReactNode; detail: string; right?: string }) {
  return (
    <div data-block style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>
      <div style={{ width: 13, height: 13, border: `1.5px solid ${C.teal}`, borderRadius: 3, marginTop: 1, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>{title}</div>
        {detail && <div style={{ fontSize: 10.5, color: C.sub, marginTop: 1 }}>{detail}</div>}
      </div>
      {right && <div style={{ fontSize: 11, color: C.teal, fontWeight: 700, whiteSpace: "nowrap" }}>{right}</div>}
    </div>
  );
}

function textPdf(pdf: import("jspdf").jsPDF, plan: PlanResult, career: Career, student?: string) {
  let y = 50;
  const write = (text: string, size = 11, gap = 16) => {
    pdf.setFontSize(size);
    for (const l of pdf.splitTextToSize(text, 500)) {
      if (y > PAGE_H - 60) {
        pdf.addPage();
        y = 50;
      }
      pdf.text(l, 48, y);
      y += gap;
    }
  };
  write(`My SharkPath plan — ${career.title}`, 18, 26);
  if (student) write(student);
  write(`Years to first job: ${plan.yearsToCareer} · Net cost: ${formatMoney(plan.netCost)}`);
  y += 8;
  for (const s of plan.semesters) write(`${s.label} (${s.school}, ${s.credits} cr): ${s.courses.map((c) => c.title).join(", ")}`, 10, 14);
}
