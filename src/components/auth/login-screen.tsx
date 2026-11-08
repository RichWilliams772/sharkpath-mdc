"use client";

import { motion } from "motion/react";
import { Cloud, LogIn, Smartphone, UserPlus, UserRound, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Shark3D } from "@/components/brand/shark3d/shark-3d";
import { AnchorButton } from "@/components/link-button";
import { useAccount } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { usePlanStore } from "@/store/plan-store";

export function LoginScreen() {
  const t = useTranslations("login");
  const router = useRouter();
  const { authEnabled, user } = useAccount();
  const profile = usePlanStore((s) => s.profile);
  const setGuest = usePlanStore((s) => s.setGuest);
  const locale = usePlanStore((s) => s.locale);
  const next = profile ? "/plan" : "/onboarding";

  useEffect(() => {
    if (user) router.replace(next);
  }, [user, next, router]);

  function continueAsGuest() {
    setGuest(true);
    router.push(next);
  }

  // ui_locales: Auth0 shows its sign-in / sign-up page in the student's language (en or es).
  const loginHref = `/auth/login?returnTo=${encodeURIComponent(next)}&ui_locales=${locale}`;
  const disabled = !authEnabled ? "pointer-events-none opacity-50" : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass mx-auto w-full max-w-md rounded-3xl p-8 shadow-2xl"
    >
      <Shark3D className="h-16 w-32" />
      <h1 className="mt-5 text-3xl font-extrabold">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-7 flex flex-col gap-2.5">
        <AnchorButton href={loginHref} size="lg" className={`h-11 ${disabled}`} aria-disabled={!authEnabled}>
          <LogIn /> {t("login")}
        </AnchorButton>
        <AnchorButton
          href={`${loginHref}&screen_hint=signup`}
          size="lg"
          variant="outline"
          className={`h-11 ${disabled}`}
          aria-disabled={!authEnabled}
        >
          <UserPlus /> {t("signup")}
        </AnchorButton>
      </div>
      {!authEnabled && <p className="mt-3 rounded-lg bg-sand/10 p-3 text-xs text-sand">{t("notConfigured")}</p>}

      <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
        <li className="flex items-center gap-2"><Cloud className="size-4 text-primary" /> {t("perks.save")}</li>
        <li className="flex items-center gap-2"><Smartphone className="size-4 text-primary" /> {t("perks.sync")}</li>
        <li className="flex items-center gap-2"><Users className="size-4 text-primary" /> {t("perks.counselor")}</li>
      </ul>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground uppercase">
        <span className="h-px flex-1 bg-border" />
        {t("or")}
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button variant="secondary" size="lg" className="h-11 w-full" onClick={continueAsGuest}>
        <UserRound /> {t("guest")}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">{t("guestNote")}</p>
    </motion.div>
  );
}
