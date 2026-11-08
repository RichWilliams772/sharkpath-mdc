import type { Metadata } from "next";
import { MyPlans } from "@/components/plans/my-plans";

export const metadata: Metadata = { title: "My Plans" };

export default function MyPlansPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <MyPlans />
    </div>
  );
}
