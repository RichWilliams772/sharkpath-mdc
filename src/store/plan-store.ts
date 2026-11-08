"use client";

// Shared app state (Zustand). The what-if sliders, map, charts, chat and
// counselor team all read from here so they stay in sync live.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_HOME_STATE, DEFAULT_SCHOOL_ID } from "@/data/schools";
import { inputsFromAnswers } from "@/lib/finance";
import type { Career, FinanceAnswers, QuizResult, School, StudentProfile, WhatIfInputs } from "@/types/roadmap";

export const DEFAULT_INPUTS: WhatIfInputs = {
  careerId: "software-developer",
  routeId: "software-direct",
  creditsEarned: 0,
  workHoursPerWeek: 15,
  takeSummerClasses: false,
  pellEligible: false,
  brightFutures: false,
  livesAtHome: true,
  hasCertification: false,
  startTerm: "spring-2027",
  schoolId: DEFAULT_SCHOOL_ID,
  homeState: DEFAULT_HOME_STATE,
};

interface PlanState {
  hydrated: boolean;
  /** Student picked "Continue as guest" on the login screen */
  guest: boolean;
  profile: StudentProfile | null;
  inputs: WhatIfInputs;
  quiz: QuizResult | null;
  locale: "en" | "es";
  /** Careers generated on demand (not in the built-in catalog), by id */
  customCareers: Record<string, Career>;
  /** Colleges students typed in ("my college isn't listed"), by id */
  customSchools: Record<string, School>;
  /** Pick the starting college (and optionally the transfer university); a new start resets the transfer default. */
  setSchools: (patch: { schoolId?: string; transferSchoolId?: string; homeState?: string }, add?: School) => void;
  /** Money plan quiz answers (null until taken) */
  finance: FinanceAnswers | null;
  /** UI only: the money plan quiz dialog is open */
  moneyQuizOpen: boolean;
  /** UI only: active tab on My Path */
  planTab: string;
  setPlanTab: (tab: string) => void;

  /** Save money plan answers and apply them to the plan (aid, housing, work hours). */
  setFinance: (answers: FinanceAnswers) => void;
  setMoneyQuizOpen: (open: boolean) => void;
  setGuest: (guest: boolean) => void;
  setProfile: (profile: StudentProfile) => void;
  setInputs: (patch: Partial<WhatIfInputs>) => void;
  /** Switch the plan to any career (generated careers are remembered). */
  setCareer: (career: Career) => void;
  setQuiz: (quiz: QuizResult | null) => void;
  setLocale: (locale: "en" | "es") => void;
  reset: () => void;
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      hydrated: false,
      guest: false,
      profile: null,
      inputs: DEFAULT_INPUTS,
      quiz: null,
      locale: "en",
      customCareers: {},
      finance: null,
      moneyQuizOpen: false,
      customSchools: {},

      setSchools: (patch, add) =>
        set((s) => ({
          customSchools: add ? { ...s.customSchools, [add.id]: add } : s.customSchools,
          inputs: {
            ...s.inputs,
            ...patch,
            // Changing the starting college goes back to its usual transfer university.
            ...(patch.schoolId && patch.schoolId !== s.inputs.schoolId && !patch.transferSchoolId ? { transferSchoolId: undefined } : {}),
          },
        })),
      planTab: "map",
      setPlanTab: (planTab) => set({ planTab }),

      setFinance: (finance) => set((s) => ({ finance, inputs: { ...s.inputs, ...inputsFromAnswers(finance) } })),
      setMoneyQuizOpen: (moneyQuizOpen) => set({ moneyQuizOpen }),
      setGuest: (guest) => set({ guest }),
      setProfile: (profile) => set({ profile, locale: profile.language }),
      setInputs: (patch) => set((s) => ({ inputs: { ...s.inputs, ...patch } })),
      setCareer: (career) =>
        set((s) => ({
          inputs: { ...s.inputs, careerId: career.id, routeId: career.routes[0].id },
          customCareers: career.origin === "ai" ? { ...s.customCareers, [career.id]: career } : s.customCareers,
        })),
      setQuiz: (quiz) => set({ quiz }),
      setLocale: (locale) => set({ locale }),
      reset: () => set({ guest: false, profile: null, inputs: DEFAULT_INPUTS, quiz: null, finance: null }),
    }),
    {
      name: "sharkpath:state",
      version: 1,
      // Hydrate after mount (see Providers) to avoid server/client mismatches.
      skipHydration: true,
      partialize: ({ guest, profile, inputs, quiz, locale, customCareers, finance, customSchools }) => ({
        guest,
        profile,
        inputs,
        quiz,
        locale,
        customCareers,
        finance,
        customSchools,
      }),
      // Plans saved before schools existed: fill in the demo school / home state.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PlanState>;
        return { ...current, ...p, inputs: { ...DEFAULT_INPUTS, ...p.inputs } };
      },
      onRehydrateStorage: () => () => usePlanStore.setState({ hydrated: true }),
    },
  ),
);
