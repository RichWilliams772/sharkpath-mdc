import type { Career, PathwayRoute, PathwayStage } from "@/types/roadmap";

export const START_STAGE: PathwayStage = { id: "start", kind: "start", title: "You are here", subtitle: "Starting at MDC" };

export const careerNodeId = (career: Career) => `career-${career.id}`;

/** Look up any stage id used in one of this career's routes. */
export function stageIn(career: Career, id: string): PathwayStage {
  if (id === "start") return START_STAGE;
  if (id === careerNodeId(career)) return { id, kind: "career", title: career.title, subtitle: "Career" };
  return career.stages.find((s) => s.id === id) ?? { id, kind: "mdc", title: id };
}

export function routeOf(career: Career, routeId: string): PathwayRoute {
  return career.routes.find((r) => r.id === routeId) ?? career.routes[0];
}
