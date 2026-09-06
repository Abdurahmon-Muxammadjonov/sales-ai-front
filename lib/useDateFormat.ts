"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

/** Every company on the platform sells from Uzbekistan; one clock avoids a
 *  server-and-browser disagreement about which day a call happened on. */
export const TIME_ZONE = "Asia/Tashkent";

/**
 * Numeric parts in a locale every engine agrees on. `en-US` is only ever used
 * to *extract* the numbers — the visible words come from the message files.
 */
const NUMERIC_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

interface DateParts {
  day: string;
  monthIndex: number;
  year: string;
  time: string;
}

function splitDate(iso: string): DateParts | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts: Record<string, string> = {};
  for (const part of NUMERIC_PARTS.formatToParts(date)) parts[part.type] = part.value;
  const month = Number(parts.month);
  if (!Number.isFinite(month)) return null;
  return {
    day: String(Number(parts.day)),
    monthIndex: month - 1,
    year: parts.year ?? "",
    time: `${parts.hour}:${parts.minute}`,
  };
}

export interface DateFormatter {
  date: (iso: string | null | undefined) => string;
  dateTime: (iso: string | null | undefined) => string;
  monthDay: (value: Date | number | string) => string;
}

/**
 * Dates assembled from message-file month names rather than `Intl`.
 *
 * `Intl` cannot be trusted here: Chrome ships no Uzbek date patterns and falls
 * back to the ICU root format ("2026 M09 4"), while Node has them — so the same
 * timestamp rendered on the server and in the browser disagreed, and what the
 * browser showed was not Uzbek at all. Composing the string ourselves fixes
 * both the hydration mismatch and the output.
 */
export function useDateFormat(): DateFormatter {
  const t = useTranslations("dates");

  return useMemo(() => {
    const months = t.raw("monthsShort") as string[];
    const monthAt = (index: number) => months[index] ?? "";

    const render = (iso: string | null | undefined, key: "date" | "dateTime") => {
      if (!iso) return "—";
      const parts = splitDate(iso);
      if (!parts) return "—";
      return t(key, {
        day: parts.day,
        month: monthAt(parts.monthIndex),
        year: parts.year,
        time: parts.time,
      });
    };

    return {
      date: (iso) => render(iso, "date"),
      dateTime: (iso) => render(iso, "dateTime"),
      monthDay: (value) => {
        const iso =
          value instanceof Date
            ? value.toISOString()
            : typeof value === "number"
              ? new Date(value).toISOString()
              : value;
        const parts = splitDate(iso);
        if (!parts) return "—";
        return t("monthDay", { day: parts.day, month: monthAt(parts.monthIndex) });
      },
    };
  }, [t]);
}
