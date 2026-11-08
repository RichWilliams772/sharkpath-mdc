# SharkPath MDC 🦈

Like a shark that never stops moving forward, students navigate from their first Miami Dade College class to a career. SharkPath maps the route with a branching pathway map, live what-if planning, semester plans, ROI, deadlines and an AI counselor team.

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind 4 · shadcn/ui (Base UI, Nova) · React Flow · Recharts · Motion · lucide-react · Zustand · next-intl · jsPDF + html2canvas · ics · Auth0

## Run it

```bash
npm install
cp .env.example .env.local   # optional: add Auth0 keys to turn on login
npm run dev                  # http://localhost:3000
```

The app works with no env vars at all. It runs in **guest mode**, and every AI or backend feature uses a built-in demo mock.

## Screens (`feat/student-experience`)

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

### AI / Backend: build these routes; the UI switches over automatically

The UI already calls these endpoints. If a route doesn't exist yet (404/501), it falls back to a local demo mock (`src/lib/api/`).

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

**Everything is sample data until our Tiger Data SQL database is connected.**

| origin | Where it comes from | Badge |
| --- | --- | --- |
| `catalog` | `src/data/careers.ts` (5 hand-built core careers) + `src/data/catalog.ts` (30 careers across all 8 Florida meta-majors) | sand "Sample data" |
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
