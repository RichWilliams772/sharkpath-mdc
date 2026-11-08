// Procedural 3D great white shark (three.js) — built in code, no model files.
// One merged mesh + one shader:
//   - body: rings of elliptical cross-sections along a fusiform profile
//   - fins: extruded 2D shapes (dorsal, pectorals, crescent tail, small rear fins)
//   - details: eyes, gill slits, mouth line, teeth (tinted via the aTint attribute)
// The vertex shader bends everything side-to-side for a real swimming motion;
// the fragment shader does countershading (dark back, pale belly), soft light
// and a neon teal rim so it matches the site's look.
// Loaded lazily by <Shark3D> so three.js never ships in the first page load.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// ── Body profile (t: 0 = tail base, 1 = snout tip; x = t*2 - 1) ─────────────
const KEYS: [number, number][] = [
  [0, 0.006], [0.07, 0.03], [0.2, 0.065], [0.36, 0.118], [0.55, 0.162],
  [0.7, 0.168], [0.82, 0.15], [0.9, 0.118], [0.955, 0.075], [0.985, 0.035], [1, 0],
];
function halfHeight(t: number) {
  for (let i = 1; i < KEYS.length; i++) {
    const [t1, h1] = KEYS[i];
    const [t0, h0] = KEYS[i - 1];
    if (t <= t1) {
      const u = (t - t0) / (t1 - t0);
      return h0 + (h1 - h0) * (u * u * (3 - 2 * u));
    }
  }
  return 0;
}
const halfWidth = (t: number) => halfHeight(t) * (0.8 + 0.12 * t);
/** Snout sits slightly above the body's midline. */
const centerY = (t: number) => 0.035 * THREE.MathUtils.smoothstep(t, 0.72, 1);
const xOf = (t: number) => t * 2 - 1;

type Part = THREE.BufferGeometry;

/** Adds the per-vertex shading attributes every part needs before merging. */
function finish(g: Part, shade: number | ((y: number) => number), tint = 0): Part {
  const geo = g.index ? g.toNonIndexed() : g;
  geo.deleteAttribute("uv");
  if (!geo.getAttribute("normal")) geo.computeVertexNormals();
  const n = geo.getAttribute("position").count;
  const pos = geo.getAttribute("position");
  if (!geo.getAttribute("aShade")) {
    const s = new Float32Array(n);
    for (let i = 0; i < n; i++) s[i] = typeof shade === "number" ? shade : shade(pos.getY(i));
    geo.setAttribute("aShade", new THREE.BufferAttribute(s, 1));
  }
  geo.setAttribute("aTint", new THREE.BufferAttribute(new Float32Array(n).fill(tint), 1));
  return geo;
}

