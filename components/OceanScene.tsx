"use client";

import { useEffect, useRef } from "react";

const MAX_DEPTH_M = 45;
const SNOW = {
  far: { count: 14, size: [2, 3], dur: [52, 70] },
  mid: { count: 9, size: [4, 6], dur: [35, 44] },
  near: { count: 5, size: [14, 26], dur: [22, 30] },
} as const;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Fire the underwater jet burst from an element (or screen centre). Then scroll wherever you like. */
export function jet(from?: Element | null) {
  const r = from?.getBoundingClientRect();
  const x = r ? r.left + r.width / 2 : innerWidth / 2;
  const y = r ? r.top + r.height / 2 : innerHeight / 2;
  window.dispatchEvent(new CustomEvent("sharkpath:jet", { detail: { x, y } }));
}

/** Fire a jet burst, then glide to a section once the surge peaks. */
export function jetTo(from: Element | null | undefined, targetId: string) {
  jet(from);
  setTimeout(() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" }), 260);
}

/** pinDepth: hold the water at a fixed depth (0–1) instead of following scroll, e.g. inside the explorer. */
export default function OceanScene({ pinDepth = null }: { pinDepth?: number | null }) {
  const pinRef = useRef(pinDepth);
  pinRef.current = pinDepth;
  const diveRef = useRef<HTMLDivElement>(null);
  const jetRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;

    // marine snow at three depths
    const spawned: HTMLElement[] = [];
    document.querySelectorAll<HTMLElement>("[data-snow]").forEach((layer) => {
      const cfg = SNOW[layer.dataset.snow as keyof typeof SNOW];
      for (let i = 0; i < cfg.count; i++) {
        const s = document.createElement("span");
        const size = rand(cfg.size[0], cfg.size[1]).toFixed(1);
        const dur = rand(cfg.dur[0], cfg.dur[1]);
        s.className = "snow";
        s.style.left = (((i + Math.random()) / cfg.count) * 100).toFixed(1) + "%";
        s.style.width = s.style.height = size + "px";
        s.style.animationDuration = dur.toFixed(1) + "s";
        s.style.animationDelay = (-Math.random() * dur).toFixed(1) + "s";
        layer.appendChild(s);
        spawned.push(s);
      }
    });

    // parallax + depth loop
    let tx = 0, ty = 0, cx = 0, cy = 0, td = 0, cd = 0, lastM = -1, raf = 0;
    const onMove = (e: PointerEvent) => {
      if (reduce) return;
      tx = (e.clientX / innerWidth) * 2 - 1;
      ty = (e.clientY / innerHeight) * 2 - 1;
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      td = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    };
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      cx += (tx - cx) * 0.05;
      cy += (ty - cy) * 0.05;
      const target = pinRef.current ?? td;
      cd += (target - cd) * 0.08;
      const idleX = reduce ? 0 : Math.sin(t * 0.35) * 0.18;
      const idleY = reduce ? 0 : Math.cos(t * 0.27) * 0.12;
      root.style.setProperty("--px", (cx + idleX).toFixed(4));
      root.style.setProperty("--py", (cy + idleY).toFixed(4));
      root.style.setProperty("--bob", reduce ? "0" : Math.sin(t * 0.9).toFixed(4));
      root.style.setProperty("--depth", cd.toFixed(4));
      const m = Math.round(cd * MAX_DEPTH_M);
      if (m !== lastM && readoutRef.current) {
        readoutRef.current.textContent = "−" + m + " m";
        lastM = m;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // jet propulsion: shockwave ring + bubble wake from the selection, light streaks rushing past
    const onJet = (e: Event) => {
      if (reduce) return;
      const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail;
      const layer = jetRef.current;
      const restart = (el: Element | null) => {
        if (!el) return;
        el.classList.remove("jet");
        void (el as HTMLElement).offsetWidth;
        el.classList.add("jet");
      };
      restart(diveRef.current);
      restart(document.querySelector(".content"));
      if (!layer) return;

      const made: HTMLElement[] = [];
      const add = (cls: string, style: Record<string, string>) => {
        const el = document.createElement("span");
        el.className = cls;
        Object.entries(style).forEach(([k, v]) => el.style.setProperty(k, v));
        layer.appendChild(el);
        made.push(el);
      };
      add("jet-ring", { left: x + "px", top: y + "px" });
      for (let i = 0; i < 34; i++) {
        // wake trails backwards and upward, like thrust pushing water behind you
        const ang = rand(-Math.PI * 0.95, -Math.PI * 0.05);
        const dist = rand(120, 420);
        const size = rand(4, 16);
        add("jet-bubble", {
          left: x + rand(-20, 20) + "px", top: y + rand(-10, 10) + "px",
          width: size + "px", height: size + "px",
          "--dx": Math.cos(ang) * dist + "px", "--dy": Math.sin(ang) * dist - rand(40, 200) + "px",
          "--d": rand(0.8, 1.5).toFixed(2) + "s", "animation-delay": rand(0, 0.15).toFixed(2) + "s",
        });
      }
      for (let i = 0; i < 26; i++) {
        add("jet-streak", {
          left: rand(0, 100).toFixed(1) + "%", height: rand(60, 180) + "px",
          "--d": rand(0.5, 0.9).toFixed(2) + "s", "animation-delay": rand(0, 0.2).toFixed(2) + "s",
          opacity: rand(0.3, 0.9).toFixed(2),
        });
      }
      setTimeout(() => made.forEach((el) => el.remove()), 1900);
    };
    addEventListener("sharkpath:jet", onJet);

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", onMove);
      removeEventListener("scroll", onScroll);
      removeEventListener("sharkpath:jet", onJet);
      spawned.forEach((s) => s.remove());
    };
  }, []);

  return (
    <>
      {/* SVG filters: animated surface ripple + caustic light net */}
      <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
        <defs>
          <filter id="ripple" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.006 0.018" numOctaves={2} seed={4} result="n">
              <animate attributeName="baseFrequency" dur="16s" values="0.006 0.018;0.009 0.024;0.006 0.018" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="n" scale={34} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="caustics" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="turbulence" baseFrequency="0.011 0.016" numOctaves={2} seed={9} result="t" />
            <feColorMatrix in="t" type="matrix" values="0 0 0 0 0.78  0 0 0 0 0.96  0 0 0 0 1  0 0 0 -11 2.6" />
            <feGaussianBlur stdDeviation={1.4} />
          </filter>
        </defs>
      </svg>

      <div className="scene" aria-hidden="true">
        <div className="dive" ref={diveRef}>
          <div className="par p-surface"><div className="surface" /></div>
          <div className="par p-rays">
            <svg className="caustic" viewBox="0 0 1200 600" preserveAspectRatio="none"><rect width="1200" height="600" filter="url(#caustics)" /></svg>
            <svg className="caustic b" viewBox="0 0 1200 600" preserveAspectRatio="none" style={{ transform: "scaleX(-1)" }}><rect width="1200" height="600" filter="url(#caustics)" /></svg>
            <div className="rays" />
            <div className="rays b" />
          </div>
          <div className="par p-far" data-snow="far" />
          <div className="par p-mid" data-snow="mid" />
          <div className="par p-near" data-snow="near" />
          <div className="tint" />
          <div className="scrim" />
          <div className="vignette" />
        </div>
        <div className="splash" />
      </div>

      <div className="jet-layer" ref={jetRef} aria-hidden="true" />

      <div className="gauge" aria-hidden="true" hidden={pinDepth != null}>
        <div className="gauge-labels"><span>0 M</span><span>15 M</span><span>30 M</span><span>45 M</span></div>
        <div className="track"><span className="knob" /></div>
        <div className="readout"><span ref={readoutRef}>−0 m</span></div>
      </div>
    </>
  );
}
