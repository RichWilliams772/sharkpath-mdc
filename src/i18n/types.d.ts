import type { en } from "./en";

declare module "next-intl" {
  interface AppConfig {
    Locale: "en" | "es";
    Messages: typeof en;
  }
}
