"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";

/**
 * Two-segment UZ / RU control. Navigating through next-intl's router keeps the
 * locale prefix in the URL and refreshes the NEXT_LOCALE cookie, so the choice
 * survives the next visit.
 */
export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const t = useTranslations("locale");
  const active = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div
      className={`inline-flex items-center rounded-control border border-line p-0.5 ${className}`}
      role="group"
      aria-label={t("label")}
    >
      {locales.map((locale) => {
        const selected = locale === active;
        return (
          <button
            key={locale}
            type="button"
            aria-pressed={selected}
            aria-label={t(locale === "uz" ? "uzFull" : "ruFull")}
            disabled={pending}
            onClick={() => {
              if (selected) return;
              startTransition(() => {
                router.replace(pathname, { locale });
              });
            }}
            className={`h-8 rounded-[6px] px-2.5 text-sm transition-colors disabled:opacity-60 ${
              selected
                ? "bg-raised text-ink font-medium"
                : "text-ink-3 hover:text-ink"
            }`}
          >
            {t(locale)}
          </button>
        );
      })}
    </div>
  );
}

export default LocaleSwitcher;
