// Pregenerate roadmaps + route details for the demo careers into lib/seed.json.
// Usage: start the dev server, then `node scripts/seed.mjs [baseUrl]`.
import { readFileSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const COLLEGE = "Miami Dade College";
const CAREERS = ["Architect", "Mechanical Engineer", "Chef", "Cybersecurity Specialist", "IT Consultant"];
const FILE = new URL("../lib/seed.json", import.meta.url);
const key = (kind, ...parts) => `${kind}|${parts.map((p) => p.trim().toLowerCase()).join("|")}`;

const post = async (path, body) => {
  const res = await fetch(BASE + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return res.json();
};

const seed = JSON.parse(readFileSync(FILE, "utf8"));
const save = () => writeFileSync(FILE, JSON.stringify(seed, null, 1) + "\n");

// One request at a time with a gap: Gemini's free tier allows ~5 requests/minute.
const pause = () => new Promise((r) => setTimeout(r, 13000));
for (const career of CAREERS) {
  const rk = key("roadmap", career, COLLEGE);
  let roadmap = seed[rk];
  if (!roadmap) {
    roadmap = await post("/api/roadmap", { career, college: COLLEGE });
    await pause();
    if (roadmap.source === "demo") { console.log(`✕ ${career}: LLM unavailable, skipped`); continue; }
    seed[rk] = { ...roadmap, source: "seed" };
    save();
  }
  console.log(`✓ ${career}: ${roadmap.options.length} routes`);
  for (const route of roadmap.options) {
    const dk = key("detail", career, COLLEGE, route.id);
    if (seed[dk]) continue;
    const detail = await post("/api/route-detail", { career, college: COLLEGE, route });
    await pause();
    if (detail.source === "demo") { console.log(`  ✕ ${route.title}`); continue; }
    seed[dk] = { ...detail, source: "seed" };
    save();
    console.log(`  ✓ ${route.title}`);
  }
}
console.log("done:", Object.keys(seed).length, "entries");
