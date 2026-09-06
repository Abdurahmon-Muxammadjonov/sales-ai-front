"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo } from "./Logo";
import {
  IconCall,
  IconChevron,
  IconCode,
  IconHelp,
  IconHome,
  IconSettings,
  IconSpeaker,
  IconTeam,
  IconWave,
} from "./icons";
import { ThemeToggle } from "./ThemeToggle";

interface NavItem {
  key: string;
  href?: string;
  icon: ReactNode;
  disabled?: boolean;
  children?: Array<{ key: string; href: string }>;
}

const ITEMS: NavItem[] = [
  { key: "main", href: "/speech", icon: <IconHome /> },
  { key: "stt", href: "/speech/stt", icon: <IconWave /> },
  { key: "tts", icon: <IconSpeaker />, disabled: true },
  { key: "calls", href: "/calls", icon: <IconCall /> },
  { key: "sellers", href: "/sellers", icon: <IconTeam /> },
  {
    key: "developers",
    icon: <IconCode />,
    children: [
      { key: "apiKeysItem", href: "/settings#api" },
      { key: "docs", href: "/speech/stt#docs" },
      { key: "playground", href: "/speech/stt" },
    ],
  },
  { key: "settings", href: "/settings", icon: <IconSettings /> },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>("developers");

  const isActive = (href: string) => {
    const clean = href.split("#")[0];
    return pathname === clean || (clean !== "/speech" && pathname.startsWith(`${clean}/`));
  };

  const row =
    "flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-[7px] text-[13px] transition-colors duration-150";

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-topbar shrink-0 items-center px-4">
        <Link href="/speech" onClick={onNavigate} className="rounded-control">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2" aria-label={t("mainNav")}>
        {ITEMS.map((item) => {
          if (item.disabled) {
            return (
              <div
                key={item.key}
                aria-disabled="true"
                className={`${row} cursor-not-allowed text-ink-4`}
                title={t("comingSoon")}
              >
                <span className="shrink-0 opacity-60">{item.icon}</span>
                <span className="truncate">{t(item.key)}</span>
                <span className="ml-auto shrink-0 rounded-full bg-raised px-1.5 py-px text-[10px] font-medium text-ink-3">
                  {t("comingSoon")}
                </span>
              </div>
            );
          }

          if (item.children) {
            const expanded = open === item.key;
            return (
              <div key={item.key}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : item.key)}
                  className={`${row} text-ink-2 hover:bg-hover hover:text-ink`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="truncate">{t(item.key)}</span>
                  <span className="ml-auto shrink-0 text-ink-3">
                    <IconChevron open={expanded} />
                  </span>
                </button>
                {expanded ? (
                  <div className="mt-0.5 ml-[30px] space-y-0.5 border-l border-line pl-2.5">
                    {item.children.map((child) => (
                      <Link
                        key={child.key}
                        href={child.href}
                        onClick={onNavigate}
                        className="block truncate rounded-[7px] px-2 py-1.5 text-[13px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
                      >
                        {t(child.key)}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          }

          const active = item.href ? isActive(item.href) : false;
          return (
            <Link
              key={item.key}
              href={item.href!}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`${row} ${
                active
                  ? "bg-accent-fill font-medium text-white"
                  : "text-ink-2 hover:bg-hover hover:text-ink"
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="truncate">{t(item.key)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-line p-3">
        <a
          href="mailto:support@salespulse.uz"
          className={`${row} text-ink-2 hover:bg-hover hover:text-ink`}
        >
          <span className="shrink-0">
            <IconHelp />
          </span>
          <span className="truncate">{t("support")}</span>
        </a>
        <div className="px-1 pt-1">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
