"use client";

import { Check, LogIn, Save, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AnchorButton } from "@/components/link-button";
import { useAccount } from "@/components/providers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocalized } from "@/i18n/use-localized";
import { savePlan, type PlanStorage } from "@/lib/api/plans";
import { usePlan } from "./use-plan";

export function SavePlanButton() {
  const t = useTranslations("plan");
  const { plan, career } = usePlan();
  const { careerTitle } = useLocalized();
  const { user, authEnabled } = useAccount();
  const [state, setState] = useState<"idle" | "saving" | PlanStorage>("idle");
  const [promptOpen, setPromptOpen] = useState(false);

  async function save() {
    // Saving needs an account — prompt guests to create one.
    if (!user) {
      setPromptOpen(true);
      return;
    }
    const ownerId = user.sub;
    setState("saving");
    const where = await savePlan({
      id: crypto.randomUUID(),
      name: t("planName", { career: careerTitle(plan.inputs.careerId) }),
      ownerId,
      createdAt: new Date().toISOString(),
      inputs: plan.inputs,
      career: career.origin === "ai" ? career : undefined,
      summary: { yearsToCareer: plan.yearsToCareer, netCost: plan.netCost, breakEvenYear: plan.breakEvenYear },
    });
    setState(where);
    setTimeout(() => setState("idle"), 2500);
  }

  // Auth0 sends them back to /plan after signing up; without Auth0 configured, use our login screen.
  const loginHref = authEnabled ? `/auth/login?returnTo=${encodeURIComponent("/plan")}` : "/login";
  const signupHref = authEnabled ? `${loginHref}&screen_hint=signup` : loginHref;

  return (
    <>
    <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("saveGate.title")}</DialogTitle>
          <DialogDescription>{t("saveGate.body")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <AnchorButton href={loginHref} variant="outline">
            <LogIn /> {t("saveGate.login")}
          </AnchorButton>
          <AnchorButton href={signupHref}>
            <UserPlus /> {t("saveGate.signup")}
          </AnchorButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Button variant="outline" onClick={save} disabled={state === "saving"}>
      {state === "browser" || state === "cloud" ? <Check className="text-kelp" /> : <Save />}
      {state === "saving"
        ? t("saving")
        : state === "browser"
          ? t("savedBrowser")
          : state === "cloud"
            ? t("savedCloud")
            : t("save")}
    </Button>
    </>
  );
}
