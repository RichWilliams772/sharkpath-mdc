// POST /api/chat — Finn, the Gemini counselor. Contract: src/lib/api/counselor.ts (streamChat)
//   body { messages: ChatMessage[], context: { inputs, locale, studentName? } } → plain text stream
//
// Finn answers from the student's current career as stored in Tiger Data (falls back to
// src/data), so the numbers it quotes are the same sourced figures the plan page shows.
// 501 when GEMINI_API_KEY isn't set, so the UI keeps its local mock.

import { createGoogle, type GoogleLanguageModelOptions } from "@ai-sdk/google";
import { streamText } from "ai";
import { CORE } from "@/data/careers";
import { CATALOG } from "@/data/catalog";
import { loadCareers } from "@/lib/careers/from-db";
import { dbEnabled } from "@/lib/db";
import type { Career, ChatMessage, Sourced, WhatIfInputs } from "@/types/roadmap";

/**
 * Tried in order. Each gets one attempt and a time limit to start answering;
 * if every model is busy, the route answers 503 and the UI uses its built-in replies.
 */
const MODELS = [
  { id: "gemini-3.8-flash", firstTokenMs: 15_000 },
  { id: "gemini-3.5-flash-lite", firstTokenMs: 10_000 }, // lighter, for when the main model is overloaded
] as const;
const MAX_MESSAGES = 20;
const MAX_CHARS = 2000;

interface ChatBody {
  messages: ChatMessage[];
  context: { inputs: WhatIfInputs; locale: "en" | "es"; studentName?: string };
}

function parseBody(body: unknown): ChatBody | null {
  const b = body as Partial<ChatBody> | null;
  if (!b || !Array.isArray(b.messages) || !b.context?.inputs) return null;
  const messages = b.messages
    .slice(-MAX_MESSAGES)
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim());
  if (messages.length === 0 || messages.at(-1)!.role !== "user") return null;
  return { messages, context: { ...b.context, locale: b.context.locale === "es" ? "es" : "en" } };
}

async function careerFor(id: string): Promise<Career | undefined> {
  if (dbEnabled) {
    try {
      const [fromDb] = await loadCareers([id]);
      if (fromDb) return fromDb;
    } catch (err) {
      console.error("chat: loading career from Tiger Data failed, using src/data", err);
    }
  }
  return [...CORE, ...CATALOG].find((c) => c.id === id);
}

const status = (f: Sourced<number | string>) => `${f.source.label}, ${f.source.verified ? "verified" : "estimate / not yet verified"}`;
const fig = (label: string, f: Sourced<number | string>) => `- ${label}: ${f.value}${f.unit ? ` ${f.unit}` : ""} (source: ${status(f)})`;

