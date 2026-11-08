"use client";

import { useTranslations } from "next-intl";

export function SiteFooter() {
  const t = useTranslations("common");
  return (
    <footer className="border-t border-white/5 px-4 py-8 text-center text-xs text-muted-foreground">
      {t("footer")}
    </footer>
  );
}
