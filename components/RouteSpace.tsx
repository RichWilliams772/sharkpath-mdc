"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Scored } from "@/lib/scoring";
import { usd } from "@/lib/scoring";

// "Route Space": a rotatable 3D bubble chart with a 4th dimension.
//   → x: cost before aid   ↑ y: median pay (real BLS data)   ↗ z (depth): years to working
//   bubble size: match score (the student's own priorities)
// Identity is the route number inside each bubble (matches the route list), never color alone.
// Color has one job: the student's plan (teal) vs the other routes (blue). Both validated for this dark surface.
// Screen-only: deliberately not part of the PDF.

const PLAN = "#1fa898";
const OTHER = "#3987e5";
const W = 720, H = 430, D = 4.6, FLOOR = -1.2, TOP = 1.05, XW = 1.55; // XW: the tank is wider along the cost axis
const YAW0 = 0.5, PITCH0 = 0.42, SWAY = 0.38; // starting view: cost runs right, years run back, camera above the seabed
const SAND = 58; // px of seabed with shells along the bottom

type Rot = { yaw: number; pitch: number };
/** Rotate (yaw about the vertical, then pitch so the camera looks down) and apply perspective. */
function view([x, y, z]: P3, { yaw, pitch }: Rot) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
  const y2 = y * cp + z1 * sp, z2 = -y * sp + z1 * cp;
  const f = D / (D + z2);
  return { x: x1 * f, y: y2 * f, depth: z2, f };
}
const CORNERS: P3[] = [-XW, XW].flatMap((x) => [FLOOR, TOP].flatMap((y) => [-1, 1].map((z) => [x, y, z] as P3)));
/** One fixed scale and centre that keeps the whole box in frame across the drift range (no zoom pumping). */
const FIT = (() => {
  let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
  for (const yaw of [YAW0 - SWAY - 0.15, YAW0, YAW0 + SWAY + 0.15]) for (const c of CORNERS) {
    const v = view(c, { yaw, pitch: PITCH0 });
    minx = Math.min(minx, v.x); maxx = Math.max(maxx, v.x); miny = Math.min(miny, v.y); maxy = Math.max(maxy, v.y);
  }
  const S = Math.min((W - 150) / (maxx - minx), (H - SAND - 52) / (maxy - miny));
  return { S, CX: W / 2 - (S * (minx + maxx)) / 2, CY: (H - SAND) / 2 + 10 + (S * (miny + maxy)) / 2 };
})();

type P3 = [number, number, number];
type Route = Scored & { fit?: number | null };

