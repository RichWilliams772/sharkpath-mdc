"use client";

import { BadgeCheck, CircleDashed, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Source } from "@/types/roadmap";

/** The little pill shown next to every number. Tap to see the citation. */
export function SourceChip({ source, className }: { source: Source; className?: string }) {
  const t = useTranslations("common");
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 align-middle text-[10px] font-semibold leading-none tracking-wide uppercase transition-colors",
          source.verified
            ? "border-kelp/40 bg-kelp/10 text-kelp hover:bg-kelp/20"
            : "border-sand/40 bg-sand/10 text-sand hover:bg-sand/20",
          className,
        )}
        aria-label={`${t("source")}: ${source.title}`}
      >
        {source.verified ? <BadgeCheck className="size-3" /> : <CircleDashed className="size-3" />}
        {source.label}
      </PopoverTrigger>
      <PopoverContent className="w-72 text-sm">
        <p className="font-semibold">{source.title}</p>
        {source.asOf && <p className="mt-1 text-xs text-muted-foreground">{t("asOf", { period: source.asOf })}</p>}
        <p className={cn("mt-2 text-xs font-medium", source.verified ? "text-kelp" : "text-sand")}>
          {source.verified ? t("verified") : `${t("unverified")} · ${t("pendingTiger")}`}
        </p>
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
        >
          {source.url.replace(/^https?:\/\//, "")}
          <ExternalLink className="size-3" />
        </a>
      </PopoverContent>
    </Popover>
  );
}

/** A number + its source chip, kept together. */
export function Figure({ children, source, className }: { children: ReactNode; source: Source; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap", className)}>
      <span>{children}</span>
      <SourceChip source={source} />
    </span>
  );
}
