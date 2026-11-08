"use client";

import { Languages, LogOut, MapIcon, Menu, NotebookTabs } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { SharkIcon } from "@/components/brand/shark";
import { LinkButton } from "@/components/link-button";
import { useAccount } from "@/components/providers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { usePlanStore } from "@/store/plan-store";

const LINKS = [
  { href: "/plan", key: "plan" },
  { href: "/careers", key: "careers" },
  { href: "/quiz", key: "quiz" },
  { href: "/my-plans", key: "myPlans" },
] as const;

export function SiteHeader() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const scrolled = useScrolled();

  const links = LINKS.map(({ href, key }) => {
    const active = pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
          active
            ? "bg-primary/15 text-primary ring-1 ring-primary/40 [text-shadow:none]"
            : "text-foreground/85 hover:bg-white/10 hover:text-foreground",
        )}
      >
        {t(key)}
      </Link>
    );
  });

  return (
    // No bar: the header floats on the water. A soft dark glow behind the lettering
    // keeps it readable over the bright surface ripples.
    <header className="sticky top-0 z-40 [text-shadow:0_1px_10px_rgba(1,8,18,0.9),0_0_2px_rgba(1,8,18,0.6)]">
      {/* After scrolling: a feathered fade (no edge, no border) so content passing underneath never collides with the links */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 -z-10 h-28 bg-gradient-to-b from-[#010a16]/85 via-[#010a16]/45 to-transparent backdrop-blur-sm transition-opacity duration-500 [mask-image:linear-gradient(to_bottom,black_45%,transparent)]",
          scrolled ? "opacity-100" : "opacity-0",
        )}
      />
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-heading text-lg font-bold">
          <SharkIcon className="h-6 w-12 text-primary drop-shadow-[0_0_10px_rgba(46,230,214,0.55)]" />
          SharkPath
        </Link>

        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex">
          {links}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LanguageToggle />
          <AccountMenu />
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label={t("menu")} />}>
              <Menu />
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetTitle className="px-4 pt-4">SharkPath</SheetTitle>
              <nav className="flex flex-col gap-1 p-4">{links}</nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

/** True once the page has scrolled past the very top. */
function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return scrolled;
}

function LanguageToggle() {
  const t = useTranslations("nav");
  const locale = usePlanStore((s) => s.locale);
  const setLocale = usePlanStore((s) => s.setLocale);
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(locale === "en" ? "es" : "en")}
      aria-label={t("switchLanguage")}
    >
      <Languages />
      <span className="font-semibold">{locale === "en" ? "ES" : "EN"}</span>
    </Button>
  );
}

function AccountMenu() {
  const t = useTranslations("nav");
  const { user, isLoading } = useAccount();
  const guest = usePlanStore((s) => s.guest);

  if (isLoading) return <div className="size-8 animate-pulse rounded-full bg-muted" />;

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        {guest && (
          <Badge variant="outline" className="hidden border-white/25 bg-[#010a16]/40 backdrop-blur-sm sm:inline-flex">
            {t("guest")}
          </Badge>
        )}
        <LinkButton
          href="/login"
          size="sm"
          variant={guest ? "outline" : "default"}
          className={cn(
            "[text-shadow:none]",
            guest && "border-primary/60 bg-[#010a16]/45 text-primary backdrop-blur-sm shadow-[0_0_16px_-4px_rgba(46,230,214,0.6)] hover:bg-primary/15 hover:text-primary",
          )}
        >
          {guest ? t("createAccount") : t("login")}
        </LinkButton>
      </div>
    );
  }

  const initials = (user.name ?? user.email ?? "?").slice(0, 2).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <Avatar>
          {user.picture && <AvatarImage src={user.picture} alt="" />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block text-xs text-muted-foreground">{t("signedInAs")}</span>
            <span className="block truncate">{user.email ?? user.name}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/plan" />}>
          <MapIcon /> {t("plan")}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/my-plans" />}>
          <NotebookTabs /> {t("myPlans")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<a href="/auth/logout" />}>
          <LogOut /> {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
