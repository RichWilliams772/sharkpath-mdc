// Gemini chat counselor + Swarms counselor team.
// Real versions: AI/Backend branch implements ENDPOINTS.chat and ENDPOINTS.counselorTeam.

import { BUILTIN, getCareer, relatedCareers } from "@/lib/careers/registry";
import { routeOf } from "@/lib/careers/stages";
import type { AgentReport, AgentRole, Career, ChatMessage, PlanResult, WhatIfInputs } from "@/types/roadmap";
import { formatMoney } from "@/lib/format";
import { resolveCareer } from "./careers";
import { callEndpoint, EndpointMissing, ENDPOINTS, wait } from "./endpoints";

export interface ChatContext {
  inputs: WhatIfInputs;
  locale: "en" | "es";
  studentName?: string;
}

/** Sourced facts for a career (sample data for now) — the AI must answer from these. */
/** Replies start mid-sentence when there's no student name ("as a …") — fix the first letter. */
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function factsFor(c: Career): NonNullable<ChatMessage["facts"]> {
  return [
    { label: `${c.title} median pay`, value: formatMoney(c.medianPay.value), source: c.medianPay.source },
    { label: "Job growth", value: `${c.jobGrowth.value}%`, source: c.jobGrowth.source },
    { label: "Typical entry education", value: c.typicalEntryEducation.value, source: c.typicalEntryEducation.source },
  ];
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** A known career named anywhere in the text (longest name wins). */
function findKnownCareer(text: string): Career | null {
  const q = ` ${norm(text).replace(/[^a-z0-9\s-]/g, " ")} `;
  let best: { c: Career; len: number } | null = null;
  for (const c of BUILTIN) {
    for (const name of [c.title, ...(c.aliases ?? [])]) {
      const n = norm(name);
      if (n.length >= 3 && q.includes(` ${n} `) && (!best || n.length > best.len)) best = { c, len: n.length };
    }
  }
  return best?.c ?? null;
}

/** "What about becoming a marine biologist?" → "marine biologist" */
const ASKED_CAREER =
  /(?:becom(?:e|ing)|be an?|work(?:ing)? as an?|career (?:in|as)|study|ser|trabajar como|estudiar)\s+(?:an?\s+|un\s+|una\s+)?([\p{L}][\p{L}\s-]{2,40}?)\s*(?:[?.!,]|$)/iu;

async function mockAnswer(question: string, ctx: ChatContext): Promise<Omit<ChatMessage, "id" | "role">> {
  const es = ctx.locale === "es";
  const name = ctx.studentName ? `${ctx.studentName}, ` : "";
  const known = findKnownCareer(question);
  const asked = !known ? question.match(ASKED_CAREER)?.[1]?.trim() : undefined;

  if (asked) {
    const c = await resolveCareer(asked, ctx.locale);
    const route = c.routes[0];
    return {
      extended: c.origin === "ai",
      suggestedCareer: c,
      facts: factsFor(c),
      content: es
        ? `${name}"${c.title}" aún no está en nuestra base de datos, así que esto es una estimación de IA — confírmala con un consejero de MDC. Te tracé una ruta: ${route.label}. Empieza en MDC con ${c.program.name}. Toca "Planear esta ruta" para ver semestres, costo y retorno.`
        : `${name}"${c.title}" isn't in our career database yet, so this is an AI estimate — confirm it with an MDC advisor. I charted a path: ${route.label}. You'd start at MDC in the ${c.program.name}. Tap "Plan this path" to see semesters, cost and ROI.`,
    };
  }

  const c = known ?? getCareer(ctx.inputs.careerId);
  const route = known ? c.routes[0] : routeOf(c, ctx.inputs.routeId);
  return {
    facts: factsFor(c),
    extended: c.origin === "ai",
    suggestedCareer: known && known.id !== ctx.inputs.careerId ? known : undefined,
    content: capitalize(
      es
        ? `${name}como ${c.title}, la paga mediana es ${formatMoney(c.medianPay.value)} al año y se espera un crecimiento de ${c.jobGrowth.value}%. Tu ruta: ${route.label}. Con ${ctx.inputs.workHoursPerWeek} horas de trabajo por semana, te recomiendo mantener una carga que no te queme y aprovechar ${ctx.inputs.pellEligible ? "tu beca Pell" : "las becas de la MDC Foundation"}. Mira los números con su fuente abajo.`
        : `${name}as a ${c.title}, median pay is ${formatMoney(c.medianPay.value)}/yr with ${c.jobGrowth.value}% projected growth. Your route: ${route.label}. Working ${ctx.inputs.workHoursPerWeek} hrs/week, I'd keep a course load you can sustain and lean on ${ctx.inputs.pellEligible ? "your Pell Grant" : "MDC Foundation scholarships"}. The numbers and their sources are below.`,
    ),
  };
}

/** Streams an answer token-by-token. Falls back to a mock when /api/chat isn't live. */
export async function streamChat(
  messages: ChatMessage[],
  ctx: ChatContext,
  onText: (text: string) => void,
): Promise<Omit<ChatMessage, "id" | "role">> {
  const last = messages.at(-1)?.content ?? "";
  try {
    const res = await callEndpoint(ENDPOINTS.chat, {
      method: "POST",
      body: JSON.stringify({ messages, context: ctx }),
    });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      onText(text);
    }
    const known = findKnownCareer(last);
    const asked = !known ? last.match(ASKED_CAREER)?.[1]?.trim() : undefined;
    const suggested = known ?? (asked ? await resolveCareer(asked, ctx.locale) : undefined);
    return {
      content: text,
      facts: suggested ? factsFor(suggested) : undefined,
      extended: !suggested || suggested.origin === "ai",
      suggestedCareer: suggested && suggested.id !== ctx.inputs.careerId ? suggested : undefined,
    };
  } catch (err) {
    if (!(err instanceof EndpointMissing)) throw err;
    const answer = await mockAnswer(last, ctx);
    let text = "";
    for (const word of answer.content.split(" ")) {
      text += (text ? " " : "") + word;
      onText(text);
      await wait(18);
    }
    return answer;
  }
}

