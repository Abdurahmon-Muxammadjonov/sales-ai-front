"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { IconMoon, IconSun } from "./icons";

/**
 * Sun/moon toggle. Renders a same-size inert placeholder until mounted, because
 * the resolved theme is only knowable in the browser and swapping the icon
 * during hydration would warn.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const t = useTranslations("theme");
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  const base =
    "flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-[7px] text-[13px] text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink";

  if (!mounted) {
    return <span className={`${base} ${className}`} aria-hidden="true" style={{ height: 33 }} />;
  }

  return (
    <button
      type="button"
      className={`${base} ${className}`}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? t("toLight") : t("toDark")}
      title={t("toggle")}
    >
      <span className="shrink-0">{isDark ? <IconSun /> : <IconMoon />}</span>
      <span className="truncate">{isDark ? t("toLight") : t("toDark")}</span>
    </button>
  );
}

export default ThemeToggle;
