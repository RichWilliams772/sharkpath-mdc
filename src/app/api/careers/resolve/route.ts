// POST /api/careers/resolve — placeholder for the AI/Backend team (Gemini + Tiger Data).
//
// It exists so this path isn't caught by /api/careers/[id] (which would answer
// 405). 501 tells src/lib/api/careers.ts to use its local fallback generator.
// Replace this body with the real implementation.

export function POST() {
  return new Response("Career resolver not implemented yet", { status: 501 });
}
