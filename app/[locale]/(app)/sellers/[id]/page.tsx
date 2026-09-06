"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/components/SessionProvider";
import { CallRowItem } from "@/components/CallRowItem";
import { Ribbon } from "@/components/Ribbon";
import type { TrendPoint } from "@/components/ScoreTrend";
import {
  EmptyState,
  Notice,
  RowList,
  SectionTitle,
  Skeleton,
  SkeletonRows,
} from "@/components/ui";
import { formatNumber, formatScore } from "@/lib/format";
import {
  fetchCalls,
  fetchRibbonSources,
  fetchScoresFor,
  fetchSeller,
  fetchSellerStats,
  fetchTalkRatios,
  toCallRows,
} from "@/lib/queries";
import { averageRatiosBySeller } from "@/lib/ratios";
import { ratioAsSegments } from "@/lib/speakers";
import type { CallRow, Seller, SellerStats } from "@/lib/types";

// Recharts is large and measures the DOM to size itself; keep it off the
// server render and out of the shared bundle.
const ScoreTrend = dynamic(() => import("@/components/ScoreTrend"), {
  ssr: false,
  loading: () => <Skeleton className="h-60 w-full rounded-card" />,
});

export default function SellerProfilePage() {
  const params = useParams<{ id: string }>();
  const sellerId = params.id;

  const t = useTranslations("sellers");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { companyId } = useSession();

  const [seller, setSeller] = useState<Seller | null>(null);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [rows, setRows] = useState<CallRow[] | null>(null);
  const [points, setPoints] = useState<TrendPoint[]>([]);
  const [ratio, setRatio] = useState<{ seller: number; client: number } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [sellerRow, allStats, calls] = await Promise.all([
        fetchSeller(sellerId).catch(() => null),
        fetchSellerStats(companyId).catch(() => [] as SellerStats[]),
        fetchCalls({ companyId, sellerId, limit: 50 }),
      ]);
      if (cancelled) return;

      setSeller(sellerRow);
      setStats(allStats.find((row) => row.seller_id === sellerId) ?? null);

      const doneIds = calls.filter((call) => call.status === "done").map((call) => call.id);
      const [ribbons, talkRatios, scores] = await Promise.all([
        fetchRibbonSources(doneIds).catch(() => new Map()),
        fetchTalkRatios(doneIds).catch(() => new Map()),
        fetchScoresFor(doneIds).catch(() => new Map<string, number>()),
      ]);
      if (cancelled) return;

      const names = new Map(sellerRow ? [[sellerRow.id, sellerRow.full_name]] : []);
      setRows(toCallRows(calls, names, ribbons));
      setRatio(
        averageRatiosBySeller(
          calls.map((call) => ({ id: call.id, seller_id: call.seller_id })),
          talkRatios,
        ).get(sellerId) ?? null,
      );

      setPoints(
        calls
          .filter((call) => scores.has(call.id))
          .map((call) => ({
            at: new Date(call.called_at ?? call.created_at).getTime(),
            score: scores.get(call.id) as number,
          }))
          .filter((point) => Number.isFinite(point.at))
          .sort((a, b) => a.at - b.at),
      );
    })().catch(() => {
      if (!cancelled) {
        setFailed(true);
        setRows([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [companyId, sellerId]);

  const name = seller?.full_name ?? stats?.full_name ?? "";

  const summary = useMemo(
    () => [
      { label: t("calls"), value: formatNumber(stats?.calls_count ?? rows?.length ?? 0, locale) },
      { label: t("avgScore"), value: formatScore(stats?.avg_score ?? null, locale) },
      { label: t("hours"), value: formatNumber(stats?.total_hours ?? null, locale, 1) },
    ],
    [locale, rows?.length, stats, t],
  );

  return (
    <div className="pb-4">
      <div className="pt-6">
        <Link
          href="/sellers"
          className="inline-flex items-center gap-1.5 rounded-control text-sm text-ink-2 hover:text-ink"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M14 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t("backToSellers")}
        </Link>
      </div>

      <h1 className="font-display truncate py-5 text-xl font-semibold tracking-tight sm:text-2xl">
        {name || <Skeleton className="h-7 w-48" />}
      </h1>

      {failed ? (
        <Notice
          className="mb-6"
          tone="warning"
          title={tCommon("somethingBroke")}
          body={tCommon("somethingBrokeBody")}
        />
      ) : null}

      <dl className="grid grid-cols-3 gap-6 border-y border-line py-5">
        {summary.map((item) => (
          <div key={item.label}>
            <dt className="text-sm text-ink-3">{item.label}</dt>
            <dd className="tnum font-display mt-1 text-lg font-semibold">{item.value}</dd>
          </div>
        ))}
      </dl>

      {ratio ? (
        <section className="mt-8">
          <SectionTitle hint={t("avgOf", { count: rows?.length ?? 0 })}>
            {t("talkRatio")}
          </SectionTitle>
          <div className="max-w-lg">
            <Ribbon
              segments={ratioAsSegments(ratio)}
              duration={100}
              roleOf={(speaker) => (speaker === "seller" ? "seller" : "client")}
              ratio={ratio}
              size="seller"
            />
            <p className="tnum mt-2 text-sm text-ink-2">
              {ratio.seller}% / {ratio.client}%
            </p>
          </div>
        </section>
      ) : null}

      <section className="mt-10 border-t border-line pt-8">
        <SectionTitle hint={t("chartHint")}>{t("chartTitle")}</SectionTitle>
        <ScoreTrend points={points} />
      </section>

      <section className="mt-10 border-t border-line pt-8">
        <SectionTitle>{t("profileCalls")}</SectionTitle>
        {rows === null ? (
          <SkeletonRows count={5} />
        ) : rows.length === 0 ? (
          <EmptyState title={t("noStatsTitle")} body={t("noStatsBody")} />
        ) : (
          <RowList label={t("profileCalls")}>
            {rows.map((row) => (
              <CallRowItem key={row.id} call={row} retrying={false} onRetry={() => {}} />
            ))}
          </RowList>
        )}
      </section>
    </div>
  );
}
