"use client";

import { jsPDF } from "jspdf";
import type { Check } from "./feasibility";
import { netCost } from "./feasibility";
import { FACTORS, type Scored, usd } from "./scoring";
import type { GuideLine, Profile, RouteDetail, Weights } from "./types";

// The student's finished plan as a clean, printable PDF (US Letter). Built in the browser with jsPDF so it
// can be downloaded instantly or attached to an email. The 3D chart is screen-only and not included.

export type PlanDoc = {
  career: string;
  college: string;
  route: Scored;
  detail: RouteDetail;
  others: Scored[]; // every route, ranked, including the chosen one
  profile: Profile | null;
  weights: Weights; // normalized to 100
  fit: { score: number | null; checks: Check[] };
  guide: GuideLine[] | null; // Sonar & Tide's closing advice
  done: boolean[]; // next-step checkboxes, same order as detail.nextActions
  date: Date;
};

const NAVY = "#0b2540", INK = "#26323d", MUTED = "#5b6b78", TEAL = "#0f7c71", LINE = "#d5dee6", WASH = "#eef5f8";
const PAGE_W = 612, PAGE_H = 792, M = 54, CW = PAGE_W - M * 2;

// Built-in PDF fonts only cover Latin-1 + a few extras: swap the symbols LLM text often contains.
const SWAPS: Record<string, string> = { "→": "->", "←": "<-", "↑": "^", "↓": "v", "≈": "~", "≥": ">=", "≤": "<=", "✓": "", "✕": "x", "×": "x", "−": "-", " ": " ", " ": " ", " ": " " };
const WIN_ANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
export function clean(s: string): string {
  return [...(s ?? "")].map((ch) => SWAPS[ch] ?? (ch.charCodeAt(0) <= 0xff || WIN_ANSI_EXTRA.includes(ch) ? ch : "")).join("");
}

const months = (n: number) => `~${n} ${n === 1 ? "month" : "months"}`;

export function planFileName(p: Pick<PlanDoc, "career">) {
  const slug = clean(p.career).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "career";
  return `SharkPath-plan-${slug}.pdf`;
}