// ── Swarms counselor team ─────────────────────────────────────────────────

export const AGENT_ORDER: AgentRole[] = ["career", "education", "finance", "licensing", "coordinator"];

function mockReports(plan: PlanResult, c: Career): Record<AgentRole, Omit<AgentReport, "role" | "status">> {
  const route = routeOf(c, plan.inputs.routeId);
  const alt = relatedCareers(c, BUILTIN, 1)[0];
  return {
    career: {
      headline: `${c.title}: ${c.jobGrowth.value}% growth, ${formatMoney(c.medianPay.value)} median`,
      points: [c.summary, alt ? `Similar fit worth exploring: ${alt.title}` : "Strong match for your interests"],
    },
    education: {
      headline: `${plan.semesters.length} semesters at ${plan.creditsPerTerm} credits/term`,
      points: [route.label, plan.inputs.takeSummerClasses ? "Summer terms are shortening your timeline" : "Adding summer classes could save a semester"],
    },
    finance: {
      headline: `Net cost ${formatMoney(plan.netCost)} after aid`,
      points: [
        plan.breakEvenYear ? `Pays off vs. no degree by year ${plan.breakEvenYear}` : "Doesn't pass the no-degree baseline within 25 years at these settings",
        plan.inputs.pellEligible ? "Pell Grant is applied" : "Check Pell eligibility on the FAFSA — it could cover most tuition",
      ],
    },
    licensing: {
      headline: c.license ? c.license.name : "No license required to start",
      points: [c.license ? `Issued by ${c.license.body}` : "A strong portfolio matters most", "Start the paperwork early — see Deadlines"],
    },
    coordinator: {
      headline: `Plan: ${plan.yearsToCareer} years to your first ${c.title} job`,
      points: [
        "Next step: meet an MDC advisor to confirm your first-semester classes",
        "Then: file the FAFSA and set calendar reminders for your deadlines",
      ],
    },
  };
}

/** Runs the 5-agent team, reporting each agent's progress. */
export async function runCounselorTeam(
  plan: PlanResult,
  career: Career,
  onUpdate: (report: AgentReport) => void,
): Promise<void> {
  AGENT_ORDER.forEach((role) => onUpdate({ role, status: "thinking", headline: "", points: [] }));
  try {
    const res = await callEndpoint(ENDPOINTS.counselorTeam, {
      method: "POST",
      // The full career is sent so the agents can reason about AI-generated careers too.
      body: JSON.stringify({ inputs: plan.inputs, career, summary: { yearsToCareer: plan.yearsToCareer, netCost: plan.netCost } }),
    });
    const data = (await res.json()) as { agents: AgentReport[] };
    data.agents.forEach(onUpdate);
  } catch (err) {
    if (!(err instanceof EndpointMissing)) {
      AGENT_ORDER.forEach((role) => onUpdate({ role, status: "error", headline: "Something went wrong", points: [] }));
      return;
    }
    const reports = mockReports(plan, career);
    for (const role of AGENT_ORDER) {
      await wait(role === "coordinator" ? 900 : 550);
      onUpdate({ role, status: "done", ...reports[role] });
    }
  }
}
