import type { SVGProps } from "react";

// Neon-sign shark, facing right: dark body with a glowing tube outline
// (soft glow + colored tube + bright white core), blue neon gills, a ringed
// eye and a slim mouth with small teeth.
// Tube color = currentColor. `simple` drops the details for tiny sizes.
// viewBox is 2:1 so existing `h-N w-2N` sizes keep working.

/**
 * Great-white silhouette: pointed snout → back → tall dorsal → small second dorsal →
 * heterocercal tail (long upper lobe) → belly with pelvic fin → swept pectoral → jaw.
 */
const BODY =
  "M78 22.5 C74 18 66 15.5 56 14.6 C53 14.3 50.5 14.1 48 14 " +
  "C46 10 43.5 6.2 41 3.6 C40.6 7.4 40 11 38.6 14.4 " +
  "C32 15 25 16 19.4 17.2 L17.6 15.4 L16.6 17.6 C14.6 18 12.8 18.3 11 18.6 " +
  "C8 14 4.6 9.2 2.2 5.6 C4.4 11 6.4 16 6.8 20.2 C5.6 24 4.4 27.4 3 30 " +
  "C7 27 9.6 24.2 12 22.2 C20 25 28 27.4 34 28.5 L31.2 31.6 L36.4 28.9 " +
  "C40 29.4 43 29.6 46 29.5 C44 32 42 34.6 39.6 36.8 C45 34 49 31.2 52.6 29 " +
  "C62 28.4 70 27 74 25.5 C76 24.8 77.6 23.7 78 22.5 Z";

const GILLS = [
  "M55.2 18.6 C54.6 21 54.6 23.4 55.2 25.8",
  "M57.3 18.3 C56.7 20.9 56.7 23.5 57.3 26",
  "M59.4 18.2 C58.8 20.8 58.8 23.4 59.4 25.9",
  "M61.5 18.3 C60.9 20.8 60.9 23.2 61.5 25.6",
];
const MOUTH = "M76 24.1 C73 25.1 69.6 25.7 65.8 25.6";
const TEETH = [74, 72.2, 70.4, 68.6].map((x) => {
  const y = 24.1 + (76 - x) * 0.17;
  return `M${x - 0.45} ${y} L${x} ${y + 0.9} L${x + 0.45} ${y} Z`;
});

const BODY_FILL = "#05141e";
const GILL_BLUE = "#7fa6ff";
const CORE = "#f1fffd";

/** One neon tube: soft glow, colored tube, bright core. */
function Tube({ d, color, w = 1, closed }: { d: string; color: string; w?: number; closed?: boolean }) {
  const common = { d, fill: "none", strokeLinecap: "round", strokeLinejoin: "round", ...(closed ? {} : {}) } as const;
  return (
    <>
      <path {...common} stroke={color} strokeOpacity={0.28} strokeWidth={3.4 * w} />
      <path {...common} stroke={color} strokeWidth={1.5 * w} />
      <path {...common} stroke={CORE} strokeOpacity={0.85} strokeWidth={0.5 * w} />
    </>
  );
}

export function SharkIcon({ simple, ...props }: SVGProps<SVGSVGElement> & { simple?: boolean }) {
  return (
    <svg viewBox="0 0 80 40" aria-hidden {...props}>
      <path d={BODY} fill={BODY_FILL} fillOpacity={0.92} />
      {simple ? (
        <path d={BODY} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinejoin="round" />
      ) : (
        <>
          <Tube d={BODY} color="currentColor" closed />
          {GILLS.map((d) => (
            <Tube key={d} d={d} color={GILL_BLUE} w={0.75} />
          ))}
          <Tube d={MOUTH} color="currentColor" w={0.55} />
          {TEETH.map((d) => (
            <path key={d} d={d} fill={CORE} />
          ))}
          {/* Eye: neon ring with a bright pupil */}
          <circle cx="70.6" cy="20.2" r="1" fill="none" stroke="currentColor" strokeWidth={0.7} />
          <circle cx="70.6" cy="20.2" r="0.4" fill={CORE} />
        </>
      )}
    </svg>
  );
}

export function SharkFinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M3 19 C8 18 10 9 15 4 C15 9 16 15 21 19 Z" />
      <path d="M1 21 C4 19.5 6 22 9 20.5 C12 19 14 22 17 20.5 C19 19.5 21 21 23 20.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}
