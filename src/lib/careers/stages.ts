import type { Career, PathwayRoute, PathwayStage } from "@/types/roadmap";

export const START_STAGE: PathwayStage = { id: "start", kind: "start", title: "You are here", subtitle: "Starting at MDC" };

export const careerNodeId = (career: Career) => `career-${career.id}`;

/** Look up any stage id used in one of this career's routes. */
export function stageIn(career: Career, id: string): PathwayStage {
  if (id === "start") return START_STAGE;
  if (id === careerNodeId(career)) return { id, kind: "career", title: career.title, subtitle: "Career" };
  return career.stages.find((s) => s.id === id) ?? { id, kind: "mdc", title: id };
}

/**
 * A route's stages in the order a student lives them: school and pre-job steps,
 * then the first job, then career-growth steps (`afterFirstJob`, e.g. FE → PE).
 * Route data keeps the career node last; this is only for display.
 */
export function displayOrder(career: Career, route: PathwayRoute): string[] {
  const careerId = careerNodeId(career);
  const growth = route.stageIds.filter((id) => id !== careerId && stageIn(career, id).afterFirstJob);
  if (growth.length === 0) return route.stageIds;
  const before = route.stageIds.filter((id) => id !== careerId && !growth.includes(id));
  return [...before, careerId, ...growth];
}

export function routeOf(career: Career, routeId: string): PathwayRoute {
  return career.routes.find((r) => r.id === routeId) ?? career.routes[0];
}
