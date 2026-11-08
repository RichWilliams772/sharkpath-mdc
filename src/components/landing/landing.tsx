"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Anchor,
  CalendarDays,
  Compass,
  FileDown,
  LineChart,
  Network,
  RefreshCw,
  Route,
  SlidersHorizontal,
  Users,
  Waves,
  Fish,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SharkIcon } from "@/components/brand/shark";
import { Shark3D } from "@/components/brand/shark3d/shark-3d";
import { CareerIcon } from "@/components/career-icon";
import { LinkButton } from "@/components/link-button";
import { useAccount } from "@/components/providers";
import { Figure } from "@/components/source-chip";
import { Button } from "@/components/ui/button";
import { getCareer } from "@/lib/careers/registry";
import { useLocalized } from "@/i18n/use-localized";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePlanStore } from "@/store/plan-store";

export function Landing() {
  const t = useTranslations("landing");
  const reduce = useReducedMotion();
  const { user } = useAccount();
  const guest = usePlanStore((s) => s.guest);
  const profile = usePlanStore((s) => s.profile);

  const startHref = user || guest ? (profile ? "/plan" : "/onboarding") : "/login";

  const stages = [
    { depth: "0 m", icon: Waves, title: t("stages.shallows"), body: t("stages.shallowsBody") },
    { depth: "40 m", icon: Fish, title: t("stages.reef"), body: t("stages.reefBody") },
    { depth: "200 m", icon: Compass, title: t("stages.currents"), body: t("stages.currentsBody") },
    { depth: "∞", icon: Anchor, title: t("stages.openOcean"), body: t("stages.openOceanBody") },
  ];
  const features = [
    { icon: Network, label: t("features.map") },
    { icon: SlidersHorizontal, label: t("features.whatIf") },
    { icon: Users, label: t("features.ai") },
    { icon: LineChart, label: t("features.roi") },
    { icon: CalendarDays, label: t("features.deadlines") },
    { icon: FileDown, label: t("features.pdf") },
  ];

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-16 pb-28 sm:pt-24 sm:pb-40 lg:grid-cols-[1.35fr_1fr]">
          <div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary"
          >
            <SharkIcon simple className="h-3 w-6" /> {t("badge")}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mt-6 max-w-4xl text-5xl leading-[1.02] font-extrabold text-balance sm:text-7xl"
          >
            {t("title1")}{" "}
            <span className="bg-gradient-to-r from-primary via-chart-2 to-primary bg-clip-text text-transparent">{t("title2")}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="mt-6 max-w-2xl text-lg text-muted-foreground"
          >
            {t("subtitle")}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="mt-9 flex flex-wrap gap-3"
          >
            <LinkButton href={startHref} size="lg" className="glow h-12 px-6 text-base">
              {t("start")}
            </LinkButton>
            <LinkButton href="/quiz" size="lg" variant="outline" className="h-12 border-coral/50 px-6 text-base text-coral hover:bg-coral/10 hover:text-coral">
              {t("quiz")}
            </LinkButton>
          </motion.div>
          </div>
          <Sonar reduce={!!reduce} />
        </div>

        {/* The shark, cruising through its current */}
        <svg aria-hidden className="pointer-events-none absolute inset-x-0 bottom-10 h-24 w-full" viewBox="0 0 1200 100" preserveAspectRatio="none">
          <path d="M0 60 C 200 20, 400 90, 600 50 S 1000 20, 1200 55" fill="none" stroke="var(--primary)" strokeOpacity="0.25" strokeWidth="2" strokeDasharray="6 10" />
        </svg>
        {/* CSS animations (not JS loops) so they resume cleanly when Next.js
            hides and re-shows this page on navigation. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute bottom-14 left-0 text-primary drop-shadow-[0_0_18px_rgba(46,230,214,0.6)]",
            reduce ? "translate-x-[60vw]" : "animate-swim",
          )}
        >
          <Shark3D mode="cruise" girth={1.4} className="h-20 w-40" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">{t("depths")}</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {stages.map((s, i) => (
            <motion.li
              key={s.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.08 }}
              className="glass relative rounded-2xl p-6"
              style={{ background: `rgba(${6 - i},${36 - i * 7},${58 - i * 10},0.75)` }}
            >
              <span className="font-mono text-xs text-muted-foreground">{s.depth}</span>
              <s.icon className="mt-4 size-6 text-primary" />
              <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </motion.li>
          ))}
        </ol>

        <ul className="mt-12 flex flex-wrap justify-center gap-2 lg:flex-nowrap lg:gap-1.5">
          {features.map((f) => (
            <li key={f.label} className="flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-card/60 px-4 py-2 text-sm whitespace-nowrap lg:px-2.5">
              <f.icon className="size-4 text-primary" /> {f.label}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

// Sets of careers the sonar cycles through — each spread across meta-majors.
const SONAR_SETS = [
  ["registered-nurse", "software-developer", "lawyer", "electrician", "architect", "high-school-teacher"],
  ["physician", "chef", "police-officer", "graphic-designer", "accountant", "data-scientist"],
  ["dental-hygienist", "civil-engineer", "firefighter", "interior-designer", "financial-analyst", "psychologist"],
  ["paramedic", "cybersecurity-analyst", "social-worker", "commercial-pilot", "web-developer", "pharmacist"],
];

/**
 * Interactive sonar: tap a blip to lock on and preview the career, then
 * chart its path. "Scan again" brings up a new set of careers.
 */
function Sonar({ reduce }: { reduce: boolean }) {
  const t = useTranslations("landing.sonar");
  const tTracks = useTranslations("tracks");
  const tCareers = useTranslations("careers");
  const { careerTitle } = useLocalized();
  const router = useRouter();
  const setCareer = usePlanStore((s) => s.setCareer);
  const [set, setSet] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const ids = SONAR_SETS[set];
  const blips = ids.map((id, i) => {
    const angle = (i / ids.length) * Math.PI * 2 - Math.PI / 2;
    const r = 34 + (i % 2) * 9;
    return { id, x: 50 + Math.cos(angle) * r, y: 50 + Math.sin(angle) * r };
  });
  const target = blips.find((b) => b.id === selected);
  const career = selected ? getCareer(selected) : null;

  function scanAgain() {
    setSet((s) => (s + 1) % SONAR_SETS.length);
    setSelected(null);
  }

  function chart() {
    if (!career) return;
    setCareer(career);
    router.push("/plan");
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="relative aspect-square w-full" role="group" aria-label={t("label")}>
        {[100, 74, 48].map((size) => (
          <span aria-hidden key={size} className="absolute rounded-full border border-primary/20" style={{ inset: `${(100 - size) / 2}%` }} />
        ))}
        <span aria-hidden className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(46,230,214,0.10),transparent_65%)]" />
        {!reduce && (
          <span
            aria-hidden
            className="absolute inset-0 animate-sweep rounded-full will-change-transform"
            style={{ background: "conic-gradient(from 0deg, rgba(46,230,214,0.28), transparent 22%)" }}
          />
        )}

        {/* Lock-on line from the shark to the selected career */}
        <svg aria-hidden viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full">
          {target && (
            <motion.line
              key={target.id}
              x1={50}
              y1={50}
              x2={target.x}
              y2={target.y}
              stroke="var(--coral)"
              strokeWidth={0.6}
              strokeDasharray="2 1.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4 }}
            />
          )}
        </svg>

        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary drop-shadow-[0_0_24px_rgba(46,230,214,0.7)]"
        >
          <Shark3D mode="hover" className="h-24 w-48 sm:h-32 sm:w-64" />
        </div>

        <AnimatePresence mode="popLayout">
          {blips.map((b, i) => {
            const active = b.id === selected;
            return (
              <motion.button
                key={`${set}-${b.id}`}
                type="button"
                onClick={() => setSelected(active ? null : b.id)}
                aria-pressed={active}
                aria-label={careerTitle(b.id)}
                className={cn(
                  "absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border px-2.5 py-2 text-xs font-semibold whitespace-nowrap backdrop-blur transition-colors sm:px-3 sm:py-1.5",
                  active
                    ? "z-10 border-coral bg-coral/20 text-foreground shadow-[0_0_24px_rgba(255,127,102,0.45)]"
                    : "border-primary/30 bg-card/80 hover:border-primary hover:bg-primary/15",
                )}
                style={{ left: `${b.x}%`, top: `${b.y}%` }}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: active ? 1.08 : 1 }}
                exit={{ opacity: 0, scale: 0.4 }}
                transition={{ delay: selected ? 0 : 0.1 + i * 0.08 }}
              >
                <CareerIcon id={b.id} className={cn("size-4 sm:size-3.5", active ? "text-coral" : "text-primary")} />
                <span className="hidden sm:inline">{careerTitle(b.id)}</span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Preview of the locked-on career */}
      <div className="mt-4 flex min-h-12 flex-wrap items-center justify-center gap-x-3 gap-y-2" aria-live="polite">
        {career ? (
          <motion.div
            key={career.id}
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
              <CareerIcon id={career.id} className="size-4 text-coral" />
              <span className="font-heading font-bold">{careerTitle(career.id)}</span>
              <span className="text-xs text-muted-foreground">· {tTracks(career.track)} ·</span>
              <Figure source={career.medianPay.source} className="text-sm font-semibold">
                {formatMoney(career.medianPay.value)}
              </Figure>
            </span>
            <span className="flex items-center gap-1">
              <Button size="sm" onClick={chart}>
                <Route /> {tCareers("plan")}
              </Button>
              <Button size="sm" variant="ghost" onClick={scanAgain}>
                <RefreshCw /> {t("scan")}
              </Button>
            </span>
          </motion.div>
        ) : (
          <>
            <span className="text-sm whitespace-nowrap text-muted-foreground">{t("hint")}</span>
            <Button size="sm" variant="outline" onClick={scanAgain}>
              <RefreshCw /> {t("scan")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
