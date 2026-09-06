"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "./Logo";

export function PublicFooter() {
  const t = useTranslations("landing");

  return (
    <footer className="border-t border-line bg-canvas">
      <div className="shell flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-[13px] leading-relaxed text-ink-2">{t("footerLine")}</p>
        </div>

        <div className="flex flex-wrap gap-x-12 gap-y-4 text-[13px]">
          <div className="flex flex-col gap-2">
            <a href="#how" className="text-ink-2 hover:text-ink">
              {t("nav_how")}
            </a>
            <a href="#what" className="text-ink-2 hover:text-ink">
              {t("nav_what")}
            </a>
            <a href="#api" className="text-ink-2 hover:text-ink">
              {t("nav_api")}
            </a>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/kirish" className="text-ink-2 hover:text-ink">
              {t("signIn")}
            </Link>
            <a href="mailto:support@salespulse.uz" className="text-ink-2 hover:text-ink">
              {t("footerContact")}
            </a>
          </div>
        </div>
      </div>

      <div className="shell border-t border-divider py-5">
        <p className="text-[12px] text-ink-3">{t("footerRights")}</p>
      </div>
    </footer>
  );
}

export default PublicFooter;
