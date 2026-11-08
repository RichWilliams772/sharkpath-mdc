"use client";

import { useUser } from "@auth0/nextjs-auth0";
import { NextIntlClientProvider } from "next-intl";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { en } from "@/i18n/en";
import { es } from "@/i18n/es";
import { usePlanStore } from "@/store/plan-store";

export interface Account {
  /** Auth0 is configured for this deployment */
  authEnabled: boolean;
  isLoading: boolean;
  user: { sub: string; name?: string; email?: string; picture?: string } | null;
}

const AccountContext = createContext<Account>({ authEnabled: false, isLoading: false, user: null });

/** Current Auth0 user (or null for guests). */
export const useAccount = () => useContext(AccountContext);

/** Owner id for saved plans: Auth0 `sub`, or "guest". */
export function useOwnerId() {
  const { user } = useAccount();
  return user?.sub ?? "guest";
}

function Auth0Account({ children }: { children: ReactNode }) {
  const { user, isLoading } = useUser();
  return (
    <AccountContext.Provider
      value={{
        authEnabled: true,
        isLoading,
        user: user?.sub ? { sub: user.sub, name: user.name, email: user.email, picture: user.picture } : null,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function Providers({ authEnabled, children }: { authEnabled: boolean; children: ReactNode }) {
  const locale = usePlanStore((s) => s.locale);

  useEffect(() => {
    usePlanStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const content = (
    <NextIntlClientProvider locale={locale} messages={locale === "es" ? es : en} timeZone="America/New_York">
      <TooltipProvider>{children}</TooltipProvider>
    </NextIntlClientProvider>
  );

  return authEnabled ? (
    <Auth0Account>{content}</Auth0Account>
  ) : (
    <AccountContext.Provider value={{ authEnabled: false, isLoading: false, user: null }}>{content}</AccountContext.Provider>
  );
}
