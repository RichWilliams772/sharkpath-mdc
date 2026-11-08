# SharkPath

Chart a priced, ranked route from **any college** to **any career**, with two AI guides in your ear.
Built for the SharkByte hackathon on the MDC "Smart Career and Education Pathway Navigator" challenge.

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY (optional; without it the app runs on demo data)
npm run dev
```

## How it works

- **Dive (landing):** ask Sonar & Tide anything, set your college, pick or type a career. Every selection fires a jet-propulsion burst (`jet()` in `components/OceanScene.tsx`).
- **Route Explorer** (`components/Explorer.tsx`): after you pick a career you get a workspace that stays in one place.
  - **Left:** 5 genuinely different routes (transfer, selective transfer, workforce A.S., apprenticeship, military, part-time and so on), ranked by **Match**, plus a **Compare all** table.
  - **Center:** the open route, with tabs for Overview (term-by-term timeline), Cost & aid, Career & pay, Feasibility and Next steps.
  - **Right:** Sonar & Tide stay docked and answer about the route and tab you're looking at.
- **Match vs Fit:** Match (`lib/scoring.ts`) weighs relevancy/cost/difficulty/time, 40/30/20/10 by default and adjustable under "What matters to me". Fit (`lib/feasibility.ts`) checks a route against the student's situation (budget, free hours, work, GPA), from 4 quick questions kept in the browser.
- **Data:** routes and route details come from the LLM (`/api/roadmap`, `/api/route-detail`). Pay is **real BLS wage data** (`lib/bls.ts`: national median, 25th percentile, Miami metro) for the job each route lands in. Job growth is an AI estimate and is labeled as one.
- **Caching** (`lib/db.ts`): memory, then `lib/seed.json` (pregenerated demo careers; refresh with `node scripts/seed.mjs` while the dev server runs), then TigerData when `DATABASE_URL` is set.
- **Gemini limits:** the free tier allows about 5 requests/min per model. When the main model is rate-limited or overloaded, `lib/llm.ts` retries on `gemini-3.5-flash-lite`, which has its own quota.
- **Two voices:** one agent (`/api/guide`) speaks as Sonar (pragmatic) and Tide (reflective). They split when they're torn, and speak aloud with two different browser voices. The orb takes voice input, falling back to Gemini transcription in browsers like Brave.

## Integrations

| Service | Status |
| --- | --- |
| Gemini | Default LLM (`GEMINI_API_KEY`) |
| TigerData | Cache for roadmaps + route details via `DATABASE_URL`; the table is created automatically |
| BLS | Live wage data via the public API (25 requests/day without a key; set `BLS_API_KEY` for 500/day) |
| swarms.ai | Not wired yet |
| GoDaddy | Domain only; point it at the deployment |
