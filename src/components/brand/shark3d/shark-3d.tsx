"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SharkIcon } from "../shark";
import type { SharkScene } from "./scene";

/**
 * Animated 3D shark (three.js, loaded lazily). Renders only while on screen,
 * holds still for reduced-motion users, and falls back to the neon SVG shark
 * when WebGL isn't available. Size it like the SVG (2:1, e.g. `h-16 w-32`).
 */
export function Shark3D({
  mode = "hover",
  girth = 1,
  className,
}: {
  mode?: "hover" | "cruise";
  /** 1 = sleek; ~1.35 = thick great white */
  girth?: number;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    const el = box.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    let scene: SharkScene | null = null;
    let raf = 0;
    let visible = false;
    let cancelled = false;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const loop = (time: number) => {
      scene?.render(time);
      if (visible && !still && !document.hidden) raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(loop);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      kick();
    });
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height) {
        scene?.resize(r.width, r.height);
        scene?.render(performance.now());
      }
    });
    document.addEventListener("visibilitychange", kick);

    import("./scene")
      .then(({ createSharkScene }) => {
        if (cancelled) return;
        const rim = getComputedStyle(el).color || "#2ee6d6";
        scene = createSharkScene(cv, { mode, rim, swim: still ? 0 : 1, girth });
        const r = el.getBoundingClientRect();
        scene.resize(r.width || 128, r.height || 64);
        scene.render(performance.now());
        setState("ready");
        io.observe(el);
        ro.observe(el);
      })
      .catch(() => {
        if (!cancelled) setState("fallback");
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", kick);
      scene?.dispose();
    };
  }, [mode, girth]);

  return (
    <div ref={box} className={cn("relative text-primary", className)} aria-hidden>
      {state === "fallback" ? (
        <SharkIcon className="size-full" />
      ) : (
        <canvas
          ref={canvas}
          className={cn("absolute inset-0 size-full transition-opacity duration-500", state === "ready" ? "opacity-100" : "opacity-0")}
        />
      )}
    </div>
  );
}
