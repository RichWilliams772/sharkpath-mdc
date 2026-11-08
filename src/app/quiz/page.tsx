import type { Metadata } from "next";
import { QuizFlow } from "@/components/quiz/quiz-flow";

export const metadata: Metadata = { title: "Find my career" };

export default function QuizPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <QuizFlow />
    </div>
  );
}
