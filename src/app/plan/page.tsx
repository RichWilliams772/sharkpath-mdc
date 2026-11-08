import type { Metadata } from "next";
import { PlanDashboard } from "@/components/plan/plan-dashboard";

export const metadata: Metadata = { title: "My Path" };

export default function PlanPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <PlanDashboard />
    </div>
  );
}
