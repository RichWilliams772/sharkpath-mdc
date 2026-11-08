import { NextResponse } from "next/server";
import { speak } from "@/lib/speech";
import type { GuideLine, LlmPref } from "@/lib/types";

export async function POST(req: Request) {
  const { lines, llm } = (await req.json()) as { lines: GuideLine[]; llm?: Partial<LlmPref> };
  if (!lines?.length) return NextResponse.json({ error: "no lines" }, { status: 400 });
  try {
    return NextResponse.json(await speak(lines, llm));
  } catch (e) {
    console.warn("speak failed —", (e as Error).message);
    return NextResponse.json({ error: "Voice is unavailable right now." }, { status: 503 });
  }
}
