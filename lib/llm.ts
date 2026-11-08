import Anthropic from "@anthropic-ai/sdk";
import type { LlmPref, LlmProvider } from "./types";

// One JSON-in/JSON-out call with a provider chain: the student's chosen provider first, then every other
// provider we have a key for. Gemini's free tier rate-limits hard, so Claude/OpenAI take over when it fails.
// The user's own key (from the settings panel) wins over the server's env key for that provider.

const ENV_KEYS: Record<LlmProvider, string | undefined> = {
  gemini: process.env.GEMINI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  openai: process.env.OPENAI_API_KEY,
};
const ENV_MODELS: Record<LlmProvider, string> = {
  gemini: process.env.GEMINI_MODEL || "gemini-3.5-flash",
  anthropic: process.env.ANTHROPIC_MODEL || "claude-opus-5",
  openai: process.env.OPENAI_MODEL || "gpt-4.1-mini",
};
const ORDER: LlmProvider[] = ["gemini", "anthropic", "openai"];

const GEMINI_FALLBACK = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite";

type Attempt = { provider: LlmProvider; key: string; model: string };

/** Providers to try, in order, that actually have a key. */
export function providerChain(pref?: Partial<LlmPref>): Attempt[] {
  const first = pref?.provider ?? ((process.env.LLM_PROVIDER as LlmProvider) || "gemini");
  return [first, ...ORDER.filter((p) => p !== first)]
    .map((provider) => ({
      provider,
      key: (provider === pref?.provider && pref.apiKey) || ENV_KEYS[provider] || "",
      model: (provider === pref?.provider && pref.model) || ENV_MODELS[provider],
    }))
    .filter((a) => a.key);
}

export async function llmJson<T>(system: string, user: string, pref?: Partial<LlmPref>, timeoutMs = 20000): Promise<T> {
  const chain = providerChain(pref);
  if (!chain.length) throw new Error("No LLM API key configured");
  // The whole chain shares one deadline so a slow provider can't hang the demo; callers fall back to demo data.
  const deadline = Date.now() + timeoutMs;
  let lastErr: unknown;
  for (const attempt of chain) {
    const left = deadline - Date.now();
    if (left < 1500) break;
    try {
      const text = await callProvider(attempt, system, user, AbortSignal.timeout(left));
      // Tolerate code fences or leading prose around the object.
      return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as T;
    } catch (e) {
      lastErr = e;
      console.warn(`LLM ${attempt.provider} failed — ${(e as Error).message.slice(0, 160)}`);
    }
  }
  throw lastErr ?? new Error("LLM deadline exceeded");
}

async function callProvider({ provider, key, model }: Attempt, system: string, user: string, signal: AbortSignal): Promise<string> {
  if (provider === "gemini") {
    const call = (m: string) =>
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: "POST",
        signal,
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
        }),
      });
    let res = await call(model);
    // Free tier is ~5 requests/min per model and flagship models get overloaded:
    // the lite model has its own quota and answers in about a second.
    if ((res.status === 429 || res.status === 503) && model !== GEMINI_FALLBACK) {
      console.warn(`Gemini ${model} returned ${res.status}; retrying on ${GEMINI_FALLBACK}`);
      res = await call(GEMINI_FALLBACK);
    }
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  }

  if (provider === "anthropic") {
    const client = new Anthropic({ apiKey: key, maxRetries: 1 });
    const res = await client.beta.messages.create(
      {
        model,
        max_tokens: 16000,
        system: `${system}\nRespond with a single JSON object and nothing else.`,
        messages: [{ role: "user", content: user }],
        // Short structured replies: low effort keeps latency down.
        output_config: { effort: "low" },
        // If a request is declined, the API re-runs it on a fallback model in the same call.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      },
      { signal },
    );
    if (res.stop_reason === "refusal") throw new Error("Claude declined the request");
    return res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