const kfmt = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`);

function range(vals: number[]): [number, number] {
  const lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi === lo) return [lo - Math.max(1, Math.abs(lo) * 0.25), hi + Math.max(1, Math.abs(hi) * 0.25)];
  const pad = (hi - lo) * 0.08;
  return [lo - pad, hi + pad];
}
const norm = (v: number, [lo, hi]: [number, number]) => ((v - lo) / (hi - lo)) * 2 - 1;
const normX = (v: number, r: [number, number]) => norm(v, r) * XW;

export default function RouteSpace({ routes, planId, onOpen }: { routes: Route[]; planId?: string | null; onOpen?: (id: string) => void }) {
  const [yaw, setYaw] = useState(YAW0);
  const [pitch, setPitch] = useState(PITCH0);
  const [hover, setHover] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const [auto, setAuto] = useState(true);
  const wrap = useRef<HTMLDivElement>(null);

  // Gentle drift so the depth reads as depth; stops as soon as the student takes the controls.
  useEffect(() => {
    if (!auto || hover || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = performance.now();
    const base = yaw;
    const tick = (now: number) => {
      setYaw(base + Math.sin((now - start) / 4200) * SWAY);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, hover]);

  const ranges = useMemo(() => {
    const pays = routes.map((r) => r.wages?.nationalMedian).filter((v): v is number => !!v);
    return {
      cost: range(routes.map((r) => r.metrics.costUSD)),
      pay: pays.length ? range(pays) : ([0, 1] as [number, number]),
      years: range(routes.map((r) => r.metrics.years)),
    };
  }, [routes]);

  const project = (pt: P3) => {
    const v = view(pt, { yaw, pitch });
    return { sx: FIT.CX + v.x * FIT.S, sy: FIT.CY - v.y * FIT.S, depth: v.depth, f: v.f };
  };

  const points = routes.map((r, i) => {
    const pay = r.wages?.nationalMedian;
    const pos: P3 = [normX(r.metrics.costUSD, ranges.cost), pay ? norm(pay, ranges.pay) : FLOOR, norm(r.metrics.years, ranges.years)];
    const p = project(pos);
    const floor = project([pos[0], FLOOR, pos[2]]);
    const radius = (9 + 15 * Math.sqrt(Math.max(0, r.score) / 100)) * p.f;
    return { r, i, pos, p, floor, radius, isPlan: r.id === planId, hasPay: !!pay };
  });
  const order = [...points].sort((a, b) => b.p.depth - a.p.depth); // far to near

  // Seabed grid + the three axes from the cheap / low-pay / fast corner.
  const grid: { a: P3; b: P3 }[] = [];
  for (let k = -1; k <= 1.001; k += 0.5) {
    grid.push({ a: [k * XW, FLOOR, -1], b: [k * XW, FLOOR, 1] }, { a: [-XW, FLOOR, k], b: [XW, FLOOR, k] });
  }
  const O: P3 = [-XW, FLOOR, -1];
  // Each axis is labelled at its far end with the range it spans, pushed outward from the box centre.
  const axes = [
    { to: [XW, FLOOR, -1] as P3, label: "Cost before aid", range: `${kfmt(Math.max(0, ranges.cost[0]))} → ${kfmt(ranges.cost[1])}` },
    { to: [-XW, TOP, -1] as P3, label: "Median pay", range: `${kfmt(ranges.pay[0])} → ${kfmt(ranges.pay[1])}` },
    { to: [-XW, FLOOR, 1] as P3, label: "Years to working", range: `${Math.max(0, ranges.years[0]).toFixed(1)} → ${ranges.years[1].toFixed(1)} yrs` },
  ];
  const centre = project([0, (FLOOR + TOP) / 2, 0]);

  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, yaw, pitch };
    setAuto(false);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setYaw(drag.current.yaw + (e.clientX - drag.current.x) * 0.008);
    setPitch(Math.min(0.95, Math.max(0.05, drag.current.pitch + (e.clientY - drag.current.y) * 0.006)));
  };
  const onUp = () => { drag.current = null; };
  const onKey = (e: React.KeyboardEvent) => {
    const step = { ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08] }[e.key];
    if (!step) return;
    e.preventDefault();
    setAuto(false);
    setYaw((y) => y + step[0]);
    setPitch((p) => Math.min(0.95, Math.max(0.05, p + step[1])));
  };

  const hovered = points.find((pt) => pt.r.id === hover);
  const payback = (r: Route) => (r.wages?.national25 ? Math.max(1, Math.round(r.metrics.costUSD / (r.wages.national25 / 12))) : null);

  return (
    <figure className="rspace">
      <figcaption className="rspace-head">
        <span className="display">Route space</span>
        <span className="rspace-hint">Drag or use arrow keys to turn it. Hover a bubble for details.</span>
      </figcaption>

      <div className="rspace-stage" ref={wrap}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`3D chart of ${routes.length} routes: cost across, median pay up, years into the depth, bubble size is match score. The table below lists the same values.`}
          tabIndex={0}
          onKeyDown={onKey}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="rspace-svg"
        >
          <defs>
            <radialGradient id="rs-plan" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#d9fff8" stopOpacity="0.95" />
              <stop offset="35%" stopColor={PLAN} />
              <stop offset="100%" stopColor="#0b5f57" />
            </radialGradient>
            <radialGradient id="rs-other" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#dcebff" stopOpacity="0.9" />
              <stop offset="35%" stopColor={OTHER} />
              <stop offset="100%" stopColor="#173f78" />
            </radialGradient>
            <linearGradient id="rs-sand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c9a46b" stopOpacity="0" />
              <stop offset="45%" stopColor="#8a6a3f" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#5d4527" stopOpacity="0.55" />
            </linearGradient>
          </defs>

          {/* seabed */}
          <rect x="0" y={H - SAND - 12} width={W} height={SAND + 12} fill="url(#rs-sand)" />
          <Shells />

          {grid.map((g, k) => {
            const a = project(g.a), b = project(g.b);
            return <line key={k} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke="rgba(150,220,255,.13)" strokeWidth="1" />;
          })}
          {axes.map((ax) => {
            const a = project(O), b = project(ax.to);
            const dx = b.sx - centre.sx, dy = b.sy - centre.sy, len = Math.hypot(dx, dy) || 1;
            const lx = Math.min(W - 70, Math.max(70, b.sx + (dx / len) * 34)), ly = Math.min(H - SAND - 4, Math.max(20, b.sy + (dy / len) * 22));
            return (
              <g key={ax.label}>
                <line x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke="rgba(190,232,255,.55)" strokeWidth="1.5" />
                <text x={lx} y={ly - 3} className="rs-axis" textAnchor="middle">{ax.label}</text>
                <text x={lx} y={ly + 11} className="rs-tick" textAnchor="middle">{ax.range}</text>
              </g>
            );
          })}

          {/* bubbles, far to near, each anchored to the seabed */}
          {order.map(({ r, i, p, floor, radius, isPlan, hasPay }) => {
            const color = isPlan ? PLAN : OTHER;
            const on = hover === r.id;
            return (
              <g key={r.id} className="rs-bubble" opacity={hover && !on ? 0.55 : 1}>
                <ellipse cx={floor.sx} cy={floor.sy} rx={radius * 0.8} ry={radius * 0.28} fill={color} opacity="0.22" />
                {hasPay && <line x1={floor.sx} y1={floor.sy} x2={p.sx} y2={p.sy + radius} stroke={color} strokeOpacity="0.6" strokeWidth="2" />}
                {/* 2px surface ring keeps overlapping bubbles separate */}
                <circle cx={p.sx} cy={p.sy} r={radius + 2} fill="#071d36" />
                <circle cx={p.sx} cy={p.sy} r={radius} fill={`url(#${isPlan ? "rs-plan" : "rs-other"})`} />
                {isPlan && <circle cx={p.sx} cy={p.sy} r={radius + 6} fill="none" stroke={PLAN} strokeWidth="2" className="rs-halo" />}
                <text x={p.sx} y={p.sy + 4} textAnchor="middle" className="rs-num">{String(i + 1).padStart(2, "0")}</text>
                {isPlan && <text x={p.sx + radius + 10} y={p.sy + 4} className="rs-label">Your plan</text>}
                <circle
                  cx={p.sx} cy={p.sy} r={radius + 12} fill="transparent" className="rs-hit"
                  tabIndex={0}
                  role="button"
                  aria-label={`${String(i + 1).padStart(2, "0")} ${r.title}`}
                  onPointerEnter={() => setHover(r.id)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(r.id)}
                  onBlur={() => setHover(null)}
                  onClick={() => onOpen?.(r.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen?.(r.id); } }}
                />
              </g>
            );
          })}
        </svg>

        {hovered && (
          <div
            className={`rs-tip${hovered.p.sy < H * 0.45 ? " below" : ""}`}
            style={{
              left: `${(Math.min(W - 120, Math.max(120, hovered.p.sx)) / W) * 100}%`,
              top: `${((hovered.p.sy + (hovered.p.sy < H * 0.45 ? hovered.radius : -hovered.radius)) / H) * 100}%`,
            }}
            role="status"
          >
            <b>{String(hovered.i + 1).padStart(2, "0")} {hovered.r.title}</b>
            <span>Cost before aid <em>{usd(hovered.r.metrics.costUSD)}</em></span>
            <span>Median pay <em>{hovered.r.wages?.nationalMedian ? usd(hovered.r.wages.nationalMedian) : "no BLS match"}</em></span>
            <span>Years to working <em>{hovered.r.metrics.years}</em></span>
            <span>Match <em>{Math.round(hovered.r.score)}</em></span>
            {payback(hovered.r) && <span>Pays for itself in <em>~{payback(hovered.r)} months</em> of early pay</span>}
          </div>
        )}
      </div>

      <div className="rs-legend" aria-hidden="true">
        <span><i className="sw-dot" style={{ background: PLAN }} />Your plan</span>
        <span><i className="sw-dot" style={{ background: OTHER }} />Other routes</span>
        <span><i className="sw-size" />Bigger bubble = better match</span>
      </div>

      <table className="rs-table">
        <caption className="sr-only">Route space values</caption>
        <thead>
          <tr><th scope="col">#</th><th scope="col">Route</th><th scope="col">Cost before aid</th><th scope="col">Median pay</th><th scope="col">Years</th><th scope="col">Match</th><th scope="col">Pays back in</th></tr>
        </thead>
        <tbody>
          {routes.map((r, i) => (
            <tr key={r.id} className={r.id === planId ? "is-plan" : ""} onPointerEnter={() => setHover(r.id)} onPointerLeave={() => setHover(null)}>
              <td>{String(i + 1).padStart(2, "0")}</td>
              <td>{r.title}{r.id === planId && <span className="plan-tag">your plan</span>}</td>
              <td>{usd(r.metrics.costUSD)}</td>
              <td>{r.wages?.nationalMedian ? usd(r.wages.nationalMedian) : "—"}</td>
              <td>{r.metrics.years}</td>
              <td>{Math.round(r.score)}</td>
              <td>{payback(r) ? `~${payback(r)} mo` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">Pay is U.S. Bureau of Labor Statistics data for the job each route leads to. &quot;Pays back in&quot; = cost before aid divided by early-career (25th percentile) monthly pay.</p>
    </figure>
  );
}

/** Decorative seashells resting in the sand along the bottom of the chart. */
function Shells() {
  return (
    <g aria-hidden="true" className="rs-shells">
      {/* scallop */}
      <g transform={`translate(70 ${H - 30}) rotate(-8)`}>
        <path d="M0 0 C -26 -6 -30 -34 0 -40 C 30 -34 26 -6 0 0 Z" fill="#f2c9a6" stroke="#b9865f" strokeWidth="1.2" />
        {[-18, -9, 0, 9, 18].map((x) => <path key={x} d={`M0 -2 L ${x} -36`} stroke="#c99470" strokeWidth="1.1" />)}
        <path d="M-7 0 L 7 0 L 5 6 L -5 6 Z" fill="#e3b28d" stroke="#b9865f" strokeWidth="1" />
      </g>
      {/* spiral */}
      <g transform={`translate(210 ${H - 22})`}>
        <path d="M0 0 m -16 0 a 16 15 0 1 1 32 0 a 12 11 0 1 1 -24 0 a 8 7 0 1 1 16 0 a 4.5 4 0 1 1 -9 0" fill="#f6e4cf" stroke="#c49a6c" strokeWidth="1.4" />
      </g>
      {/* cowrie */}
      <g transform={`translate(360 ${H - 20}) rotate(12)`}>
        <ellipse cx="0" cy="0" rx="20" ry="12" fill="#e9d2b8" stroke="#a98159" strokeWidth="1.2" />
        <path d="M-15 1 Q 0 4 15 1" stroke="#7d5a3a" strokeWidth="1.4" fill="none" />
        {[-10, -5, 0, 5, 10].map((x) => <circle key={x} cx={x} cy={-5} r="1.4" fill="#b98e64" />)}
      </g>
      {/* turret / conch */}
      <g transform={`translate(500 ${H - 18}) rotate(-62)`}>
        <path d="M0 0 L 34 -7 L 34 7 Z" fill="#f0d6c0" stroke="#b68660" strokeWidth="1.2" />
        {[8, 15, 22, 28].map((x) => <path key={x} d={`M${x} ${-x * 0.2} L ${x} ${x * 0.2}`} stroke="#c3936b" strokeWidth="1.1" />)}
      </g>
      {/* small scallop */}
      <g transform={`translate(640 ${H - 26}) rotate(14) scale(.72)`}>
        <path d="M0 0 C -26 -6 -30 -34 0 -40 C 30 -34 26 -6 0 0 Z" fill="#f7d8d3" stroke="#c08f88" strokeWidth="1.4" />
        {[-18, -9, 0, 9, 18].map((x) => <path key={x} d={`M0 -2 L ${x} -36`} stroke="#cf9f98" strokeWidth="1.3" />)}
      </g>
      {/* sand ripples */}
      {[110, 290, 430, 580].map((x, k) => (
        <path key={x} d={`M${x} ${H - 8 - (k % 2) * 6} q 14 -5 28 0 t 28 0`} stroke="rgba(230,200,150,.35)" strokeWidth="1.2" fill="none" />
      ))}
    </g>
  );
}
