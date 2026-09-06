import { defineRouting } from "next-intl/routing";

export const locales = ["uz", "ru"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "uz",
  // Always prefix so the URL is the source of truth; the cookie only decides
  // where a visitor without a prefix lands.
  localePrefix: "always",
  localeCookie: {
    name: "NEXT_LOCALE",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  },
});
