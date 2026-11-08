"use client";

import { Loader2, Search, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, type KeyboardEvent } from "react";
import { CareerIcon } from "@/components/career-icon";
import { Input } from "@/components/ui/input";
import { useLocalized } from "@/i18n/use-localized";
import { resolveCareer } from "@/lib/api/careers";
import { searchCareers, useAllCareers } from "@/lib/careers/registry";
import { cn } from "@/lib/utils";
import type { Career } from "@/types/roadmap";

export function OriginBadge({ career, className }: { career: Career; className?: string }) {
  const t = useTranslations("origin");
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase",
        career.origin === "verified" && "bg-kelp/15 text-kelp",
        career.origin === "catalog" && "bg-sand/15 text-sand",
        career.origin === "ai" && "bg-chart-5/15 text-chart-5",
        className,
      )}
    >
      {t(career.origin)}
    </span>
  );
}

/** Search the catalog — or type ANY career and we chart a path to it. */
export function CareerPicker({ onSelect, className, autoFocus }: { onSelect: (career: Career) => void; className?: string; autoFocus?: boolean }) {
  const t = useTranslations("picker");
  const { careerTitle, locale } = useLocalized();
  const all = useAllCareers();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const listId = useId();

  const results = searchCareers(query, all, 6);
  const q = query.trim();
  const showBuild = q.length >= 3 && !results.some((c) => c.title.toLowerCase() === q.toLowerCase());
  const count = results.length + (showBuild ? 1 : 0);

  async function choose(index: number) {
    if (index < results.length) {
      onSelect(results[index]);
    } else if (showBuild) {
      setBusy(true);
      try {
        onSelect(await resolveCareer(q, locale));
      } finally {
        setBusy(false);
      }
    } else return;
    setQuery("");
    setActive(0);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(count - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && count > 0) {
      e.preventDefault();
      void choose(active);
    } else if (e.key === "Escape") setQuery("");
  }

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        placeholder={t("placeholder")}
        aria-label={t("placeholder")}
        role="combobox"
        aria-expanded={count > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        className="h-10 pl-9"
      />
      {busy && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-primary" />}
      {q && count > 0 && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
          {results.map((c, i) => (
            <li
              key={c.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
              onMouseEnter={() => setActive(i)}
              className={cn("flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm", i === active && "bg-primary/10")}
            >
              <CareerIcon id={c.id} className="size-4 shrink-0 text-primary" />
              <span className="flex-1 truncate">{careerTitle(c.id)}</span>
              <OriginBadge career={c} />
            </li>
          ))}
          {showBuild && (
            <li
              role="option"
              aria-selected={active === results.length}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(results.length)}
              onMouseEnter={() => setActive(results.length)}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 border-t border-border px-3 py-2.5 text-sm text-chart-5",
                active === results.length && "bg-chart-5/10",
              )}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {busy ? t("building") : t("build", { q })}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