function body(): Part {
  const RINGS = 72;
  const SEG = 36;
  const positions: number[] = [];
  const shade: number[] = [];
  for (let i = 0; i <= RINGS; i++) {
    const t = i / RINGS;
    const h = halfHeight(t);
    const w = halfWidth(t);
    const c = centerY(t);
    for (let j = 0; j <= SEG; j++) {
      const a = (j / SEG) * Math.PI * 2;
      const s = Math.sin(a);
      // Flatter belly than back.
      positions.push(xOf(t), c + h * s * (s < 0 ? 0.82 : 1), w * Math.cos(a));
      shade.push(THREE.MathUtils.smoothstep(-s, -0.15, 0.55));
    }
  }
  const index: number[] = [];
  for (let i = 0; i < RINGS; i++) {
    for (let j = 0; j < SEG; j++) {
      const a = i * (SEG + 1) + j;
      const b = a + SEG + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("aShade", new THREE.Float32BufferAttribute(shade, 1));
  g.setIndex(index);
  g.computeVertexNormals();
  return finish(g, 0);
}

/** A thin fin from a 2D outline in the XY plane, centered on z = 0. */
function fin(draw: (s: THREE.Shape) => void, depth = 0.022): Part {
  const shape = new THREE.Shape();
  draw(shape);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.45,
    bevelSize: depth * 0.45,
    bevelSegments: 2,
    curveSegments: 18,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

function dorsal(): Part {
  const g = fin((s) => {
    s.moveTo(0.22, 0);
    s.quadraticCurveTo(0.13, 0.2, -0.05, 0.37);
    s.quadraticCurveTo(-0.02, 0.16, -0.12, 0);
    s.lineTo(0.22, 0);
  });
  g.translate(0.13, halfHeight(0.56) - 0.02, 0);
  return finish(g, 0);
}

function caudal(): Part {
  const g = fin((s) => {
    s.moveTo(-0.94, 0.035);
    s.quadraticCurveTo(-1.08, 0.24, -1.38, 0.46);
    s.quadraticCurveTo(-1.22, 0.16, -1.13, 0.0);
    s.quadraticCurveTo(-1.19, -0.13, -1.3, -0.31);
    s.quadraticCurveTo(-1.08, -0.15, -0.94, -0.035);
    s.lineTo(-0.94, 0.035);
  }, 0.026);
  return finish(g, (y) => (y < -0.05 ? 0.4 : 0));
}

/** Small triangle fin (second dorsal, anal, pelvic). */
function smallFin(len: number, height: number): Part {
  return fin((s) => {
    s.moveTo(len / 2, 0);
    s.quadraticCurveTo(len * 0.1, height * 0.6, -len * 0.45, height);
    s.quadraticCurveTo(-len * 0.3, height * 0.4, -len / 2, 0);
    s.lineTo(len / 2, 0);
  }, 0.014);
}

function pectoral(side: 1 | -1): Part {
  const g = fin((s) => {
    s.moveTo(0.1, 0);
    s.quadraticCurveTo(0.0, -0.17, -0.2, -0.36);
    s.quadraticCurveTo(-0.09, -0.15, -0.12, 0);
    s.lineTo(0.1, 0);
  }, 0.02);
  // Fin lies mostly flat, angled outward and down from the lower flank.
  g.rotateX(side * -1.05);
  g.translate(xOf(0.71), -0.085, side * halfWidth(0.71) * 0.72);
  return finish(g, 0.6);
}

function eyes(): Part[] {
  const t = 0.885;
  return [1, -1].map((side) => {
    const g = new THREE.SphereGeometry(0.019, 14, 10);
    g.translate(xOf(t), centerY(t) + 0.045, side * (halfWidth(t) * 0.86));
    return finish(g, 0, 1);
  });
}

function gills(): Part[] {
  const parts: Part[] = [];
  for (const side of [1, -1]) {
    for (let k = 0; k < 5; k++) {
      const t = 0.66 + k * 0.022;
      const g = new THREE.BoxGeometry(0.007, halfHeight(t) * 0.95, 0.006);
      g.rotateZ(-0.12);
      g.translate(xOf(t), -0.01, side * (halfWidth(t) + 0.002));
      parts.push(finish(g, 0, 1));
    }
  }
  return parts;
}

/** A point on the body's skin at length t and angle a (0 = side, -π/2 = belly), scaled toward the core. */
function onSkin(t: number, a: number, side: 1 | -1, inset = 1) {
  const s = Math.sin(a);
  return new THREE.Vector3(
    xOf(t),
    centerY(t) + halfHeight(t) * s * (s < 0 ? 0.82 : 1) * inset,
    side * halfWidth(t) * Math.cos(a) * inset,
  );
}

function mouth(): Part[] {
  const parts: Part[] = [];
  for (const side of [1, -1] as const) {
    // Jaw line runs from under the snout back to the corner of the mouth, on the skin.
    const curve = new THREE.CatmullRomCurve3([
      onSkin(0.975, -1.25, side, 0.97),
      onSkin(0.95, -0.95, side, 0.97),
      onSkin(0.915, -0.72, side, 0.97),
      onSkin(0.875, -0.55, side, 0.97),
    ]);
    parts.push(finish(new THREE.TubeGeometry(curve, 24, 0.0055, 6, false), 0, 1));
    // Teeth: rooted inside the jaw, tips poking just out below the lip line.
    for (let k = 0; k < 5; k++) {
      const u = 0.1 + k * 0.19;
      const p = curve.getPoint(u);
      const g = new THREE.ConeGeometry(0.0055, 0.016, 5);
      g.rotateX(Math.PI); // point down
      g.translate(p.x, p.y - 0.004, p.z * 0.985);
      parts.push(finish(g, 0, 2));
    }
  }
  return parts;
}

export function buildSharkGeometry(): THREE.BufferGeometry {
  const second = smallFin(0.09, 0.07);
  second.translate(xOf(0.2), halfHeight(0.2) - 0.01, 0);
  const anal = smallFin(0.08, -0.06);
  anal.translate(xOf(0.17), -halfHeight(0.17) * 0.82 + 0.01, 0);
  const pelvics = [1, -1].map((side) => {
    const g = smallFin(0.1, -0.08);
    g.rotateX(side * 0.5);
    g.translate(xOf(0.36), -halfHeight(0.36) * 0.8, side * 0.04);
    return finish(g, 0.6);
  });
  const parts = [
    body(),
    dorsal(),
    caudal(),
    finish(second, 0),
    finish(anal, 0.6),
    ...pelvics,
    pectoral(1),
    pectoral(-1),
    ...eyes(),
    ...gills(),
    ...mouth(),
  ];
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return merged;
}

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSwim;
  attribute float aShade;
  attribute float aTint;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vShade;
  varying float vTint;
  varying float vT;

  void main() {
    vec3 p = position;
    float t = clamp((p.x + 1.0) * 0.5, 0.0, 1.0);
    float tail = (1.0 - t) * (1.0 - t);
    float phase = uTime * 4.2 - t * 5.5;
    // Side-to-side wave, strongest at the tail; the head barely moves.
    p.z += uSwim * (0.2 * tail * sin(phase) + 0.012 * sin(phase));
    // Tilt normals with the bend so lighting follows the motion.
    float slope = uSwim * (0.2 * (-(1.0 - t)) * sin(phase) + 0.2 * tail * cos(phase) * -2.75);
    vec3 n = normalize(vec3(normal.x - slope * normal.z, normal.y, normal.z));

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vView = normalize(-mv.xyz);
    vNormal = normalize(normalMatrix * n);
    vShade = aShade;
    vTint = aTint;
    vT = t;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uRim;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vShade;
  varying float vTint;
  varying float vT;

  void main() {
    vec3 n = normalize(gl_FrontFacing ? vNormal : -vNormal);
    // abs(): thin fins are seen from both sides, so treat either face the same.
    float fres = pow(1.0 - abs(dot(n, vView)), 2.4);
    vec3 light = normalize(vec3(0.35, 1.0, 0.75));
    float diff = max(dot(n, light), 0.0);
    float spec = pow(max(dot(reflect(-light, n), vView), 0.0), 28.0);

    // Countershading: slate-teal back, pale belly.
    vec3 back = vec3(0.16, 0.34, 0.42);
    vec3 belly = vec3(0.78, 0.89, 0.92);
    vec3 base = mix(back, belly, vShade);
    vec3 col = base * (0.42 + 0.8 * diff) + spec * 0.3;

    // Sunlight caustics flickering over the back.
    float caustic = sin(vT * 38.0 + uTime * 1.7) * sin(vT * 23.0 - uTime * 1.1);
    col += uRim * 0.07 * max(n.y, 0.0) * max(caustic, 0.0);

    // Neon teal rim — the site's glow.
    col += uRim * fres * 1.6;

    // Details: eyes / gills / mouth (dark) and teeth (white).
    if (vTint > 1.5) col = vec3(0.95, 0.98, 0.97);
    else if (vTint > 0.5) col = vec3(0.012, 0.025, 0.035) + uRim * fres * 0.25;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export interface SharkScene {
  render: (time: number) => void;
  resize: (w: number, h: number) => void;
  dispose: () => void;
}

export interface SharkSceneOptions {
  /** "hover": turns slowly in place (sonar). "cruise": side-on, steady swim. */
  mode: "hover" | "cruise";
  rim: string;
  /** 0 = still (reduced motion) */
  swim: number;
  /** Body thickness: 1 = sleek; >1 = bulkier great white (deeper and wider). */
  girth?: number;
}

export function createSharkScene(canvas: HTMLCanvasElement, opts: SharkSceneOptions): SharkScene {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 2, 0.1, 20);
  camera.position.set(0, 0.34, 2.75);
  camera.lookAt(0, 0.02, 0);

  const geometry = buildSharkGeometry();
  const girth = opts.girth ?? 1;
  // A heavier build: a bit shorter, much deeper and wider (normals are updated too).
  if (girth !== 1) geometry.scale(1 - (girth - 1) * 0.15, 1 + (girth - 1) * 0.85, 1 + (girth - 1) * 1.1);
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uSwim: { value: opts.swim },
      uRim: { value: new THREE.Color(opts.rim) },
    },
  });
  const shark = new THREE.Mesh(geometry, material);
  const rig = new THREE.Group();
  rig.add(shark);
  shark.position.x = 0.19; // center the snout-to-tail-tip span
  scene.add(rig);

  return {
    render(time) {
      const s = time / 1000;
      material.uniforms.uTime.value = s;
      if (opts.mode === "hover") {
        // Slow turn so the 3D shape reads, plus a gentle glide.
        rig.rotation.y = -0.42 + Math.sin(s * 0.45) * 0.32;
        rig.rotation.z = Math.sin(s * 0.7) * 0.05;
        rig.rotation.x = 0.08 + Math.sin(s * 0.5) * 0.04;
        rig.position.y = Math.sin(s * 1.1) * 0.05;
      } else {
        rig.rotation.y = -0.12 + Math.sin(s * 0.6) * 0.06;
        rig.rotation.z = Math.sin(s * 0.9) * 0.03;
        rig.position.y = Math.sin(s * 1.3) * 0.03;
      }
      renderer.render(scene, camera);
    },
    resize(w, h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
