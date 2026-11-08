import type { Metadata } from "next";
import { CareersView } from "@/components/careers/careers-view";

export const metadata: Metadata = { title: "Careers" };

export default function CareersPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <CareersView />
    </div>
  );
}
