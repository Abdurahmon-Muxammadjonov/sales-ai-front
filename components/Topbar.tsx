"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Avatar, Dropdown, DropdownDivider, DropdownItem } from "flowbite-react";
import { Link } from "@/i18n/navigation";
import { formatNumber } from "@/lib/format";
import { IconMenu, IconPlus } from "./icons";
import { LocaleSwitcher } from "./LocaleSwitcher";

function initialsOf(name: string | null, email: string): string {
  const source = (name ?? "").trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (parts.slice(0, 2).map((part) => part[0]).join("") || "?").toUpperCase();
}

export function Topbar({
  title,
  fullName,
  email,
  hoursUsed,
  hoursLimit,
  onSignOut,
  onOpenMenu,
}: {
  title: string;
  fullName: string | null;
  email: string;
  hoursUsed: number | null;
  hoursLimit: number | null;
  onSignOut: () => void;
  onOpenMenu: () => void;
}) {
  const t = useTranslations("nav");
  const tTop = useTranslations("topbar");
  const locale = useLocale();
  const [, setOpen] = useState(false);

  const displayName = fullName?.trim() || email;

  return (
    <header className="vibrancy sticky top-0 z-30 h-topbar border-b border-line">
      <div className="flex h-full items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label={t("openMenu")}
          className="-ml-1 inline-flex size-8 items-center justify-center rounded-control text-ink-2 hover:bg-hover hover:text-ink lg:hidden"
        >
          <IconMenu />
        </button>

        <h1 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">
          {title}
        </h1>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {/* Real usage, not an invented money balance: this is the number that
              actually governs whether the next upload is accepted. */}
          <div className="hidden text-right leading-none sm:block">
            <p className="tnum font-mono text-[15px] font-semibold text-ink">
              {hoursUsed == null
                ? "—"
                : `${formatNumber(hoursUsed, locale, 1)}${
                    hoursLimit ? ` / ${formatNumber(hoursLimit, locale, 0)}` : ""
                  }`}
            </p>
            <p className="mt-1 text-[11px] text-ink-3">{tTop("hoursLabel")}</p>
          </div>

          <Link
            href="/settings"
            aria-label={tTop("topUp")}
            title={tTop("topUp")}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-fill text-white transition-colors hover:bg-accent-hover"
          >
            <IconPlus />
          </Link>

          <div className="hidden sm:block">
            <LocaleSwitcher />
          </div>

          <Dropdown
            arrowIcon={false}
            inline
            placement="bottom-end"
            label=""
            renderTrigger={() => (
              <button
                type="button"
                aria-label={t("userMenu")}
                className="flex items-center rounded-full transition-opacity hover:opacity-80"
                onClick={() => setOpen((v) => !v)}
              >
                <Avatar rounded size="xs" placeholderInitials={initialsOf(fullName, email)} />
              </button>
            )}
          >
            <div className="px-4 py-2">
              <p className="truncate text-sm font-medium text-ink">{displayName}</p>
              <p className="truncate text-xs text-ink-3">{email}</p>
            </div>
            <DropdownDivider />
            <div className="px-4 py-2 sm:hidden">
              <LocaleSwitcher />
            </div>
            <DropdownItem as={Link} href="/settings">
              {t("settings")}
            </DropdownItem>
            <DropdownItem onClick={onSignOut}>{t("signOut")}</DropdownItem>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
