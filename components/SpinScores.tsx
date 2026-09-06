"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { formatScore, mmss, parseTimecode } from "@/lib/format";
import type { Analysis, SpinAxis } from "@/lib/types";
import { SectionTitle } from "./ui";

/** At or below this a SPIN axis is weak enough to call out. */
const WEAK_AT_OR_BELOW = 4;

const AXES: Array<{ key: SpinAxis; label: string }> = [
  { key: "situation", label: "situation" },
  { key: "problem", label: "problem" },
  { key: "implication", label: "implication" },
  { key: "need_payoff", label: "needPayoff" },
];

export function SpinScores({
  analysis,
  onSeek,
}: {
  analysis: Analysis;
  onSeek?: (seconds: number) => void;
}) {
  const t = useTranslations("spin");
  const locale = useLocale();

  const strengths = analysis.strengths ?? [];
  const mistakes = analysis.mistakes ?? [];
  const missed = analysis.missed ?? [];
  const recommendations = analysis.recommendations ?? [];

  return (
    <section aria-labelledby="spin-heading" className="border-t border-line pt-8">
      <div id="spin-heading">
        <SectionTitle>{t("title")}</SectionTitle>
      </div>

      <div className="grid gap-8 md:grid-cols-[minmax(0,200px)_minmax(0,1fr)] md:gap-12">
        <div>
          <p className="text-sm text-ink-2">{t("totalScore")}</p>
          <p className="font-display mt-1 flex items-baseline gap-2">
            <CountUp value={analysis.total_score ?? 0} locale={locale} />
            <span className="text-sm font-normal text-ink-3">{t("outOf")}</span>
          </p>
        </div>

        <dl className="space-y-3.5">
          {AXES.map((axis, index) => {
            const value = Number(analysis[axis.key] ?? 0);
            const weak = value <= WEAK_AT_OR_BELOW;
            return (
              <div
                key={axis.key}
                className="grid grid-cols-[minmax(0,6.5rem)_1fr_2rem] items-center gap-3 sm:grid-cols-[minmax(0,9rem)_1fr_3rem]"
              >
                <dt className="truncate text-sm text-ink-2">{t(axis.label)}</dt>
                <dd className="h-1.5 overflow-hidden rounded-full bg-line">
                  <ScoreBar value={value} weak={weak} delay={index * 0.05} />
                </dd>
                <dd className="tnum text-right text-sm text-ink">
                  <span className="sr-only">{t("axisValue", { value })}</span>
                  <span aria-hidden="true">{value}</span>
                </dd>
              </div>
            );
          })}
        </dl>
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-2 md:gap-12">
        <ItemList title={t("strengths")} items={strengths} emptyLabel={t("empty")} />
        <ItemList title={t("mistakes")} items={mistakes} emptyLabel={t("empty")} />
      </div>

      {missed.length > 0 ? (
        <div className="mt-10">
          <h3 className="font-display text-base font-semibold tracking-tight">
            {t("missed")}
          </h3>
          <ul className="mt-3 border-t border-line">
            {missed.map((item, index) => {
              const seconds = parseTimecode(item.vaqt);
              return (
                <li
                  key={`${item.vaqt}-${index}`}
                  className="flex gap-3 border-b border-line py-3 sm:gap-4"
                >
                  {seconds != null && onSeek ? (
                    <button
                      type="button"
                      onClick={() => onSeek(seconds)}
                      aria-label={t("seekTo", { time: item.vaqt })}
                      className="tnum h-fit shrink-0 rounded-control text-sm font-medium text-red-text underline decoration-transparent underline-offset-4 hover:decoration-current"
                    >
                      {mmss(seconds)}
                    </button>
                  ) : (
                    <span className="tnum h-fit shrink-0 text-sm text-red-text">
                      {item.vaqt}
                    </span>
                  )}
                  <p className="min-w-0 text-sm text-ink">{item.nima}</p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {recommendations.length > 0 ? (
        <div className="mt-10">
          <h3 className="font-display text-base font-semibold tracking-tight">
            {t("recommendations")}
          </h3>
          <ul className="mt-3 border-t border-line">
            {recommendations.map((item, index) => (
              <li key={index} className="border-b border-line py-3 text-sm text-ink">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function ItemList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div>
      <h3 className="font-display text-base font-semibold tracking-tight">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 border-t border-line pt-3 text-sm text-ink-3">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 border-t border-line">
          {items.map((item, index) => (
            <li key={index} className="border-b border-line py-3 text-sm text-ink">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Weak axes take the red voice colour. It is the only place in the product
 * where red means "weak" rather than "salesperson" — and the only place it is
 * allowed to.
 */
function ScoreBar({ value, weak, delay }: { value: number; weak: boolean; delay: number }) {
  const reduceMotion = useReducedMotion();
  const percent = Math.max(0, Math.min(100, (value / 10) * 100));

  return (
    <motion.div
      className="h-full rounded-full"
      style={{ backgroundColor: weak ? "var(--red-voice)" : "var(--ink)" }}
      initial={reduceMotion ? false : { width: 0 }}
      animate={{ width: `${percent}%` }}
      transition={{ duration: 0.4, ease: "easeOut", delay: reduceMotion ? 0 : delay }}
    />
  );
}

function CountUp({ value, locale }: { value: number; locale: string }) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      setShown(value);
      return;
    }
    let frame = 0;
    const started = performance.now();
    const duration = 700;
    const run = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      // Ease-out cubic: fast enough to feel instant, slow enough to read.
      setShown(value * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, [reduceMotion, value]);

  return (
    <output className="tnum text-3xl leading-none font-bold tracking-tight">
      {formatScore(shown, locale)}
    </output>
  );
}

export default SpinScores;
