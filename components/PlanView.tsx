"use client";

import { useEffect, useState } from "react";
import RouteSpace from "@/components/RouteSpace";
import type { Check } from "@/lib/feasibility";
import { netCost } from "@/lib/feasibility";
import { type Scored, usd } from "@/lib/scoring";
import type { GuideLine, Profile, Roadmap, RouteDetail, Weights } from "@/lib/types";

type Fit = { score: number | null; checks: Check[] };

/** The end of the dive: the student's finished plan, the 4D route chart, and ways to keep it. */
export default function PlanView(props: {
  roadmap: Roadmap;
  scored: Scored[];
  route: Scored;
  detail: RouteDetail;
  profile: Profile | null;
  weights: Weights;
  fit: Fit;
  done: boolean[];
  setDone: (i: number, v: boolean) => void;
  guide: GuideLine[] | null;
  guideLoading: boolean;
  onBack: () => void;
  onOpen: (id: string) => void;
  onAddSituation: () => void;
}) {
  const { roadmap, route, detail, profile, fit } = props;
  const [emailReady, setEmailReady] = useState<boolean | null>(null);
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState<"pdf" | "email" | "share" | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);

  useEffect(() => {
    fetch("/api/email").then((r) => r.json()).then((d) => setEmailReady(!!d.configured)).catch(() => setEmailReady(false));
    try {
      setCanShareFiles(!!navigator.canShare?.({ files: [new File([""], "x.pdf", { type: "application/pdf" })] }));
    } catch {
      setCanShareFiles(false);
    }
  }, []);

  async function makePdf() {
    const { buildPlanPdf, planFileName } = await import("@/lib/plan-pdf");
    const doc = buildPlanPdf({
      career: roadmap.career, college: roadmap.college, route, detail, others: props.scored,
      profile, weights: props.weights, fit, guide: props.guide, done: props.done, date: new Date(),
    });
    return { doc, name: planFileName({ career: roadmap.career }) };
  }

  async function savePdf() {
    setBusy("pdf");
    try {
      const { doc, name } = await makePdf();
      doc.save(name);
      setStatus({ kind: "ok", text: `Saved ${name} to your downloads.` });
    } catch {
      setStatus({ kind: "err", text: "Couldn't build the PDF. Try again." });
    } finally {
      setBusy(null);
    }
  }

  async function sharePdf() {
    setBusy("share");
    try {
      const { doc, name } = await makePdf();
      const file = new File([doc.output("blob")], name, { type: "application/pdf" });
      await navigator.share({ files: [file], title: `My SharkPath plan: ${roadmap.career}`, text: `${route.title}. My plan from SharkPath.` });
      setStatus({ kind: "ok", text: "Shared." });
    } catch (e) {
      if ((e as DOMException)?.name !== "AbortError") setStatus({ kind: "err", text: "Sharing didn't work here. Use Save PDF instead." });
    } finally {
      setBusy(null);
    }
  }

  async function emailPdf(e: React.FormEvent) {
    e.preventDefault();
    if (!to.trim()) return;
    setBusy("email");
    try {
      const { doc, name } = await makePdf();
      if (emailReady) {
        const bytes = new Uint8Array(doc.output("arraybuffer"));
        let bin = "";
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        const res = await fetch("/api/email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ to: to.trim(), pdf: btoa(bin), career: roadmap.career, routeTitle: route.title, fileName: name }),
        });
        const out = await res.json();
        if (res.ok) return setStatus({ kind: "ok", text: `Sent to ${to.trim()}. Check your inbox (and spam, just in case).` });
        if (res.status !== 501) return setStatus({ kind: "err", text: out.error ?? "Couldn't send the email." });
      }
      // No mail server configured: hand the PDF to the student's own email app.
      doc.save(name);
      const body = `My SharkPath plan for becoming a ${roadmap.career}: ${route.title}.\n\nThe full plan is the PDF that just downloaded (${name}). Attach it here before sending.\n\nNext steps:\n${detail.nextActions.map((a) => `- ${a}`).join("\n")}`;
      window.location.href = `mailto:${encodeURIComponent(to.trim())}?subject=${encodeURIComponent(`My SharkPath plan: ${roadmap.career}`)}&body=${encodeURIComponent(body)}`;
      setStatus({ kind: "info", text: `Your email app is opening. ${name} just downloaded, so attach it to the message.` });
    } catch {
      setStatus({ kind: "err", text: "Couldn't prepare the email. Use Save PDF instead." });
    } finally {
      setBusy(null);
    }
  }

  const net = netCost(route, detail);
  const steps = [
    { label: "Career", done: true },
    { label: "Route", done: true },
    { label: "Your situation", done: !!profile },
    { label: "Plan", done: true },
  ];

  return (
    <div className="plan">
      <div className="plan-head">
        <ol className="plan-steps" aria-label="Plan progress">
          {steps.map((s) => (
            <li key={s.label} className={s.done ? "done" : ""}>
              <span aria-hidden="true">{s.done ? "✓" : "○"}</span>
              {s.label === "Your situation" && !s.done ? <button className="crumb" type="button" onClick={props.onAddSituation}>Add your situation</button> : s.label}
            </li>
          ))}
        </ol>
        <h2 className="display">Your plan: {route.title}</h2>
        <p className="rv-sum">
          {roadmap.career} · starting at {roadmap.college}
          {route.landsAs && <> · first job <b>{route.landsAs}</b></>}
        </p>
      </div>

      <div className="stats">
        <Stat label="You pay after est. aid" value={usd(net)} />
        <Stat label="Years to working" value={`${route.metrics.years}`} />
        <Stat label="Median pay" value={route.wages?.nationalMedian ? usd(route.wages.nationalMedian) : "—"} hint={route.wages?.nationalMedian ? "BLS" : undefined} />
        <Stat label="Match" value={`${Math.round(route.score)}`} />
        <Stat label="Fit" value={fit.score != null ? `${Math.round(fit.score)}` : "—"} />
      </div>

      <div className="keep glass">
        <div className="keep-row">
          <button className="btn btn-primary" type="button" onClick={savePdf} disabled={busy !== null}>
            {busy === "pdf" ? "Building PDF…" : "Save as PDF"}
          </button>
          {canShareFiles && (
            <button className="btn btn-ghost glass" type="button" onClick={sharePdf} disabled={busy !== null}>{busy === "share" ? "Opening…" : "Share"}</button>
          )}
        </div>
        <form className="keep-email" onSubmit={emailPdf}>
          <label htmlFor="plan-email">Email it to me</label>
          <div>
            <input id="plan-email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" value={to} onChange={(e) => setTo(e.target.value)} />
            <button className="btn btn-ghost glass" type="submit" disabled={busy !== null || !to.trim()}>
              {busy === "email" ? "Sending…" : emailReady === false ? "Open in my email" : "Send"}
            </button>
          </div>
          {emailReady === false && <small>Opens your email app with the PDF ready to attach.</small>}
        </form>
        {status && <p className={`keep-status ${status.kind}`} role="status">{status.text}</p>}
      </div>

      <RouteSpace routes={props.scored} planId={route.id} onOpen={props.onOpen} />

      <section className="plan-guides" aria-live="polite">
        <h3>Sonar &amp; Tide&apos;s closing advice</h3>
        {props.guideLoading && !props.guide && <p className="charting-msg"><span className="dots" aria-hidden="true"><i /><i /><i /></span>Your guides are thinking it over…</p>}
        {props.guide?.map((l, i) => (
          <div key={i} className={`line ${l.voice}`}><span className="who">{l.voice === "sonar" ? "Sonar" : "Tide"}</span><span>{l.text}</span></div>
        ))}
      </section>

      <section>
        <h3>Your next steps</h3>
        <ul className="checklist">
          {detail.nextActions.map((a, i) => (
            <li key={i}>
              <label><input type="checkbox" checked={!!props.done[i]} onChange={(e) => props.setDone(i, e.target.checked)} /> <span>{a}</span></label>
            </li>
          ))}
        </ul>
      </section>

      <div className="row" style={{ justifyContent: "flex-start" }}>
        <button className="btn btn-ghost glass" type="button" onClick={props.onBack}>Change my route</button>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <span className="stat"><b>{value}</b>{label}{hint && <em>{hint}</em>}</span>;
}
