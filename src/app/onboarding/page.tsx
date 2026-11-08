import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = { title: "Your profile" };

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <OnboardingFlow />
    </div>
  );
}
