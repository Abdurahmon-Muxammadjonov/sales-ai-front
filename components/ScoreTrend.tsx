"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatScore } from "@/lib/format";
import { useDateFormat } from "@/lib/useDateFormat";

export interface TrendPoint {
  /** Milliseconds, so the axis can be spaced by real time rather than index. */
  at: number;
  score: number;
}

/**
 * Score per call over time. Deliberately monochrome: red and blue belong to
 * the two voices, and a coaching trend is neither of them.
 */
export function ScoreTrend({ points }: { points: TrendPoint[] }) {
  const t = useTranslations("sellers");
  const locale = useLocale();
  const dates = useDateFormat();

  if (points.length < 2) {
    return <p className="text-sm text-ink-3">{t("chartEmpty")}</p>;
  }

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="at"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(value: number) => dates.monthDay(value)}
            tick={{ fill: "var(--ink-3)", fontSize: 12 }}
            axisLine={{ stroke: "var(--line)" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={[0, 10]}
            ticks={[0, 5, 10]}
            tick={{ fill: "var(--ink-3)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ stroke: "var(--line)" }}
            labelFormatter={(value) => dates.date(new Date(Number(value)).toISOString())}
            formatter={(value) => [formatScore(Number(value), locale), t("avgScore")]}
            contentStyle={{
              background: "var(--canvas)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              fontSize: 13,
              color: "var(--ink)",
            }}
            labelStyle={{ color: "var(--ink-2)" }}
            itemStyle={{ color: "var(--ink)" }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--ink)"
            strokeWidth={1.75}
            dot={{ r: 2.5, fill: "var(--canvas)", stroke: "var(--ink)", strokeWidth: 1.5 }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ScoreTrend;
