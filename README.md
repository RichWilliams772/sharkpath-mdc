<div align="center">

# 🦈 SharkPath MDC

**Map your path from your first Miami Dade College class to a career.**

### [▶ Open SharkPath: sharkpath-mdc.vercel.app](https://sharkpath-mdc.vercel.app)

Pathway map · what-if planning · semester plans · cost & ROI · deadlines<br>
Finn, the AI counselor · a 5-agent Counselor Team · English & Español

</div>

---

## Run it on your computer

**You need:** [Node.js](https://nodejs.org) 20 or newer, and Git.

```bash
git clone https://github.com/RichWilliams772/sharkpath-mdc.git
cd sharkpath-mdc
git checkout user-interface-demo-1   # the app lives on this branch (main only has a README)
npm install
cp .env.example .env.local           # then fill in the keys below
npm run dev                          # open http://localhost:3000
```

**No keys? It still runs.** With an empty `.env.local`, SharkPath opens in guest mode and uses built-in answers. Each key turns on a real feature:

| Key in `.env.local` | Turns on | Where to get it |
| --- | --- | --- |
| `DATABASE_URL` | Careers, verified figures and saved plans from our Tiger Data database | Tiger Cloud console → SharkPath service → connection string |
| `GEMINI_API_KEY` | Finn, the chat counselor | Google AI Studio → API keys |
| `SWARMS_API_KEY` | The Counselor Team tab | swarms.world → API keys |
| `AUTH0_DOMAIN` · `AUTH0_CLIENT_ID` · `AUTH0_CLIENT_SECRET` | Accounts, and saving plans to your account | Auth0 → Applications → **SharkPath** |
| `AUTH0_SECRET` | (signs the login cookie) | Make your own: `openssl rand -hex 32` |
| `APP_BASE_URL` | (where login sends you back) | `http://localhost:3000` on your computer |

Ask the team for the shared values, and never commit `.env.local`.

**Deploy to the live site:** run `npx vercel deploy --prod` from this folder. You need access to the SharkPath team on Vercel; the keys are already set there.

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind 4 · shadcn/ui (Base UI, Nova) · React Flow · Recharts · Motion · lucide-react · Zustand · next-intl · jsPDF + html2canvas · ics · Auth0 · Tiger Data (Postgres) · Vercel AI SDK + Gemini · Swarms

## Screens

| Route | What it does |
| --- | --- |
| `/` | Landing page: ocean hero with a sonar of the 5 careers |
| `/login` | Auth0 log in / sign up, or **Continue as guest** |
| `/onboarding` | Name & goal → career (or "take the quiz") → credits & work hours |
| `/plan` | **My Path** dashboard: what-if controls, branching map, semesters, cost & ROI, deadlines, AI counselor team, Save, Export PDF |
| `/careers` | Every career: search any career, filter by meta-major. Every number has a source chip |
| `/quiz` | "I don't know what I want": 8 questions, ranked matches + AI suggestions |
| `/my-plans` | Saved plans (account or this device) |
| Ask Finn (every page) | Gemini chat counselor widget |

English/Spanish toggle in the header (next-intl). Text lives in `src/i18n/en.ts` and `src/i18n/es.ts`.

## How teammates plug in

Everything shared is in **`src/types/roadmap.ts`**. Change it together.

### AI / Backend routes

The UI calls these endpoints. If a route is missing (404/501), busy (503) or rate-limited (429), the UI falls back to built-in answers in `src/lib/api/`, so the site never breaks.

**Live:** `/api/chat` (Gemini, with a lighter fallback model), `/api/counselor-team` (Swarms; finished reports are saved in Tiger Data per career, route and language), `/api/plans`, `/api/careers`, `/api/careers/[id]`. **Still to build:** `/api/careers/resolve` and `/api/quiz`.

| Endpoint | Request → Response | Used by |
| --- | --- | --- |
| `POST /api/careers/resolve` | `{ query, locale }` → `Career` (full shape: program, stages, routes, sourced numbers). Ground it in Tiger Data + pgvector | Career search, Finn, quiz suggestions: **any career** |
| `POST /api/chat` | `{ messages: ChatMessage[], context }` → **text stream** (AI SDK `result.toTextStreamResponse()`) | Finn chat widget |
| `POST /api/counselor-team` | `{ inputs: WhatIfInputs, summary }` → `{ agents: AgentReport[] }` (Swarms: career, education, finance, licensing, coordinator) | Counselor team tab |
| `POST /api/quiz` | `{ traits }` → `{ aiSuggestions: { title, why }[] }` | Quiz results |
| `GET/POST/DELETE /api/plans` | `SavedPlan[]` / `SavedPlan` / `?id=`. Check the Auth0 session with `auth0.getSession()` from `src/lib/auth0.ts` | Save plan, My Plans |

**Calculator:** `calculatePlan(inputs: WhatIfInputs, career: Career): PlanResult` in `src/lib/calculator.ts` is a placeholder. Replace its body and keep the signature. The sliders call it on every change, so keep it fast and synchronous, or precompute.

Validate AI output with Zod against the types in `src/types/roadmap.ts` before returning it.

### Data (Tiger Data)

SharkPath works with **any career**. Each `Career` is self-contained (MDC program + stages + routes) and has an `origin`:

**All 35 careers live in our Tiger Data database** and are served by `GET /api/careers` and `GET /api/careers/[id]`. The careers and plan pages load from those routes and fall back to `src/data/` if the API is down, so the demo never breaks.

Load the database (safe to re-run; `schema.sql` drops and recreates):

```bash
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/seed.sql           # 5 core careers, sources, schools, deadlines
psql "$DATABASE_URL" -f db/seed-catalog.sql   # the 30 catalog careers
psql "$DATABASE_URL" -f db/migrations/2026-11-08-verify-core-careers.sql   # verified figures (core careers, MDC tuition)
psql "$DATABASE_URL" -f db/migrations/2026-11-08-b-career-growth-and-mdc-bachelors.sql
psql "$DATABASE_URL" -f db/seed-core-added.sql  # Mechanical Engineer + IT Consultant
psql "$DATABASE_URL" -f db/migrations/2026-11-08-c-ai-rate-limits-and-team-cache.sql
```

`db/seed-catalog.sql` and `db/seed-core-added.sql` are generated from `src/data`. After changing the catalog or the added core careers, run `npx tsx --tsconfig tsconfig.json db/export-catalog.ts`.

Sources still have `verified: false` until someone checks them. Their chips say "Not yet verified" and turn green once flipped.

| origin | Where it comes from | Badge |
| --- | --- | --- |
| `catalog` | Tiger Data (seeded from `src/data/careers.ts`, 5 hand-built core careers, and `src/data/catalog.ts`, 30 careers across all 8 Florida meta-majors) | sand "Database" |
| `ai` | Generated on demand for anything a student types (`/api/careers/resolve`, or the local fallback in `src/lib/careers/generate.ts`) | violet "AI estimate" |
| `verified` | Reserved: set it once a career's rows come from Tiger Data | green "Verified" |

Placeholder data lives in **`src/data/`**:

- `sources.ts`: every citation. Each is `verified: false` until it's checked. Flip it to `true` and the chip turns green ("Verified").
- `careers.ts`: the 5 core careers with specific stages and routes.
- `catalog.ts`: add a career with one `CareerSpec` line (meta-major, track, license, pay).
- `meta-majors.ts`: Florida's 8 meta-majors with their course pools, used to build any program.
- `programs.ts`: MDC course lists for the 5 core careers.
- `deadlines.ts`: calendar dates (sample).

Rule: **every number shown to a student has a `Source`.** Replace these files with the verified rows from Tiger Data (seed export or `/api` fetch), keeping the same shapes.

### Auth / DevOps

1. Create an Auth0 **Regular Web Application**.
   - Callback URL: `http://localhost:3000/auth/callback` (plus the Vercel URL)
   - Logout URL: `http://localhost:3000`
2. Put `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET` (`openssl rand -hex 32`) and `APP_BASE_URL` in `.env.local` and in Vercel → Environment Variables.
3. Login turns on automatically (`src/lib/auth0.ts`, `src/proxy.ts`). Guests keep working.

### Content

- Spanish UI text: `src/i18n/es.ts`.
- Quiz questions: `src/data/quiz.ts`, with Spanish in `esData` in `es.ts`.

## Project layout

```
src/
  types/roadmap.ts      shared team contract
  data/                 placeholder data (→ Tiger Data)
  lib/
    api/                endpoint adapters + demo mocks (→ AI/Backend)
    calculator.ts       what-if math placeholder (→ Backend)
    auth0.ts            Auth0 client (on when env vars exist)
  store/                Zustand: plan-store (what-if, profile, locale), chat-store
  i18n/                 en / es messages
  components/
    plan/               dashboard, what-if panel, React Flow map, semesters, ROI, deadlines, counselor team, PDF
    chat/               Finn chat widget
    ui/                 shadcn/ui components
  proxy.ts              Auth0 middleware (Next 16 "proxy")
```

Theme: "Deep Ocean" tokens in `src/app/globals.css` (`primary` aqua, `coral`, `sand`, `kelp`). Colors are hex because the PDF exporter can't read oklch.
