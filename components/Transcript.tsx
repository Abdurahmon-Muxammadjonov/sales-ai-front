"use client";

import { memo, useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { mmss } from "@/lib/format";
import type { SpeakerRole } from "@/lib/speakers";
import type { DialogSegment } from "@/lib/types";

export interface TranscriptProps {
  dialog: DialogSegment[];
  roleOf: (speaker: string) => SpeakerRole;
  activeIndex: number;
  /** Auto-scroll only while audio is actually playing. */
  following: boolean;
  onSeek?: (seconds: number) => void;
}

/**
 * The conversation as text. Timestamp in a fixed gutter, then a hairline in the
 * speaker's colour, then the turn. The turn under the playhead takes the raised
 * surface and pulls itself into view.
 */
export const Transcript = memo(function Transcript({
  dialog,
  roleOf,
  activeIndex,
  following,
  onSeek,
}: TranscriptProps) {
  const t = useTranslations("detail");
  const tRoles = useTranslations("roles");
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!following || activeIndex < 0) return;
    const node = containerRef.current?.querySelector<HTMLElement>(
      `[data-turn="${activeIndex}"]`,
    );
    node?.scrollIntoView({
      block: "nearest",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [activeIndex, following, reduceMotion]);

  if (dialog.length === 0) {
    return <p className="text-sm text-ink-3">{t("transcriptEmpty")}</p>;
  }

  return (
    <div ref={containerRef} className="border-t border-line">
      {dialog.map((segment, index) => {
        const role = roleOf(segment.speaker);
        const active = index === activeIndex;
        const color = role === "seller" ? "var(--red-voice)" : "var(--blue-voice)";

        return (
          <div
            key={`${segment.start}-${index}`}
            data-turn={index}
            className={`flex gap-3 border-b border-line py-3 transition-colors sm:gap-4 ${
              active ? "bg-raised" : ""
            }`}
          >
            {/* Where there is no player to steer — the landing page preview —
                a timestamp is a label, not a dead button wearing a
                not-allowed cursor. */}
            {onSeek ? (
              <button
                type="button"
                onClick={() => onSeek(segment.start)}
                className="tnum h-fit w-9 shrink-0 rounded-control pt-0.5 text-left text-xs text-ink-3 transition-colors hover:text-ink sm:w-[52px]"
              >
                {mmss(segment.start)}
              </button>
            ) : (
              <span className="tnum h-fit w-9 shrink-0 pt-0.5 text-left text-xs text-ink-3 sm:w-[52px]">
                {mmss(segment.start)}
              </span>
            )}

            <div
              className="min-w-0 flex-1 border-l-2 pl-3 sm:pl-4"
              style={{ borderColor: color }}
            >
              <p className="text-xs font-medium" style={{ color }}>
                {tRoles(role === "seller" ? "salesperson" : "client")}
              </p>
              <p className="mt-1 text-ink">{segment.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default Transcript;
