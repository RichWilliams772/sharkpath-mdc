"use client";

// Careers from Tiger Data via /api/careers and /api/careers/[id].
//
// Careers that load here take priority over the same ids in src/data (see
// src/lib/careers/registry.ts). If a request fails, is slow, or the database
// isn't configured, nothing is stored and the app keeps using src/data, so the
// demo never breaks.

import { useEffect } from "react";
import { create } from "zustand";
import type { Career } from "@/types/roadmap";

export type LoadStatus = "loading" | "done" | "failed";

interface CareerDataState {
  /** Careers that came from the database, by id */
  byId: Record<string, Career>;
  listStatus?: LoadStatus;
  careerStatus: Record<string, LoadStatus>;
}

export const useCareerData = create<CareerDataState>(() => ({ byId: {}, careerStatus: {} }));

const TIMEOUT_MS = 6000; // a slow database shouldn't hold up the demo

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

/** Light shape check, so a bad response can't crash the pages. */
const looksLikeCareer = (c: unknown): c is Career => {
  const x = c as Career | null;
  return !!x && typeof x.id === "string" && !!x.program && Array.isArray(x.stages) && Array.isArray(x.routes);
};

let listRequest: Promise<void> | null = null;
const careerRequests = new Map<string, Promise<void>>();

export function loadCareerList(): Promise<void> {
  listRequest ??= (async () => {
    useCareerData.setState({ listStatus: "loading" });
    try {
      const list = await getJson<unknown[]>("/api/careers");
      const careers = list.filter(looksLikeCareer);
      useCareerData.setState((s) => ({
        listStatus: "done",
        byId: { ...s.byId, ...Object.fromEntries(careers.map((c) => [c.id, c])) },
      }));
    } catch {
      useCareerData.setState({ listStatus: "failed" });
      listRequest = null; // try again next visit
    }
  })();
  return listRequest;
}

export function loadCareer(id: string): Promise<void> {
  if (useCareerData.getState().byId[id]) return Promise.resolve();
  let req = careerRequests.get(id);
  if (!req) {
    req = (async () => {
      useCareerData.setState((s) => ({ careerStatus: { ...s.careerStatus, [id]: "loading" } }));
      try {
        const career = await getJson<unknown>(`/api/careers/${encodeURIComponent(id)}`);
        if (!looksLikeCareer(career)) throw new Error("bad career");
        useCareerData.setState((s) => ({
          byId: { ...s.byId, [id]: career },
          careerStatus: { ...s.careerStatus, [id]: "done" },
        }));
      } catch {
        useCareerData.setState((s) => ({ careerStatus: { ...s.careerStatus, [id]: "failed" } }));
        careerRequests.delete(id);
      }
    })();
    careerRequests.set(id, req);
  }
  return req;
}

/** Loads every database career once. True while the first load is in flight. */
export function useCareerListLoading(): boolean {
  useEffect(() => {
    void loadCareerList();
  }, []);
  const status = useCareerData((s) => s.listStatus);
  return status === undefined || status === "loading";
}

/** Loads one career from the database. True while it's loading and not cached yet. */
export function useCareerLoading(id: string | null): boolean {
  useEffect(() => {
    if (id) void loadCareer(id);
  }, [id]);
  return useCareerData((s) => !!id && !s.byId[id] && s.careerStatus[id] !== "failed" && s.careerStatus[id] !== "done");
}
