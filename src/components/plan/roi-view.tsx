"use client";

import { useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SourceChip } from "@/components/source-chip";
import { formatCompactMoney, formatMoney } from "@/lib/format";
import { usePlan } from "./use-plan";

const tooltipStyle = {
  contentStyle: { background: "#072a43", border: "1px solid #164a6b", borderRadius: 10, fontSize: 12 },
  labelStyle: { color: "#8db4c8" },
  itemStyle: { color: "#e3f4fb" },
};

export function RoiView() {
  const t = useTranslations("roi");
  const { plan } = usePlan();

  const costData = plan.costs.map((c) => ({ name: c.label, amount: c.amount }));
  const timelineData = plan.timeline.map((s) => ({
    name: s.label,
    offset: Math.round(s.startYear * 10) / 10,
    years: Math.round(s.years * 10) / 10,
    earning: s.earning,
  }));

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-lg font-bold">{t("title")}</h3>
        <p className="mb-4 text-sm text-muted-foreground">{t("subtitle")}</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={plan.roi} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="roiFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2ee6d6" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#2ee6d6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#123a55" strokeDasharray="3 3" />
              <XAxis dataKey="year" stroke="#8db4c8" fontSize={12} tickFormatter={(y) => `Y${y}`} />
              <YAxis stroke="#8db4c8" fontSize={12} tickFormatter={formatCompactMoney} width={64} />
              <Tooltip
                {...tooltipStyle}
                labelFormatter={(y) => t("year", { n: y as number })}
                formatter={(v, name) => [formatMoney(Number(v)), name === "pathway" ? t("pathway") : t("baseline")]}
              />
              <Area type="monotone" dataKey="baseline" stroke="#ff7f66" strokeDasharray="5 4" fill="transparent" strokeWidth={2} />
              <Area type="monotone" dataKey="pathway" stroke="#2ee6d6" fill="url(#roiFill)" strokeWidth={2.5} />
              {plan.breakEvenYear && (
                <ReferenceLine
                  x={plan.breakEvenYear}
                  stroke="#f4d58d"
                  strokeDasharray="4 4"
                  label={{ value: t("breakEven"), fill: "#f4d58d", fontSize: 12, position: "insideTopLeft" }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-primary" />{t("pathway")}</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-coral" />{t("baseline")}</span>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h3 className="mb-3 text-lg font-bold">{t("costs")}</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={130} stroke="#8db4c8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: "#0e3d5c55" }} formatter={(v) => formatMoney(Number(v))} />
                <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                  {costData.map((_, i) => (
                    <Cell key={i} fill={["#2ee6d6", "#5ab8ff", "#a78bfa", "#ff7f66", "#f4d58d"][i % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {plan.costs.map((c) => (
              <Line key={c.label} label={c.label} value={formatMoney(c.amount)} source={c.source} />
            ))}
            <li className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>{t("total")}</span>
              <span>{formatMoney(plan.totalCost)}</span>
            </li>
          </ul>
          <h4 className="mt-5 mb-2 text-sm font-semibold text-kelp">{t("aid")}</h4>
          <ul className="space-y-1.5 text-sm">
            {plan.aid.length === 0 && <li className="text-muted-foreground">{t("noAid")}</li>}
            {plan.aid.map((a) => (
              <Line key={a.label} label={a.label} value={`−${formatMoney(a.amount)}`} source={a.source} />
            ))}
            <li className="flex justify-between border-t border-border pt-2 text-base font-bold text-primary">
              <span>{t("net")}</span>
              <span>{formatMoney(plan.netCost)}</span>
            </li>
          </ul>
        </section>

        <section>
          <h3 className="mb-3 text-lg font-bold">{t("timeline")}</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData} layout="vertical" barSize={18} margin={{ left: 0, right: 16 }}>
                <CartesianGrid stroke="#123a55" horizontal={false} />
                <XAxis type="number" stroke="#8db4c8" fontSize={12} tickFormatter={(v) => `${v}y`} />
                <YAxis type="category" dataKey="name" width={150} stroke="#8db4c8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  {...tooltipStyle}
                  cursor={{ fill: "#0e3d5c55" }}
                  formatter={(v, key) => (key === "offset" ? [null, null] : [`${v} yrs`, ""])}
                />
                <Bar dataKey="offset" stackId="t" fill="transparent" />
                <Bar dataKey="years" stackId="t" radius={6}>
                  {timelineData.map((d, i) => (
                    <Cell key={i} fill={d.earning ? "#5fd38d" : i === 0 ? "#2ee6d6" : "#5ab8ff"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2.5 rounded-sm bg-kelp" /> = {t("earning")}
          </p>

          <h3 className="mt-6 mb-2 text-sm font-semibold">{t("assumptions")}</h3>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {plan.assumptions.map((a) => (
              <li key={a.text} className="flex items-start justify-between gap-2">
                <span>{a.text}</span>
                <SourceChip source={a.source} />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-sand">{t("placeholder")}</p>
        </section>
      </div>
    </div>
  );
}

function Line({ label, value, source }: { label: string; value: string; source: Parameters<typeof SourceChip>[0]["source"] }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 font-medium">
        {value} <SourceChip source={source} />
      </span>
    </li>
  );
}