export function buildPlanPdf(p: PlanDoc): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  let y = M;

  const font = (size: number, style: "normal" | "bold" = "normal", color = INK) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(color);
  };
  const lh = (size: number) => size * 1.38;
  const ensure = (h: number) => {
    if (y + h > PAGE_H - M - 18) {
      doc.addPage();
      y = M;
    }
  };
  const para = (text: string, size = 10.5, style: "normal" | "bold" = "normal", color = INK, width = CW, x = M) => {
    font(size, style, color);
    const lines = doc.splitTextToSize(clean(text), width) as string[];
    // Keep short paragraphs whole so a single line never strands on the next page.
    if (lines.length <= 5) ensure(lines.length * lh(size));
    for (const line of lines) {
      ensure(lh(size));
      doc.text(line, x, y + size);
      y += lh(size);
    }
  };
  const heading = (text: string) => {
    ensure(100); // the heading plus a few lines of what follows, never a heading alone at the bottom
    y += 16;
    font(13, "bold", NAVY);
    doc.text(clean(text), M, y + 13);
    y += 20;
    doc.setDrawColor(TEAL);
    doc.setLineWidth(1.2);
    doc.line(M, y, M + 34, y);
    y += 10;
  };
  const bullets = (items: string[], marker: "dot" | "box" = "dot", checked: boolean[] = []) => {
    items.forEach((item, i) => {
      font(10.5);
      const lines = doc.splitTextToSize(clean(item), CW - 20) as string[];
      ensure(lh(10.5) * Math.min(lines.length, 2) + 4);
      if (marker === "box") {
        doc.setDrawColor(MUTED);
        doc.setLineWidth(0.8);
        doc.rect(M, y + 2.5, 9, 9);
        if (checked[i]) {
          doc.setDrawColor(TEAL);
          doc.setLineWidth(1.6);
          doc.line(M + 1.8, y + 7.2, M + 4, y + 9.6);
          doc.line(M + 4, y + 9.6, M + 8, y + 3.8);
        }
      } else {
        doc.setFillColor(TEAL);
        doc.circle(M + 3, y + 7, 1.8, "F");
      }
      for (const line of lines) {
        ensure(lh(10.5));
        font(10.5);
        doc.text(line, M + 18, y + 10.5);
        y += lh(10.5);
      }
      y += 4;
    });
  };
  /** Simple wrapped table. widths are fractions of the content width. */
  const table = (head: string[], rows: string[][], widths: number[], bold = -1) => {
    const cols = widths.map((w) => w * CW);
    const pad = 5;
    const drawRow = (cells: string[], isHead: boolean, highlight: boolean) => {
      font(isHead ? 9 : 9.5, isHead ? "bold" : "normal", isHead ? MUTED : INK);
      const wrapped = cells.map((c, i) => doc.splitTextToSize(clean(c), cols[i] - pad * 2) as string[]);
      const h = Math.max(...wrapped.map((w) => w.length)) * lh(isHead ? 9 : 9.5) + pad * 2;
      ensure(h);
      if (highlight) {
        doc.setFillColor(WASH);
        doc.rect(M, y, CW, h, "F");
      }
      let x = M;
      wrapped.forEach((lines, i) => {
        font(isHead ? 9 : 9.5, isHead || highlight ? "bold" : "normal", isHead ? MUTED : INK);
        lines.forEach((line, k) => doc.text(line, x + pad, y + pad + (k + 1) * lh(isHead ? 9 : 9.5) - 3));
        x += cols[i];
      });
      y += h;
      doc.setDrawColor(LINE);
      doc.setLineWidth(0.6);
      doc.line(M, y, M + CW, y);
    };
    drawRow(head, true, false);
    rows.forEach((r, i) => drawRow(r, false, i === bold));
  };
  const statRow = (stats: [string, string][]) => {
    const n = stats.length, gap = 8, w = (CW - gap * (n - 1)) / n, h = 50;
    ensure(h + 6);
    stats.forEach(([label, value], i) => {
      const x = M + i * (w + gap);
      doc.setFillColor(WASH);
      doc.roundedRect(x, y, w, h, 6, 6, "F");
      font(14, "bold", NAVY);
      doc.text(clean(value), x + 10, y + 22);
      font(8.5, "normal", MUTED);
      doc.text(doc.splitTextToSize(clean(label), w - 16) as string[], x + 10, y + 36);
    });
    y += h + 8;
  };

  // ---- cover band ----
  doc.setFillColor(NAVY);
  doc.rect(0, 0, PAGE_W, 118, "F");
  // logo: ring + wave + up-arrow, as in the app header
  doc.setDrawColor("#7FF0E0");
  doc.setLineWidth(1.6);
  doc.circle(M + 14, 44, 14, "S");
  doc.lines([[4, -4, 8, -4, 12, 0], [4, 4, 8, 4, 12, 0]], M + 2, 46, [1, 1], "S", false);
  doc.line(M + 14, 33, M + 14, 39);
  font(19, "bold", "#ffffff");
  doc.text("SharkPath", M + 38, 50);
  font(9, "normal", "#a9d4e6");
  doc.text(clean(`Plan prepared ${p.date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`), PAGE_W - M, 50, { align: "right" });
  font(21, "bold", "#ffffff");
  doc.text(doc.splitTextToSize(clean(`Your path to ${p.career}`), CW) as string[], M, 90);
  y = 140;

  // ---- the route ----
  para(p.route.title, 16, "bold", NAVY);
  y += 2;
  para([p.route.kind, `starting at ${p.college}`, p.route.landsAs && `first job: ${p.route.landsAs}`].filter(Boolean).join("  |  "), 10, "normal", MUTED);
  y += 4;
  para(p.route.summary, 10.5);
  y += 10;

  const net = netCost(p.route, p.detail);
  const early = p.route.wages?.national25;
  statRow([
    ["Cost before aid", usd(p.route.metrics.costUSD)],
    ["You pay after est. aid", usd(net)],
    ["Years to working", `${p.route.metrics.years}`],
    ["Median pay (BLS)", p.route.wages?.nationalMedian ? usd(p.route.wages.nationalMedian) : "n/a"],
  ]);
  statRow([
    ["Match with your priorities", `${Math.round(p.route.score)} / 100`],
    ["Fit for your situation", p.fit.score != null ? `${Math.round(p.fit.score)} / 100` : "not set"],
    ["Difficulty", `${p.route.metrics.difficulty} / 10`],
    ["Pays for itself in", early ? months(Math.max(1, Math.round(net / (early / 12)))) : "n/a"],
  ]);

  // ---- why ----
  heading("Why this route");
  para(`Your priorities: ${FACTORS.map((f) => `${f.label} ${Math.round(p.weights[f.key])}%`).join(", ")}.`, 10.5);
  if (p.profile) {
    para(`Your situation: about ${usd(p.profile.budgetPerYear)} a year for school, ${p.profile.hoursPerWeek} hours a week free, ${p.profile.work === "none" ? "not working" : p.profile.work === "part" ? "working part-time" : "working full-time"}${p.profile.gpa != null ? `, GPA ${p.profile.gpa.toFixed(1)}` : ""}.`, 10.5);
  }
  if (p.fit.checks.length) {
    y += 4;
    bullets(p.fit.checks.map((c) => `${c.level === "ok" ? "Looks good" : c.level === "warn" ? "Needs a plan" : "Hard right now"} - ${c.label}: ${c.detail}`));
  }

  // ---- guides ----
  if (p.guide?.length) {
    heading("What Sonar & Tide said");
    p.guide.forEach((l) => {
      para(l.voice === "sonar" ? "Sonar (the navigator)" : "Tide (the coach)", 9, "bold", l.voice === "sonar" ? TEAL : "#6a4fb3");
      para(l.text, 10.5);
      y += 4;
    });
  }

  // ---- timeline ----
  heading("Your timeline");
  table(
    ["When", "Where", "Cost", "What you do"],
    p.detail.timeline.map((s) => [s.stage, `${s.institution}${s.duration ? ` (${s.duration})` : ""}`, s.costUSD ? usd(s.costUSD) : "-", s.detail]),
    [0.18, 0.24, 0.11, 0.47],
  );

  // ---- money ----
  heading("Cost and aid");
  const c = p.detail.costs;
  table(
    ["Item", "Amount"],
    [
      ["Tuition", usd(c.tuition)],
      ["Books & fees", usd(c.booksFees)],
      ...(c.living ? [["Extra living costs (relocating)", usd(c.living)]] : []),
      ["Estimated financial aid", `-${usd(c.aidEstimate)}`],
      ["You pay (estimate)", usd(Math.max(0, c.tuition + c.booksFees + c.living - c.aidEstimate))],
    ],
    [0.75, 0.25],
    c.living ? 4 : 3,
  );
  y += 4;
  para(c.aidNote, 9.5, "normal", MUTED);

  // ---- requirements / risks ----
  heading("Requirements");
  bullets(p.detail.requirements);
  heading("Where this can go wrong");
  bullets(p.detail.risks);

  // ---- next steps ----
  heading("Your next steps");
  bullets(p.detail.nextActions, "box", p.done);

  // ---- alternatives ----
  heading("Other routes you considered");
  table(
    ["#", "Route", "Cost", "Years", "Median pay", "Match"],
    p.others.map((r, i) => [String(i + 1).padStart(2, "0"), r.title + (r.id === p.route.id ? "  (your plan)" : ""), usd(r.metrics.costUSD), String(r.metrics.years), r.wages?.nationalMedian ? usd(r.wages.nationalMedian) : "n/a", String(Math.round(r.score))]),
    [0.06, 0.46, 0.13, 0.09, 0.15, 0.11],
    p.others.findIndex((r) => r.id === p.route.id),
  );

  // ---- sources ----
  heading("About these numbers");
  para(
    `Pay figures are from the U.S. Bureau of Labor Statistics, Occupational Employment and Wage Statistics${p.route.wages?.year ? ` (${p.route.wages.year})` : ""}, for the job this route leads to${p.route.soc ? ` (SOC ${p.route.soc})` : ""}. Costs, financial aid, difficulty, timelines and requirements are AI-generated estimates. Confirm them with an academic advisor and the financial aid office at ${p.college}, and at studentaid.gov.`,
    9.5, "normal", MUTED,
  );

  // ---- footer on every page ----
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(8.5, "normal", MUTED);
    doc.text(clean(`SharkPath  |  ${p.career}: ${p.route.title}`).slice(0, 110), M, PAGE_H - 30);
    doc.text(`Page ${i} of ${pages}`, PAGE_W - M, PAGE_H - 30, { align: "right" });
  }
  return doc;
}
