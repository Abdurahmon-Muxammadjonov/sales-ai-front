"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useTranslations } from "next-intl";
import { mmss } from "@/lib/format";
import type { SpeakerRole } from "@/lib/speakers";

export interface RibbonSegment {
  start: number;
  end: number;
  speaker: string;
  text?: string;
}

export type RibbonSize = "row" | "seller" | "hero";

const HEIGHT: Record<RibbonSize, number> = {
  row: 6,
  seller: 10,
  hero: 14,
};

/** The whole draw-in, start to finish. Long enough to read, short enough to
 *  not be a loading screen. */
const DRAW_TOTAL = 0.5;
const DRAW_SLICE = 0.18;

const TOOLTIP_CHARS = 60;

export interface RibbonProps {
  segments: RibbonSegment[];
  /** Total call length in the same unit as `start`/`end`. */
  duration: number;
  roleOf: (speaker: string) => SpeakerRole;
  size?: RibbonSize;
  /** Slices become buttons that seek; the track handles clicks in the gaps. */
  interactive?: boolean;
  /** The one orchestrated moment in the product. Detail page only, once. */
  animate?: boolean;
  currentTime?: number | null;
  onSeek?: (seconds: number) => void;
  /** Percentages for the summary label, when they are already known. */
  ratio?: { seller: number; client: number } | null;
  className?: string;
}

/**
 * The shape of a conversation: red where the salesperson is talking, deep blue
 * where the client is, the track colour showing through the silences.
 *
 * A dominant salesperson makes the bar visibly, mostly red — the point of the
 * component is that the manager sees the problem before reading a number.
 */
