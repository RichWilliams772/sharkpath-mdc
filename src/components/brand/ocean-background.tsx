// Fixed, decorative underwater scene behind every page:
// deep-water gradient, shimmering surface caustics, god rays and drifting bubbles.
// Pure CSS animations (transform/opacity only) so it stays smooth and survives
// Next.js hiding/re-showing pages. Kept dark so content always reads clearly.
// Deterministic values (no Math.random) so server and client match.

/**
 * Caustic web texture: a thin band of fractal noise around 0.5 → bright veins, tinted cyan.
 * The filter region is pinned to the tile (x/y/width/height) so it repeats without seams.
 */
const caustics = (seed: number, fx: number, fy: number) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='300'><filter id='f' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='${fx} ${fy}' numOctaves='2' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.62 0 0 0 0 0.95 0 0 0 0 1 1 0 0 0 0'/><feComponentTransfer><feFuncA type='table' tableValues='0 0 0 0 0.12 0.9 0.12 0 0 0 0'/></feComponentTransfer></filter><rect width='600' height='300' filter='url(#f)'/></svg>`,
  )}")`;

// Light beams fanning down from the surface: angle (deg), width (vw), pulse duration/delay (s)
const RAYS = [
  { angle: -30, width: 5, duration: 9, delay: 0 },
  { angle: -21, width: 8, duration: 11, delay: 2 },
  { angle: -13, width: 4, duration: 8, delay: 4 },
  { angle: -6, width: 10, duration: 12, delay: 1 },
  { angle: 1, width: 6, duration: 10, delay: 5 },
  { angle: 8, width: 9, duration: 13, delay: 3 },
  { angle: 15, width: 4, duration: 9, delay: 6 },
  { angle: 23, width: 7, duration: 11, delay: 2.5 },
  { angle: 31, width: 5, duration: 10, delay: 4.5 },
];

const BUBBLES = [
  { left: 6, size: 5, delay: 0, duration: 14 },
  { left: 17, size: 8, delay: 5, duration: 18 },
  { left: 29, size: 4, delay: 9, duration: 12 },
  { left: 41, size: 6, delay: 2, duration: 16 },
  { left: 55, size: 3, delay: 11, duration: 11 },
  { left: 63, size: 9, delay: 6, duration: 20 },
  { left: 74, size: 4, delay: 1, duration: 13 },
  { left: 86, size: 6, delay: 8, duration: 17 },
  { left: 95, size: 4, delay: 3, duration: 15 },
];

export function OceanBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#01070f]">
      {/* Deep water: lit surface at the top, fading to near-black */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 85% 50% at 50% -6%, rgba(32,128,168,0.85) 0%, rgba(14,78,116,0.55) 35%, transparent 72%)," +
            "linear-gradient(180deg, #0a3f60 0%, #062a45 24%, #04192e 52%, #020d1b 78%, #01070f 100%)",
        }}
      />

      {/* Surface caustics — two textures drifting opposite ways, faded out with depth */}
      <div className="absolute inset-x-0 top-0 h-[42vh] opacity-35 mix-blend-screen [mask-image:linear-gradient(to_bottom,black_0%,rgba(0,0,0,0.5)_45%,transparent_100%)]">
        <div
          className="absolute top-0 -left-[600px] h-full w-[calc(100%+1200px)] animate-caustic-a will-change-transform"
          style={{ backgroundImage: caustics(3, 0.011, 0.03), backgroundSize: "600px 300px" }}
        />
        <div
          className="absolute top-0 -left-[600px] h-full w-[calc(100%+1200px)] animate-caustic-b opacity-70 will-change-transform"
          style={{ backgroundImage: caustics(11, 0.014, 0.04), backgroundSize: "600px 300px" }}
        />
      </div>

      {/* God rays from the surface */}
      <div className="absolute top-[-8vh] left-1/2 h-[115vh] w-0 animate-rays-sway mix-blend-screen [mask-image:linear-gradient(to_bottom,black_0%,rgba(0,0,0,0.6)_40%,transparent_92%)]">
        {RAYS.map((r) => (
          <span
            key={r.angle}
            className="absolute top-0 h-full origin-top -translate-x-1/2 animate-ray blur-xl"
            style={
              {
                width: `${r.width}vw`,
                rotate: `${r.angle}deg`,
                background: "linear-gradient(to bottom, rgba(150,230,255,0.28), rgba(90,190,230,0.1) 55%, transparent)",
                animationDuration: `${r.duration}s`,
                animationDelay: `-${r.delay}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Drifting bubbles */}
      {BUBBLES.map((b) => (
        <span
          key={b.left}
          className="absolute -bottom-6 animate-rise rounded-full border border-[#9ff5ec]/30 bg-[#9ff5ec]/[0.06]"
          style={
            {
              left: `${b.left}%`,
              width: b.size,
              height: b.size,
              animationDelay: `-${b.delay}s`,
              "--rise-duration": `${b.duration}s`,
            } as React.CSSProperties
          }
        />
      ))}

      {/* Vignette keeps edges and the deep end dark for contrast */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,transparent_50%,rgba(1,6,14,0.6)_100%)]" />
    </div>
  );
}
