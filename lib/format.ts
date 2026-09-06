import type { Locale } from "@/i18n/routing";

/**
 * Uzbekistan groups thousands with a space and marks decimals with a comma —
 * the same conventions Russian uses. `uz` is deliberately not passed to `Intl`:
 * Chrome carries no Uzbek number data and silently falls back to English
 * ("1,234.5"), which is both wrong for the market and different from what Node
 * produces on the server. Naming a locale every engine ships keeps the two
 * agreeing and the output correct.
 */
const NUMBER_LOCALE: Record<Locale, string> = {
  uz: "ru-RU",
  ru: "ru-RU",
};

export function intlLocale(locale: string): string {
  return NUMBER_LOCALE[locale as Locale] ?? "ru-RU";
}

/** Seconds to m:ss, or h:mm:ss past the hour. Used on the player and ribbon. */
export function mmss(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** "26:01" or "1:04:12" -> seconds. The backend hands us these in `vaqt`. */
export function parseTimecode(value: string | null | undefined): number | null {
  if (!value) return null;
  const parts = value.trim().split(":").map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

/** Compact duration for list rows: "26 daq" style is too chatty, so m:ss. */
export function formatDuration(seconds: number | null | undefined): string {
  return mmss(seconds);
}

export function formatNumber(
  value: number | null | undefined,
  locale: string,
  fractionDigits = 0,
) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Scores are 0..10 and read better as 5.4 than 5.40 or 5. */
export function formatScore(value: number | null | undefined, locale: string) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatBytes(bytes: number, locale: string) {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${formatNumber(mb, locale, 1)} MB`;
  return `${formatNumber(bytes / 1024, locale, 0)} KB`;
}

/** Filesystem-safe slug for downloaded transcripts. */
export function slugify(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[ʻʼ'']/g, "")
      .replace(/[^a-zA-Z0-9Ѐ-ӿ]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 60) || "call"
  );
}
