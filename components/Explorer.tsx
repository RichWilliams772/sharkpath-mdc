"use client";

import { useEffect, useMemo, useState } from "react";
import GuideOrb from "@/components/GuideOrb";
import { jet } from "@/components/OceanScene";
import PlanView from "@/components/PlanView";
import RouteSpace from "@/components/RouteSpace";
import Voices from "@/components/Voices";
import { fit, netCost, type Check } from "@/lib/feasibility";
import { FACTORS, normalize, type Scored, usd } from "@/lib/scoring";
import type { GuideLine, GuideReply, LlmPref, Profile, Roadmap, RouteDetail, Weights } from "@/lib/types";

export type Focus = { routeTitle: string; tab: string; facts: string };

const TABS = [
  { key: "overview", label: "Overview", ask: "Is this the right route for me?" },
  { key: "cost", label: "Cost & aid", ask: "How would I actually pay for this?" },
  { key: "career", label: "Career & pay", ask: "What is this job really like day to day?" },
  { key: "fit", label: "Feasibility", ask: "Can I realistically do this?" },
  { key: "next", label: "Next steps", ask: "What should I do this week?" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const money = (n?: number) => (n == null ? "—" : usd(n));
const pct = (n: number) => `${Math.round(n)}`;

export default function Explorer(props: {
  roadmap: Roadmap;
  scored: Scored[];
  weights: Weights;
  setWeights: (w: Weights) => void;
  profile: Profile | null;
  setProfile: (p: Profile) => void;
  llm: Partial<LlmPref>;
  onSurface: () => void;
  ask: (message: string, shown?: string, focus?: Focus) => Promise<GuideReply | null>;
  reply: GuideReply | null;
  thinking: boolean;
  speaking: number;
  question?: string;
  listening: boolean;
  toggleListen: () => void;
  voiceNote?: string;
}) {
  const { roadmap, scored, profile, llm } = props;
  const [routeId, setRouteId] = useState(scored[0]?.id);
  const [tab, setTab] = useState<Tab>("overview");
  // route = one route in depth, compare = all routes side by side, plan = the finished plan
  const [view, setView] = useState<"route" | "compare" | "plan">("route");
  const compare = view === "compare";
  const [planId, setPlanId] = useState<string | null>(null);
  const [planWords, setPlanWords] = useState<GuideLine[] | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [details, setDetails] = useState<Record<string, RouteDetail | "loading">>({});
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(!profile);
  const [done, setDone] = useState<Record<string, boolean>>({});

  const route = scored.find((r) => r.id === routeId) ?? scored[0];
  const detail = route && details[route.id] !== "loading" ? (details[route.id] as RouteDetail | undefined) : undefined;
  const loadingDetail = route && details[route.id] === "loading";
  const fits = useMemo(
    () => Object.fromEntries(scored.map((r) => [r.id, fit(r, profile, details[r.id] === "loading" ? null : (details[r.id] as RouteDetail))])),
    [scored, profile, details],
  );

  // Load the deep view for the open route (and only that one) on demand.
  useEffect(() => {
    if (!route || details[route.id]) return;
    setDetails((d) => ({ ...d, [route.id]: "loading" }));
    fetch("/api/route-detail", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ career: roadmap.career, college: roadmap.college, route, llm }),
    })
      .then((r) => r.json())
      .then((d: RouteDetail) => setDetails((all) => ({ ...all, [route.id]: d })))
      .catch(() => setDetails(({ [route.id]: _, ...rest }) => rest));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.id]);

  function open(id: string, el?: Element) {
    jet(el);
    setView("route");
    setRouteId(id);
  }

  function makePlan(el: Element) {
    if (!route || !detail) return;
    jet(el);
    if (route.id === planId) return setView("plan"); // already their plan: just go back to it
    setPlanId(route.id);
    setView("plan");
    setPlanWords(null);
    setPlanLoading(true);
    props
      .ask(
        `I've decided: "${route.title}" is my plan. Give me your closing advice before I start: what to do first and what to watch out for.`,
        "Make this my plan",
        { routeTitle: route.title, tab: "Your plan", facts: `${usd(route.metrics.costUSD)} before aid, ~${usd(detail.costs.aidEstimate)} aid, ${route.metrics.years} yrs; first steps: ${detail.nextActions.slice(0, 3).join("; ")}` },
      )
      .then((r) => setPlanWords(r?.lines ?? null))
      .finally(() => setPlanLoading(false));
  }

  function askHere(q: string) {
    if (!route) return;
    const f = fits[route.id];
    const facts = [
      `${usd(route.metrics.costUSD)} before aid`,
      detail && `~${usd(detail.costs.aidEstimate)} aid`,
      `${route.metrics.years} yrs`,
      `difficulty ${route.metrics.difficulty}/10`,
      route.wages?.nationalMedian && `median pay ${usd(route.wages.nationalMedian)} as ${route.landsAs}`,
      f.score != null && `fit ${pct(f.score)} (${f.checks.map((c) => `${c.label}: ${c.level}`).join(", ")})`,
    ].filter(Boolean).join("; ");
    props.ask(q, q, { routeTitle: route.title, tab: TABS.find((t) => t.key === tab)!.label, facts });
  }

  const w = normalize(props.weights);

  return (
    <div className="explorer">
      <div className="ex-top">
        <div className="crumbs">
          <button className="crumb" type="button" onClick={props.onSurface}>Surface</button>
          <span aria-hidden="true">›</span>
          <button className="crumb" type="button" onClick={() => setView("compare")}>{roadmap.career} <small>from {roadmap.college}</small></button>
          {route && view === "route" && (<><span aria-hidden="true">›</span><span className="crumb current">{route.title}</span></>)}
          {view === "plan" && (<><span aria-hidden="true">›</span><span className="crumb current">Your plan</span></>)}
        </div>
        <div className="ex-actions">
          <button className="btn btn-ghost glass" type="button" aria-expanded={weightsOpen} onClick={() => { setWeightsOpen((o) => !o); setProfileOpen(false); }}>What matters to me</button>
          <button className="btn btn-ghost glass" type="button" aria-expanded={profileOpen} onClick={() => { setProfileOpen((o) => !o); setWeightsOpen(false); }}>{profile ? "My situation" : "Add my situation"}</button>
        </div>
        {weightsOpen && (
          <div className="pop glass" role="dialog" aria-label="What matters to me">
            <p className="pop-title">What matters most to you? <small>Match scores update live.</small></p>
            {FACTORS.map((f) => (
              <div className="weight" key={f.key}>
                <div className="weight-top"><label htmlFor={`xw-${f.key}`}>{f.label}</label><b>{Math.round(w[f.key])}%</b></div>
                <input id={`xw-${f.key}`} type="range" min={0} max={100} value={props.weights[f.key]} onChange={(e) => props.setWeights({ ...props.weights, [f.key]: Number(e.target.value) })} />
                <small>{f.hint}</small>
              </div>
            ))}
          </div>
        )}
        {profileOpen && <ProfileForm profile={profile} onSave={(p) => { props.setProfile(p); setProfileOpen(false); }} onSkip={() => setProfileOpen(false)} />}
      </div>

      <div className="ex-body">
        {/* routes */}
        <aside className="ex-routes" aria-label="Routes">
          <div className="pane-head">
            <span>{scored.length} routes · by match</span>
            <button className={`chip${compare ? " on" : ""}`} type="button" onClick={(e) => { jet(e.currentTarget); setView((v) => (v === "compare" ? "route" : "compare")); }}>Compare all</button>
          </div>
          {scored.map((r, i) => {
            const f = fits[r.id];
            return (
              <button key={r.id} type="button" className={`rcard glass${r.id === route?.id && view === "route" ? " on" : ""}${r.id === planId ? " is-plan" : ""}`} onClick={(e) => open(r.id, e.currentTarget)}>
                <span className="rcard-top">
                  <span className="rank-sm">{String(i + 1).padStart(2, "0")}</span>
                  {r.kind && <span className="kind">{r.kind}</span>}
                  {r.id === planId && <span className="plan-tag">your plan</span>}
                  <span className="rcard-score" title="Match with your priorities">{pct(r.score)}</span>
                </span>
                <span className="rcard-title">{r.title}</span>
                <span className="rcard-meta">
                  <span>{usd(r.metrics.costUSD)}</span><span>{r.metrics.years} yrs</span>
                  {r.wages?.nationalMedian && <span>{usd(r.wages.nationalMedian)}/yr pay</span>}
                </span>
                {f.score != null && <FitPill score={f.score} />}
              </button>
            );
          })}
        </aside>

        {/* main */}
        <section className="ex-main glass" aria-live="polite">
          {view === "plan" && planId && scored.find((r) => r.id === planId) && details[planId] && details[planId] !== "loading" ? (
            <PlanView
              roadmap={roadmap}
              scored={scored}
              route={scored.find((r) => r.id === planId)!}
              detail={details[planId] as RouteDetail}
              profile={profile}
              weights={w}
              fit={fits[planId]}
              done={(details[planId] as RouteDetail).nextActions.map((_, i) => !!done[`${planId}:${i}`])}
              setDone={(i, v) => setDone((d) => ({ ...d, [`${planId}:${i}`]: v }))}
              guide={planWords}
              guideLoading={planLoading}
              onBack={() => { setRouteId(planId); setView("route"); }}
              onOpen={(id) => open(id)}
              onAddSituation={() => setProfileOpen(true)}
            />
          ) : compare || !route ? (
            <Compare scored={scored} fits={fits} planId={planId} onOpen={(id, el) => open(id, el)} />
          ) : (
            <>
              <div className="rv-head">
                <div>
                  {route.kind && <span className="kind">{route.kind}</span>}
                  <h2 className="display">{route.title}</h2>
                  <p className="rv-sum">{route.summary}{route.landsAs && <> First job: <b>{route.landsAs}</b>.</>}</p>
                </div>
                <div className="rv-side">
                  <div className="rv-scores">
                    <span><b>{pct(route.score)}</b>match</span>
                    <span><b>{fits[route.id].score != null ? pct(fits[route.id].score!) : "—"}</b>fit</span>
                  </div>
                  <button className="btn btn-primary make-plan" type="button" disabled={!detail} onClick={(e) => makePlan(e.currentTarget)}>
                    {!detail ? "Loading details…" : route.id === planId ? "View my plan" : "Make this my plan"}
                  </button>
                </div>
              </div>

              <div className="stats">
                <Stat label="Cost before aid" value={usd(route.metrics.costUSD)} />
                <Stat label="Est. after aid" value={detail ? usd(netCost(route, detail)) : loadingDetail ? "…" : "—"} />
                <Stat label="Time to working" value={`${route.metrics.years} yrs`} />
                <Stat label="Median pay" value={money(route.wages?.nationalMedian)} hint={route.wages?.nationalMedian ? "BLS" : undefined} />
                <Stat label="Difficulty" value={`${route.metrics.difficulty}/10`} />
              </div>

              <div className="tabs" role="tablist">
                {TABS.map((t) => (
                  <button key={t.key} role="tab" aria-selected={tab === t.key} className={`tab${tab === t.key ? " on" : ""}`} type="button" onClick={() => setTab(t.key)}>{t.label}</button>
                ))}
              </div>

              <div className="tab-body" role="tabpanel">
                {loadingDetail && tab !== "career" && (
                  <p className="charting-msg"><span className="dots" aria-hidden="true"><i /><i /><i /></span>Sonar is mapping every term of this route…</p>
                )}
                {tab === "overview" && (
                  <>
                    <Bars route={route} />
                    <h3>Timeline</h3>
                    <ol className="timeline">
                      {(detail?.timeline ?? route.steps).map((s, i) => (
                        <li key={i}>
                          <span className="tl-dot" aria-hidden="true" />
                          <span className="tl-stage">{s.stage}</span>
                          <span className="tl-meta">{s.institution} · {s.duration}{s.costUSD ? ` · ${usd(s.costUSD)}` : ""}</span>
                          <span className="tl-detail">{s.detail}</span>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
                {tab === "cost" && detail && <CostView route={route} detail={detail} profile={profile} />}
                {tab === "career" && <CareerView route={route} roadmap={roadmap} detail={detail} />}
                {tab === "fit" && (
                  <>
                    <FitView checks={fits[route.id].checks} hasProfile={!!profile} onAdd={() => setProfileOpen(true)} />
                    {detail && (
                      <div className="two">
                        <div><h3>Requirements</h3><ul className="list">{detail.requirements.map((r, i) => <li key={i}>{r}</li>)}</ul></div>
                        <div><h3>Where this goes wrong</h3><ul className="list risk">{detail.risks.map((r, i) => <li key={i}>{r}</li>)}</ul></div>
                      </div>
                    )}
                  </>
                )}
                {tab === "next" && detail && (
                  <>
                    <h3>Do these this term</h3>
                    <ul className="checklist">
                      {detail.nextActions.map((a, i) => {
                        const k = `${route.id}:${i}`;
                        return (
                          <li key={k}>
                            <label><input type="checkbox" checked={!!done[k]} onChange={(e) => setDone({ ...done, [k]: e.target.checked })} /> <span>{a}</span></label>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
                {detail && detail.source !== "llm" && detail.source !== "seed" && detail.source !== "cache" && (
                  <p className="note">Detail is limited in demo mode.</p>
                )}
              </div>
            </>
          )}
        </section>

        {/* guides */}
        <aside className="ex-dock" aria-label="Sonar and Tide">
          <div className="dock-head">
            <GuideOrb
              size="sm"
              listening={props.listening}
              split={props.reply?.stance === "split"}
              speaking={props.speaking >= 0 && props.reply ? props.reply.lines[props.speaking]?.voice : null}
              onClick={props.toggleListen}
            />
            <div><b className="display">Sonar &amp; Tide</b><small>{props.voiceNote ?? (props.listening ? "Listening… just talk" : "Tap the orb and talk, or type below")}</small></div>
          </div>
          {route && view === "route" && (
            <div className="chips">
              {TABS.filter((t) => t.key === tab).map((t) => <button key={t.key} className="chip" type="button" onClick={() => askHere(t.ask)}>{t.ask}</button>)}
              <button className="chip" type="button" onClick={() => askHere(`How does "${route.title}" compare with the other routes for me?`)}>Compare with the others</button>
            </div>
          )}
          <Voices question={props.question} reply={props.reply} loading={props.thinking} speakingIndex={props.speaking} routeTitle={(id) => scored.find((r) => r.id === id)?.title} />
          <form
            className="ask-form glass dock-ask"
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem("dockask") as HTMLInputElement;
              const q = input.value.trim();
              if (!q) return;
              input.value = "";
              askHere(q);
            }}
          >
            <label htmlFor="dockask" className="sr-only">Ask your guides</label>
            <input id="dockask" name="dockask" className="ask" placeholder="Ask anything about this route…" autoComplete="off" />
            <button className="btn send" type="submit" aria-label="Send">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <span className="stat"><b>{value}</b>{label}{hint && <em>{hint}</em>}</span>;
}

function FitPill({ score }: { score: number }) {
  const lvl = score >= 75 ? "ok" : score >= 50 ? "warn" : "bad";
  return <span className={`fit-pill ${lvl}`}>Fit {Math.round(score)} · {lvl === "ok" ? "realistic for you" : lvl === "warn" ? "doable with a plan" : "hard right now"}</span>;
}

function Bars({ route }: { route: Scored }) {
  return (
    <div className="bars">
      {FACTORS.map((f) => (
        <span className="bar" key={f.key}>
          <span><span>{f.label}</span><span>{f.key === "cost" ? usd(route.metrics.costUSD) : f.key === "time" ? `${route.metrics.years} yrs` : f.key === "difficulty" ? `${route.metrics.difficulty}/10` : route.metrics.relevancy}</span></span>
          <span className="bar-track"><span className="bar-fill" style={{ display: "block", width: `${route.parts[f.key]}%` }} /></span>
        </span>
      ))}
    </div>
  );
}

function CostView({ route, detail, profile }: { route: Scored; detail: RouteDetail; profile: Profile | null }) {
  const c = detail.costs;
  const gross = c.tuition + c.booksFees + c.living;
  const net = Math.max(0, gross - c.aidEstimate);
  const perYear = net / Math.max(1, route.metrics.years);
  const early = route.wages?.national25;
  const rows = [
    { label: "Tuition", v: c.tuition, cls: "t" },
    { label: "Books & fees", v: c.booksFees, cls: "b" },
    { label: "Extra living (relocating)", v: c.living, cls: "l" },
  ].filter((r) => r.v > 0);
  return (
    <>
      <div className="costbar" aria-hidden="true">
        {rows.map((r) => <span key={r.label} className={r.cls} style={{ flex: r.v }} />)}
      </div>
      <table className="ctable">
        <tbody>
          {rows.map((r) => <tr key={r.label}><td><i className={`sw ${r.cls}`} />{r.label}</td><td>{usd(r.v)}</td></tr>)}
          <tr className="aid"><td><i className="sw a" />Estimated aid</td><td>−{usd(c.aidEstimate)}</td></tr>
          <tr className="total"><td>You pay (estimate)</td><td>{usd(net)}</td></tr>
        </tbody>
      </table>
      <p className="note">{c.aidNote} Aid and costs are AI estimates. Confirm with your financial aid office and studentaid.gov.</p>
      <div className="stats">
        <Stat label="Per year" value={usd(perYear)} />
        {profile && <Stat label="Your budget / yr" value={usd(profile.budgetPerYear)} />}
        {early && <Stat label="Paid back in" value={`~${Math.max(1, Math.round(net / (early / 12)))} mo`} hint="of early-career pay" />}
      </div>
    </>
  );
}

function CareerView({ route, roadmap, detail }: { route: Scored; roadmap: Roadmap; detail?: RouteDetail }) {
  const w = route.wages;
  return (
    <>
      <h3>{route.landsAs ?? roadmap.career}{route.soc && <small className="soc"> SOC {route.soc}</small>}</h3>
      {w?.nationalMedian ? (
        <>
          <div className="stats">
            <Stat label="US median pay" value={money(w.nationalMedian)} />
            <Stat label="Early-career (25th pct)" value={money(w.national25)} />
            <Stat label="Miami metro median" value={money(w.miamiMedian)} />
          </div>
          <p className="note">Source: U.S. Bureau of Labor Statistics, Occupational Employment and Wage Statistics{w.year ? `, ${w.year}` : ""}. Real data, not an estimate.</p>
        </>
      ) : (
        <p className="note">No BLS wage data matched this job title.</p>
      )}
      {roadmap.outlook && (
        <div className="outlook">
          <b>{roadmap.outlook.growthPct > 0 ? "+" : ""}{roadmap.outlook.growthPct}%</b>
          <span>projected 10-year job growth for {roadmap.career}<em>AI estimate</em><br />{roadmap.outlook.summary}</span>
        </div>
      )}
      {detail?.dayInLife && (<><h3>A normal day</h3><p className="prose">{detail.dayInLife}</p></>)}
    </>
  );
}

function FitView({ checks, hasProfile, onAdd }: { checks: Check[]; hasProfile: boolean; onAdd: () => void }) {
  if (!hasProfile) {
    return (
      <div className="empty">
        <p>Feasibility depends on your situation: budget, free time, work and GPA.</p>
        <button className="btn btn-primary" type="button" onClick={onAdd}>Add my situation (4 questions)</button>
      </div>
    );
  }
  return (
    <ul className="checks">
      {checks.map((c) => (
        <li key={c.label} className={c.level}>
          <span className="ck" aria-hidden="true">{c.level === "ok" ? "✓" : c.level === "warn" ? "!" : "✕"}</span>
          <span><b>{c.label}</b> {c.detail}</span>
        </li>
      ))}
    </ul>
  );
}

function Compare({ scored, fits, planId, onOpen }: { scored: Scored[]; fits: Record<string, { score: number | null }>; planId: string | null; onOpen: (id: string, el?: Element) => void }) {
  type Row = { label: string; get: (r: Scored) => number | undefined | null; fmt: (n: number) => string; best: "max" | "min" };
  const rows: Row[] = [
    { label: "Match", get: (r) => r.score, fmt: (n) => pct(n), best: "max" },
    { label: "Fit for you", get: (r) => fits[r.id].score, fmt: (n) => pct(n), best: "max" },
    { label: "Cost before aid", get: (r) => r.metrics.costUSD, fmt: usd, best: "min" },
    { label: "Years to working", get: (r) => r.metrics.years, fmt: (n) => `${n}`, best: "min" },
    { label: "Difficulty", get: (r) => r.metrics.difficulty, fmt: (n) => `${n}/10`, best: "min" },
    { label: "Job relevancy", get: (r) => r.metrics.relevancy, fmt: (n) => `${n}`, best: "max" },
    { label: "Median pay (BLS)", get: (r) => r.wages?.nationalMedian, fmt: usd, best: "max" },
    { label: "Miami median (BLS)", get: (r) => r.wages?.miamiMedian, fmt: usd, best: "max" },
    { label: "Hours / week", get: (r) => r.weeklyHours, fmt: (n) => `${n}`, best: "min" },
    { label: "Min GPA", get: (r) => r.minGpa, fmt: (n) => n.toFixed(1), best: "min" },
  ];
  return (
    <div className="compare">
      <h2 className="display">Compare every route</h2>
      <RouteSpace routes={scored} planId={planId} onOpen={(id) => onOpen(id)} />
      <div className="ctable-wrap">
        <table className="cmp">
          <thead>
            <tr>
              <th />
              {scored.map((r) => <th key={r.id}><button type="button" className="cmp-open" onClick={(e) => onOpen(r.id, e.currentTarget)}>{r.title}</button>{r.kind && <span className="kind">{r.kind}</span>}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr><td>Lands as</td>{scored.map((r) => <td key={r.id}>{r.landsAs ?? "—"}</td>)}</tr>
            {rows.map((row) => {
              const vals = scored.map((r) => row.get(r)).filter((v): v is number => v != null);
              const best = vals.length ? (row.best === "max" ? Math.max(...vals) : Math.min(...vals)) : null;
              return (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  {scored.map((r) => {
                    const v = row.get(r);
                    return <td key={r.id} className={v != null && v === best && vals.length > 1 ? "best" : ""}>{v == null ? "—" : row.fmt(v)}</td>;
                  })}
                </tr>
              );
            })}
            <tr><td>Work-friendly</td>{scored.map((r) => <td key={r.id}>{r.workFriendly == null ? "—" : r.workFriendly ? "Yes" : "Hard"}</td>)}</tr>
          </tbody>
        </table>
      </div>
      <p className="note">Highlighted = best in row. Pay is real BLS data for the job each route lands in; other figures are estimates.</p>
    </div>
  );
}

const BUDGETS = [
  { v: 1500, label: "Under $2k" },
  { v: 4000, label: "$2k–5k" },
  { v: 8000, label: "$5k–10k" },
  { v: 15000, label: "$10k–20k" },
  { v: 30000, label: "$20k+" },
];

function ProfileForm({ profile, onSave, onSkip }: { profile: Profile | null; onSave: (p: Profile) => void; onSkip: () => void }) {
  const [p, setP] = useState<Profile>(profile ?? { budgetPerYear: 4000, hoursPerWeek: 25, work: "part", gpa: null });
  const [gpaText, setGpaText] = useState(profile?.gpa != null ? String(profile.gpa) : "");
  return (
    <form
      className="pop glass profile"
      role="dialog"
      aria-label="My situation"
      onSubmit={(e) => {
        e.preventDefault();
        const g = parseFloat(gpaText);
        onSave({ ...p, gpa: Number.isFinite(g) ? Math.min(4, Math.max(0, g)) : null });
      }}
    >
      <div className="line sonar"><span className="who">Sonar</span><span>Four quick questions so we can tell you what&apos;s realistic, not just what&apos;s possible.</span></div>
      <div className="line tide"><span className="who">Tide</span><span>No wrong answers. This stays in your browser.</span></div>

      <fieldset>
        <legend>1. What can you put toward school each year?</legend>
        <div className="seg">
          {BUDGETS.map((b) => <button key={b.v} type="button" className={`chip${p.budgetPerYear === b.v ? " on" : ""}`} onClick={() => setP({ ...p, budgetPerYear: b.v })}>{b.label}</button>)}
        </div>
      </fieldset>
      <fieldset>
        <legend>2. Hours per week free for class + study: <b>{p.hoursPerWeek}</b></legend>
        <input type="range" min={5} max={50} step={1} value={p.hoursPerWeek} onChange={(e) => setP({ ...p, hoursPerWeek: Number(e.target.value) })} />
      </fieldset>
      <fieldset>
        <legend>3. Are you working?</legend>
        <div className="seg">
          {(["none", "part", "full"] as const).map((k) => <button key={k} type="button" className={`chip${p.work === k ? " on" : ""}`} onClick={() => setP({ ...p, work: k })}>{k === "none" ? "Not working" : k === "part" ? "Part-time" : "Full-time"}</button>)}
        </div>
      </fieldset>
      <fieldset>
        <legend>4. Your GPA (high school or college)</legend>
        <input className="gpa" inputMode="decimal" placeholder="e.g. 3.2, or leave blank if not sure" value={gpaText} onChange={(e) => setGpaText(e.target.value)} />
      </fieldset>
      <div className="row">
        <button className="btn btn-ghost glass" type="button" onClick={onSkip}>Skip for now</button>
        <button className="btn btn-primary" type="submit">Save</button>
      </div>
    </form>
  );
}
