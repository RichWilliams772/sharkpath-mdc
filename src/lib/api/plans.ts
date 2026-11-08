// Saved plans. Real version: Data team's `saved_plans` table in Tiger Data,
// behind ENDPOINTS.plans (Auth0-protected). Until then: this browser only.

import type { SavedPlan } from "@/types/roadmap";
import { callEndpoint, EndpointMissing, ENDPOINTS } from "./endpoints";

const key = (ownerId: string) => `sharkpath:plans:${ownerId}`;

function readLocal(ownerId: string): SavedPlan[] {
  try {
    return JSON.parse(localStorage.getItem(key(ownerId)) ?? "[]") as SavedPlan[];
  } catch {
    return [];
  }
}

function writeLocal(ownerId: string, plans: SavedPlan[]) {
  try {
    localStorage.setItem(key(ownerId), JSON.stringify(plans));
  } catch {}
}

/** "cloud" when saved to the account database, "browser" when only on this device. */
export type PlanStorage = "cloud" | "browser";

export async function listPlans(ownerId: string): Promise<{ plans: SavedPlan[]; storage: PlanStorage }> {
  if (ownerId !== "guest") {
    try {
      const res = await callEndpoint(ENDPOINTS.plans);
      return { plans: (await res.json()) as SavedPlan[], storage: "cloud" };
    } catch (err) {
      if (!(err instanceof EndpointMissing)) throw err;
    }
  }
  return { plans: readLocal(ownerId), storage: "browser" };
}

export async function savePlan(plan: SavedPlan): Promise<PlanStorage> {
  if (plan.ownerId !== "guest") {
    try {
      await callEndpoint(ENDPOINTS.plans, { method: "POST", body: JSON.stringify(plan) });
      return "cloud";
    } catch (err) {
      if (!(err instanceof EndpointMissing)) throw err;
    }
  }
  writeLocal(plan.ownerId, [plan, ...readLocal(plan.ownerId).filter((p) => p.id !== plan.id)]);
  return "browser";
}

export async function deletePlan(ownerId: string, id: string): Promise<void> {
  if (ownerId !== "guest") {
    try {
      await callEndpoint(`${ENDPOINTS.plans}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      return;
    } catch (err) {
      if (!(err instanceof EndpointMissing)) throw err;
    }
  }
  writeLocal(ownerId, readLocal(ownerId).filter((p) => p.id !== id));
}
