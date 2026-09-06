"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatDuration } from "@/lib/format";
import { useDateFormat } from "@/lib/useDateFormat";
import { resolveSpeakers } from "@/lib/speakers";
import type { CallRow } from "@/lib/types";
import { Ribbon } from "./Ribbon";
import { StatusDot } from "./ui";

/**
 * One bordered row. No card, no shadow, no hover lift — the list reads as a
 * ledger, and the only thing that moves the eye is the ribbon.
 */
export function CallRowItem({
  call,
  onRetry,
  retrying,
}: {
  call: CallRow;
  onRetry: (id: string) => void;
  retrying: boolean;
}) {
  const t = useTranslations("calls");
  const tStatus = useTranslations("status");
  const dates = useDateFormat();

  const speakers = useMemo(
    () => resolveSpeakers(call.dialog, call.talk_ratio),
    [call.dialog, call.talk_ratio],
  );

  const clientName = call.client_name?.trim() || t("unnamedClient");
  const isDone = call.status === "done";
  const isFailed = call.status === "failed";
  const duration = call.duration_sec ?? 0;

  return (
    <div
      role="listitem"
      className="relative flex flex-col gap-3 border-b border-line px-1 py-4 transition-colors hover:bg-raised sm:flex-row sm:items-center sm:gap-6"
    >
      <div className="min-w-0 sm:flex-1">
        <Link
          href={`/calls/${call.id}`}
          aria-label={t("openCall", { client: clientName })}
          className="rounded-control after:absolute after:inset-0 after:content-['']"
        >
          <span className="block truncate font-medium text-ink">{clientName}</span>
        </Link>
        <span className="mt-0.5 block truncate text-sm text-ink-3">
          {call.seller_name ?? t("noSeller")}
        </span>
      </div>

      <div className="shrink-0 sm:w-60">
        {isDone && speakers.ratio && call.dialog?.length ? (
          <>
            <Ribbon
              segments={call.dialog}
              duration={duration || lastEnd(call)}
              roleOf={speakers.roleOf}
              ratio={speakers.ratio}
              size="row"
            />
            <p className="tnum mt-1.5 text-xs text-ink-2">
              {t("ratio", { seller: speakers.ratio.seller, client: speakers.ratio.client })}
            </p>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <StatusDot tone={isFailed ? "failed" : isDone ? "done" : "working"} />
            <span className={`text-sm ${isFailed ? "text-red-text" : "text-ink-2"}`}>
              {tStatus(call.status)}
            </span>
            {isFailed ? (
              <button
                type="button"
                disabled={retrying}
                onClick={() => onRetry(call.id)}
                className="relative z-10 ml-1 rounded-control border border-line px-2 py-0.5 text-xs text-ink hover:bg-canvas disabled:opacity-50"
              >
                {retrying ? t("retrying") : t("retryCall")}
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-4 sm:w-28 sm:flex-col sm:items-end sm:gap-0.5">
        <span className="tnum text-sm text-ink-2">
          {call.duration_sec != null ? formatDuration(call.duration_sec) : "—"}
        </span>
        <span className="tnum text-xs text-ink-3">
          {dates.date(call.called_at ?? call.created_at)}
        </span>
      </div>
    </div>
  );
}

/** Falls back to the last segment when `duration_sec` has not landed yet. */
function lastEnd(call: CallRow): number {
  const segments = call.dialog ?? [];
  return segments.length ? (segments[segments.length - 1]?.end ?? 0) : 0;
}

export default CallRowItem;