function instructionsFor(ctx: ChatBody["context"], career: Career | undefined): string {
  const { inputs } = ctx;
  const route = career?.routes.find((r) => r.id === inputs.routeId) ?? career?.routes[0];
  const facts = career
    ? [
        `Career: ${career.title}. ${career.summary}`,
        fig("Median pay", career.medianPay),
        fig("Job growth", career.jobGrowth),
        fig("Early-career pay", career.entryPay),
        fig("Typical entry education", career.typicalEntryEducation),
        `- Starting program: ${career.program.name} (${career.program.totalCredits.value} credits)`,
        ...(route ? [`- Student's chosen route: ${route.label}`] : []),
        ...career.stages.map((s) =>
          [
            `- Step "${s.title}"`,
            s.years && `${s.years.value} yrs (${status(s.years)})`,
            s.fee && `fee $${s.fee.value} (${status(s.fee)})`,
            s.afterFirstJob && "taken after the first job",
          ]
            .filter(Boolean)
            .join(", "),
        ),
        ...(career.license ? [`- License / certification: ${career.license.name} (${career.license.body})`] : []),
        ...(career.notes ?? []).map((n) => `- Note: ${n.text} (source: ${n.source.label})`),
      ].join("\n")
    : `The student is exploring a career that isn't in SharkPath's database (id "${inputs.careerId}"). You have no sourced figures for it.`;

  return [
    "You are Finn, SharkPath's friendly AI counselor for Miami Dade College (MDC) students planning a path to a career.",
    `Reply in ${ctx.locale === "es" ? "Spanish" : "English"}, in plain text (no markdown headings or tables), in under 150 words.`,
    ctx.studentName ? `The student's name is ${ctx.studentName}.` : "",
    "",
    "Rules:",
    "- Only state numbers (pay, growth, costs, years, fees) that appear in the facts below. Never invent figures.",
    "- If something isn't in the facts, say you don't have a sourced number and suggest checking with an MDC advisor.",
    "- Say when a figure is an estimate or not yet verified.",
    "- Be encouraging and practical. Suggest one concrete next step.",
    "- You are not a replacement for an MDC academic or financial aid advisor; say so for decisions about money, admissions or licensing.",
    "",
    "Student's plan:",
    `- Credits already earned: ${inputs.creditsEarned}; works ${inputs.workHoursPerWeek} hrs/week; summer classes: ${inputs.takeSummerClasses ? "yes" : "no"}`,
    `- Pell eligible: ${inputs.pellEligible ? "yes" : "no"}; Bright Futures: ${inputs.brightFutures ? "yes" : "no"}; lives at home: ${inputs.livesAtHome ? "yes" : "no"}`,
    "",
    "Facts from SharkPath's database:",
    facts,
  ]
    .filter((l) => l !== "")
    .join("\n");
}

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) return new Response("Chat not configured", { status: 501 });
  const body = parseBody(await request.json().catch(() => null));
  if (!body) return new Response("Invalid chat request", { status: 400 });

  const career = await careerFor(body.context.inputs.careerId);
  const google = createGoogle({ apiKey: process.env.GEMINI_API_KEY });

  const instructions = instructionsFor(body.context, career);
  const messages = body.messages.map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

  // Gemini can stall or answer "high demand" under load. Try each model in turn; the first
  // one that starts answering within its time limit wins.
  async function start(model: (typeof MODELS)[number]) {
    const abort = new AbortController();
    const onClientAbort = () => abort.abort();
    request.signal.addEventListener("abort", onClientAbort);
    const timer = setTimeout(() => abort.abort(), model.firstTokenMs);
    const result = streamText({
      model: google(model.id),
      instructions,
      messages,
      // Counselor replies quote known facts, so keep reasoning light: faster, and thinking
      // tokens don't eat the output budget (which cut replies off mid-sentence).
      providerOptions: { google: { thinkingConfig: { thinkingLevel: "low" } } satisfies GoogleLanguageModelOptions },
      maxOutputTokens: 1024,
      maxRetries: 0, // a busy model goes straight to the next one
      abortSignal: abort.signal,
      onError: ({ error }) => console.error(`POST /api/chat ${model.id} failed:`, error instanceof Error ? error.message : error),
    });
    const chunks = result.textStream[Symbol.asyncIterator]();
    const first = await chunks.next().catch(() => null);
    clearTimeout(timer);
    if (!first || first.done || !first.value) {
      abort.abort();
      request.signal.removeEventListener("abort", onClientAbort);
      return null;
    }
    return { first: first.value, chunks, abort };
  }

  let started: Awaited<ReturnType<typeof start>> = null;
  for (const model of MODELS) {
    if (request.signal.aborted) break;
    started = await start(model);
    if (started) break;
  }
  if (!started) return new Response("Finn is unavailable right now", { status: 503 });
  const { first, chunks, abort } = started;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(first));
      try {
        for (let next = await chunks.next(); !next.done; next = await chunks.next()) controller.enqueue(encoder.encode(next.value));
      } catch (err) {
        console.error("POST /api/chat stream ended early", err);
      }
      controller.close();
    },
    cancel() {
      abort.abort();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
