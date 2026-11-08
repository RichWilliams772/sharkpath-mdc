"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { BadgeCheck, Briefcase, FileCheck2, GraduationCap, Hammer, Library, School } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo, useMemo } from "react";
import { SharkIcon } from "@/components/brand/shark";
import { CareerIcon } from "@/components/career-icon";
import { useLocalized } from "@/i18n/use-localized";
import { getCareer, relatedCareers, useAllCareers } from "@/lib/careers/registry";
import { careerNodeId, displayOrder, routeOf, stageIn } from "@/lib/careers/stages";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePlanStore } from "@/store/plan-store";
import type { Career, PathwayStage } from "@/types/roadmap";

type StageData = {
  stage: PathwayStage;
  title: string;
  growthLabel?: string;
  state: "route" | "alt" | "idle";
  careerId?: string;
};
type StageNode = Node<StageData, "stage">;

const KIND_ICON = {
  mdc: GraduationCap,
  transfer: School,
  graduate: Library,
  training: Hammer,
  certification: BadgeCheck,
  exam: FileCheck2,
  career: Briefcase,
} as const;

const COL_W = 236;
const ROW_H = 84;

const StageNodeView = memo(function StageNodeView({ data }: NodeProps<StageNode>) {
  const { stage, state, title, careerId, growthLabel } = data;
  const Icon = stage.kind === "start" ? null : KIND_ICON[stage.kind];
  return (
    <div
      className={cn(
        "w-[204px] rounded-xl border px-3 py-2.5 text-left transition-all duration-300",
        state === "route" && "glow border-primary/70 bg-[#06303f]",
        state === "alt" && "border-coral/50 bg-card/90",
        state === "idle" && "border-border/50 bg-card/60 opacity-60",
        stage.kind === "career" && "cursor-pointer hover:opacity-100",
      )}
    >
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-transparent" />
      <div className="flex items-center gap-2">
        {stage.kind === "start" ? (
          <SharkIcon simple className="h-4 w-8 text-primary" />
        ) : careerId ? (
          <CareerIcon id={careerId} className={cn("size-4 shrink-0", state === "route" ? "text-primary" : "text-muted-foreground")} />
        ) : (
          Icon && <Icon className={cn("size-4 shrink-0", state === "route" ? "text-primary" : "text-muted-foreground")} />
        )}
        <span className="truncate text-[15px] font-semibold text-foreground">{title}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[12.5px] text-muted-foreground">
        <span className="truncate">{stage.subtitle}</span>
        {stage.years && stage.kind !== "career" && <span className="shrink-0">{stage.years.value} yr</span>}
      </div>
      {stage.fee && <div className="mt-0.5 text-[12.5px] text-sand">{formatMoney(stage.fee.value)} fee</div>}
      {stage.afterFirstJob && growthLabel && <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-kelp">{growthLabel}</div>}
      <Handle type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-transparent" />
    </div>
  );
});

const nodeTypes = { stage: StageNodeView };

/**
 * Branching map: "You" → your career's routes (glowing / coral) plus a few
 * related careers (dimmed) so students can see the other currents nearby.
 * Works for any career — layout comes from each route's order.
 */
export function PathwayMap() {
  const t = useTranslations("map");
  const { careerTitle } = useLocalized();
  const inputs = usePlanStore((s) => s.inputs);
  const custom = usePlanStore((s) => s.customCareers);
  const setCareer = usePlanStore((s) => s.setCareer);
  const setInputs = usePlanStore((s) => s.setInputs);
  const all = useAllCareers();

  const { nodes, edges } = useMemo(() => {
    const career = getCareer(inputs.careerId, custom);
    const route = routeOf(career, inputs.routeId);
    const shown: Career[] = [career, ...relatedCareers(career, all, 3)];
    const onRoute = new Set(route.stageIds);
    const onAlt = new Set(career.routes.flatMap((r) => r.stageIds));

    // Column = position in the route; career nodes line up in the last column,
    // unless career-growth steps (FE → PE) follow the first job.
    const lastCol = Math.max(...shown.flatMap((c) => c.routes.map((r) => displayOrder(c, r).length - 1)));
    const placed = new Map<string, { stage: PathwayStage; col: number; owner: Career }>();
    for (const c of shown) {
      for (const r of c.routes) {
        const ids = displayOrder(c, r);
        const hasGrowth = ids[ids.length - 1] !== careerNodeId(c);
        ids.forEach((id, i) => {
          const col = id === careerNodeId(c) && !hasGrowth ? lastCol : i;
          const prev = placed.get(id);
          if (!prev) placed.set(id, { stage: stageIn(c, id), col, owner: c });
          else prev.col = Math.max(prev.col, col);
        });
      }
    }

    const byCol = new Map<number, string[]>();
    for (const [id, p] of placed) byCol.set(p.col, [...(byCol.get(p.col) ?? []), id]);

    const nodes: StageNode[] = [...placed.entries()].map(([id, { stage, col, owner }]) => {
      const column = byCol.get(col)!;
      const i = column.indexOf(id);
      const careerId = stage.kind === "career" ? owner.id : undefined;
      return {
        id,
        type: "stage",
        position: { x: col * COL_W, y: (i - (column.length - 1) / 2) * ROW_H },
        data: {
          stage,
          careerId,
          title: stage.kind === "start" ? t("you") : careerId ? careerTitle(careerId) : stage.title,
          growthLabel: t("afterFirstJob"),
          state: onRoute.has(id) ? "route" : onAlt.has(id) ? "alt" : "idle",
        },
      };
    });

    const activeIds = displayOrder(career, route);
    const routePairs = new Set(activeIds.slice(1).map((id, i) => `${activeIds[i]}->${id}`));
    const seen = new Map<string, Edge>();
    for (const c of shown) {
      for (const r of c.routes) {
        const ids = displayOrder(c, r);
        ids.slice(1).forEach((target, i) => {
          const source = ids[i];
          const id = `${source}->${target}`;
          if (seen.has(id)) return;
          const active = routePairs.has(id);
          const alt = c.id === career.id;
          seen.set(id, {
            id,
            source,
            target,
            animated: active,
            zIndex: active ? 10 : 0,
            style: {
              stroke: active ? "var(--primary)" : alt ? "var(--coral)" : "#1d5a80",
              strokeWidth: active ? 3 : 1.5,
              opacity: active || alt ? 1 : 0.5,
              strokeDasharray: alt && !active ? "6 5" : undefined,
            },
          });
        });
      }
    }
    const edges = [...seen.values()].sort((a, b) => Number(a.animated) - Number(b.animated));
    return { nodes, edges };
  }, [inputs.careerId, inputs.routeId, custom, all, careerTitle, t]);

  function onNodeClick(_: unknown, node: StageNode) {
    if (node.data.careerId) return setCareer(getCareer(node.data.careerId, custom));
    const career = getCareer(inputs.careerId, custom);
    const current = routeOf(career, inputs.routeId);
    const alt = career.routes.find((r) => r.id !== current.id && r.stageIds.includes(node.id));
    if (alt && !current.stageIds.includes(node.id)) setInputs({ routeId: alt.id });
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">{t("hint")}</p>
      <div className="h-[480px] overflow-hidden rounded-xl border border-border/60 bg-[#031a2c]">
        <ReactFlow
          key={inputs.careerId}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          colorMode="dark"
          fitView
          fitViewOptions={{ padding: 0.08 }}
          minZoom={0.3}
          maxZoom={1.25}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnScroll={false}
          preventScrolling={false}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#12405e" />
          <Controls showInteractive={false} position="bottom-right" />
        </ReactFlow>
      </div>
    </div>
  );
}
