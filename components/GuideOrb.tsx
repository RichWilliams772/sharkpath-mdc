"use client";

import type { Voice } from "@/lib/types";

/**
 * Sonar & Tide as two soap bubbles. When the guides agree they float together as one revolving bubble,
 * their films swirling into each other. When they're split, the bubbles drift apart and revolve around
 * each other. Whoever is speaking glows. While listening, the bubble breathes with the student's voice (--mic).
 */
export default function GuideOrb({
  size = "lg", listening, split, speaking, onClick,
}: {
  size?: "lg" | "sm";
  listening: boolean;
  split: boolean;
  speaking?: Voice | null;
  onClick: () => void;
}) {
  const cls = ["gorb", size, listening ? "live" : "idle", split ? "split" : "", speaking ? `say-${speaking}` : ""].join(" ");
  return (
    <button className={cls} type="button" aria-pressed={listening} aria-label={listening ? "Stop listening and send" : "Talk to your guides"} onClick={onClick}>
      {size === "lg" && (
        <>
          <span className="ring" aria-hidden="true" />
          <span className="ring r2" aria-hidden="true" />
          <span className="ring r3" aria-hidden="true" />
        </>
      )}
      <span className="gorb-orbit" aria-hidden="true">
        <span className="gorb-slot sonar"><span className="bubble sonar" /></span>
        <span className="gorb-slot tide"><span className="bubble tide" /></span>
      </span>
      {size === "lg" && (
        <span className="gorb-motes" aria-hidden="true"><i /><i /><i /></span>
      )}
      <svg className="gorb-mic" width={size === "lg" ? 34 : 17} height={size === "lg" ? 34 : 17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" />
      </svg>
    </button>
  );
}
