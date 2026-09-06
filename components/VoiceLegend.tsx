"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

/**
 * The key to the two voice colours. It appears wherever a ribbon does at hero
 * size, and it is also where the percentages exist as text for screen readers.
 */
export function VoiceLegend({
  ratio,
  className = "",
  trailing,
}: {
  ratio: { seller: number; client: number } | null;
  className?: string;
  trailing?: ReactNode;
}) {
  const t = useTranslations("detail");

  return (
    <div
      className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-sm ${className}`}
    >
      {ratio ? (
        <>
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full"
              style={{ backgroundColor: "var(--red-voice)" }}
            />
            <span className="tnum text-ink">
              {t("legendSalesperson", { percent: ratio.seller })}
            </span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full"
              style={{ backgroundColor: "var(--blue-voice)" }}
            />
            <span className="tnum text-ink">
              {t("legendClient", { percent: ratio.client })}
            </span>
          </span>
        </>
      ) : null}
      {trailing}
    </div>
  );
}

export default VoiceLegend;
