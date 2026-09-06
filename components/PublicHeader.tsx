"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "./Logo";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { IconMenu } from "./icons";

/** Anchors into the sections below; ids are stable and language-independent. */
const SECTIONS = ["how", "what", "api"] as const;

export function PublicHeader() {
  const t = useTranslations("landing");
  const [open, setOpen] = useState(false);

  return (
    <header className="vibrancy sticky top-0 z-40 border-b border-line">
      <div className="shell flex h-16 items-center gap-6">
        <Link href="/" className="shrink-0 rounded-control">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label={t("navLabel")}>
          {SECTIONS.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-control px-3 py-1.5 text-[13px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
            >
              {t(`nav_${id}`)}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <LocaleSwitcher />
          </div>
          <div className="hidden sm:block">
            <ThemeToggleButton />
          </div>
          <Link
            href="/kirish"
            className="inline-flex h-9 shrink-0 items-center rounded-control bg-accent-fill px-4 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
          >
            {t("signIn")}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={t("navLabel")}
            className="inline-flex size-9 items-center justify-center rounded-control text-ink-2 hover:bg-hover hover:text-ink md:hidden"
          >
            <IconMenu />
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-line md:hidden">
          <div className="shell flex flex-col py-2">
            {SECTIONS.map((id) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={() => setOpen(false)}
                className="rounded-control px-1 py-2.5 text-[14px] text-ink-2 hover:text-ink"
              >
                {t(`nav_${id}`)}
              </a>
            ))}
            <div className="mt-2 flex items-center gap-2 border-t border-line pt-3">
              <LocaleSwitcher />
              <div className="w-40">
                <ThemeToggleButton />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

/** The sidebar's toggle is a full-width row; on the public header it is a chip. */
function ThemeToggleButton() {
  return (
    <div className="w-fit [&>*]:!w-auto [&>*]:!px-2.5">
      <ThemeToggle />
    </div>
  );
}

export default PublicHeader;
