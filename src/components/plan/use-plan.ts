"use client";

import { useMemo } from "react";
import { calculatePlan } from "@/lib/calculator";
import { getCareer } from "@/lib/careers/registry";
import { buildFinancePlan } from "@/lib/finance";
import { schoolContext, withSchools } from "@/lib/schools";
import { usePlanStore } from "@/store/plan-store";
import type { Career } from "@/types/roadmap";

/** The student's colleges, home state and in-state / out-of-state status. */
export function useSchools() {
  const schoolId = usePlanStore((s) => s.inputs.schoolId);
  const transferSchoolId = usePlanStore((s) => s.inputs.transferSchoolId);
  const homeState = usePlanStore((s) => s.inputs.homeState);
  const custom = usePlanStore((s) => s.customSchools);
  return useMemo(() => schoolContext({ schoolId, transferSchoolId, homeState }, custom), [schoolId, transferSchoolId, homeState, custom]);
}

/** Any career, with its labels pointing at the student's own colleges and state. */
export function useLocalCareer(career: Career) {
  const schools = useSchools();
  return useMemo(() => withSchools(career, schools), [career, schools]);
}

/** The live plan for the current what-if inputs. Recomputes on every slider move. */
export function usePlan() {
  const inputs = usePlanStore((s) => s.inputs);
  const custom = usePlanStore((s) => s.customCareers);
  const schools = useSchools();
  return useMemo(() => {
    const career = withSchools(getCareer(inputs.careerId, custom), schools);
    const plan = calculatePlan({ ...inputs, careerId: career.id }, career, schools);
    return { plan, career, schools };
  }, [inputs, custom, schools]);
}

/** The money plan for the live plan, or null until the money quiz is taken. */
export function useFinancePlan() {
  const { plan, career, schools } = usePlan();
  const answers = usePlanStore((s) => s.finance);
  return useMemo(() => (answers ? buildFinancePlan(answers, plan, career, schools) : null), [answers, plan, career, schools]);
}

export const useHydrated = () => usePlanStore((s) => s.hydrated);