export function Ribbon({
  segments,
  duration,
  roleOf,
  size = "row",
  interactive = false,
  animate = false,
  currentTime = null,
  onSeek,
  ratio = null,
  className = "",
}: RibbonProps) {
  const t = useTranslations("detail");
  const tRoles = useTranslations("roles");
  const reduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);

  const total = duration > 0 ? duration : 0;

  const slices = useMemo(() => {
    if (total <= 0) return [];
    return segments
      .map((segment, index) => {
        const start = Math.max(0, Math.min(segment.start ?? 0, total));
        const end = Math.max(start, Math.min(segment.end ?? start, total));
        return {
          index,
          start,
          end,
          role: roleOf(segment.speaker),
          text: segment.text ?? "",
          left: (start / total) * 100,
          width: ((end - start) / total) * 100,
        };
      })
      .filter((slice) => slice.width > 0 || slice.end > slice.start);
  }, [segments, total, roleOf]);

  const height = HEIGHT[size];

  const summary = useMemo(() => {
    const derived =
      ratio ??
      (() => {
        let seller = 0;
        let spoken = 0;
        for (const slice of slices) {
          const span = slice.end - slice.start;
          spoken += span;
          if (slice.role === "seller") seller += span;
        }
        if (spoken <= 0) return null;
        const pct = Math.round((seller / spoken) * 100);
        return { seller: pct, client: 100 - pct };
      })();
    if (!derived) return null;
    return t("ribbonLabel", { seller: derived.seller, client: derived.client });
  }, [ratio, slices, t]);

  const seekToClientX = useCallback(
    (clientX: number) => {
      const node = trackRef.current;
      if (!node || !onSeek || total <= 0) return;
      const rect = node.getBoundingClientRect();
      if (rect.width <= 0) return;
      const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      onSeek(fraction * total);
    },
    [onSeek, total],
  );

  const onTrackClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!interactive) return;
      seekToClientX(event.clientX);
    },
    [interactive, seekToClientX],
  );

  /**
   * A long call has hundreds of turns. Making each one a tab stop would trap a
   * keyboard user, so the group holds one stop and the arrow keys walk it.
   */
  const onSliceKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      const last = slices.length - 1;
      let next: number | null = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = Math.min(last, index + 1);
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = Math.max(0, index - 1);
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = last;
      if (next == null) return;
      event.preventDefault();
      setFocusIndex(next);
      const node = trackRef.current?.querySelector<HTMLButtonElement>(
        `[data-slice="${next}"]`,
      );
      node?.focus();
    },
    [slices.length],
  );

  const containerVariants: Variants = {
    hidden: {},
    shown: {
      transition: {
        staggerChildren: slices.length > 1 ? (DRAW_TOTAL - DRAW_SLICE) / (slices.length - 1) : 0,
      },
    },
  };

  const sliceVariants: Variants = {
    hidden: { scaleX: 0 },
    shown: { scaleX: 1, transition: { duration: DRAW_SLICE, ease: [0.22, 1, 0.36, 1] } },
  };

  const shouldAnimate = animate && !reduceMotion && slices.length > 0;
  const hoveredSlice = hovered != null ? slices[hovered] : null;

  /**
   * Held apart from the playhead on purpose. A twenty-six minute call is a few
   * hundred slices, and the player moves the playhead four times a second — if
   * these rebuilt with it, scrubbing would stutter.
   */
  const sliceNodes = useMemo(
    () =>
      slices.map((slice) => {
        const style: CSSProperties = {
          left: `${slice.left}%`,
          width: `${slice.width}%`,
          minWidth: 2,
          transformOrigin: "left center",
          backgroundColor:
            slice.role === "seller" ? "var(--red-voice)" : "var(--blue-voice)",
        };

        if (!interactive) {
          return (
            <motion.div
              key={slice.index}
              aria-hidden="true"
              variants={shouldAnimate ? sliceVariants : undefined}
              className="absolute inset-y-0"
              style={style}
            />
          );
        }

        return (
          <motion.button
            key={slice.index}
            type="button"
            data-slice={slice.index}
            tabIndex={slice.index === focusIndex ? 0 : -1}
            variants={shouldAnimate ? sliceVariants : undefined}
            // An outline would be clipped by the track's overflow-hidden, so
            // the focused slice is marked with an inset ring instead.
            className="absolute inset-y-0 focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--canvas),inset_0_0_0_4px_var(--ink)]"
            style={style}
            aria-label={t("ribbonSlice", {
              role: tRoles(slice.role === "seller" ? "salesperson" : "client"),
              time: mmss(slice.start),
            })}
            onMouseEnter={() => setHovered(slice.index)}
            onFocus={() => {
              setHovered(slice.index);
              setFocusIndex(slice.index);
            }}
            onBlur={() => setHovered(null)}
            onKeyDown={(event) => onSliceKeyDown(event, slice.index)}
            onClick={(event) => {
              event.stopPropagation();
              onSeek?.(slice.start);
            }}
          />
        );
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slices, interactive, shouldAnimate, focusIndex, onSeek, onSliceKeyDown, t, tRoles],
  );

  const trackProps = interactive
    ? ({ role: "group", "aria-label": summary ?? undefined } as const)
    : ({ role: "img", "aria-label": summary ?? undefined } as const);

  return (
    <div className={`relative ${className}`}>
      {hoveredSlice && size === "hero" ? (
        <RibbonTooltip
          left={hoveredSlice.left + hoveredSlice.width / 2}
          time={mmss(hoveredSlice.start)}
          role={tRoles(hoveredSlice.role === "seller" ? "salesperson" : "client")}
          text={hoveredSlice.text}
        />
      ) : null}

      <motion.div
        ref={trackRef}
        {...trackProps}
        variants={shouldAnimate ? containerVariants : undefined}
        initial={shouldAnimate ? "hidden" : false}
        animate={shouldAnimate ? "shown" : undefined}
        onClick={onTrackClick}
        onMouseLeave={() => setHovered(null)}
        className={`relative w-full overflow-hidden rounded-full bg-line ${
          interactive ? "cursor-pointer" : ""
        }`}
        style={{ height }}
      >
        {sliceNodes}

        {currentTime != null && total > 0 ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-0.5 bg-ink"
            style={{
              left: `${Math.min(100, Math.max(0, (currentTime / total) * 100))}%`,
              transform: "translateX(-1px)",
            }}
          />
        ) : null}
      </motion.div>
    </div>
  );
}

function RibbonTooltip({
  left,
  time,
  role,
  text,
}: {
  left: number;
  time: string;
  role: string;
  text: string;
}) {
  const trimmed =
    text.length > TOOLTIP_CHARS ? `${text.slice(0, TOOLTIP_CHARS).trimEnd()}…` : text;

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute bottom-full z-20 mb-2 w-max max-w-[min(20rem,80vw)] -translate-x-1/2 rounded-control border border-line bg-canvas px-2.5 py-1.5 text-xs shadow-sm"
      style={{ left: `clamp(6rem, ${left}%, calc(100% - 6rem))` }}
    >
      <span className="tnum text-ink-2">{time}</span>
      <span className="text-ink-3"> · </span>
      <span className="text-ink">{role}</span>
      {trimmed ? <p className="mt-0.5 text-ink-2">{trimmed}</p> : null}
    </div>
  );
}

export default Ribbon;
