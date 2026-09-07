"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/components/SessionProvider";
import { Ribbon } from "@/components/Ribbon";
import { EmptyState, Notice, PageHeader, Skeleton } from "@/components/ui";
import { formatNumber, formatScore } from "@/lib/format";
import { averageRatiosBySeller } from "@/lib/ratios";
import {
  fetchDoneCallsForCompany,
  fetchSellerStats,
  fetchTalkRatios,
} from "@/lib/queries";
import { ratioAsSegments } from "@/lib/speakers";
import type { SellerStats } from "@/lib/types";

type SortKey =
  | "full_name"
  | "calls_count"
  | "avg_score"
  | "avg_situation"
  | "avg_problem"
  | "avg_implication"
  | "avg_need_payoff"
  | "total_hours";

const COLUMNS: Array<{ key: SortKey; label: string; numeric: boolean }> = [
  { key: "full_name", label: "name", numeric: false },
  { key: "calls_count", label: "calls", numeric: true },
  { key: "avg_score", label: "avgScore", numeric: true },
  { key: "avg_situation", label: "situation", numeric: true },
  { key: "avg_problem", label: "problem", numeric: true },
  { key: "avg_implication", label: "implication", numeric: true },
  { key: "avg_need_payoff", label: "needPayoff", numeric: true },
  { key: "total_hours", label: "hours", numeric: true },
];

export default function SellersPage() {
  const t = useTranslations("sellers");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { companyId } = useSession();

  const [stats, setStats] = useState<SellerStats[] | null>(null);
  const [ratios, setRatios] = useState<Map<string, { seller: number; client: number }>>(
    new Map(),
  );
  const [failed, setFailed] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "avg_score",
    dir: "desc",
  });

  useEffect(() => {
    let cancelled = false;

    fetchSellerStats(companyId)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) {
          setStats([]);
          setFailed(true);
        }
      });

    fetchDoneCallsForCompany(companyId)
      .then(async (calls) => {
        const talkRatios = await fetchTalkRatios(calls.map((call) => call.id));
        if (!cancelled) setRatios(averageRatiosBySeller(calls, talkRatios));
      })
      .catch(() => {
        /* the ribbon column simply stays empty */
      });

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const sorted = useMemo(() => {
    if (!stats) return [];
    const direction = sort.dir === "asc" ? 1 : -1;
    return [...stats].sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];
      if (typeof left === "string" || typeof right === "string") {
        return String(left ?? "").localeCompare(String(right ?? ""), locale) * direction;
      }
      // Sellers with nothing to average belong at the bottom whichever way the
      // column is pointing, so the null test sits outside the direction flip.
      if (left == null && right == null) return 0;
      if (left == null) return 1;
      if (right == null) return -1;
      return (Number(left) - Number(right)) * direction;
    });
  }, [locale, sort, stats]);

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "full_name" ? "asc" : "desc" },
    );
  }

  return (
    <>
      <PageHeader title={t("title")} />

      {failed ? (
        <Notice
          className="mb-4"
          tone="warning"
          title={tCommon("somethingBroke")}
          body={tCommon("somethingBrokeBody")}
        />
      ) : null}

      {stats === null ? (
        <TableSkeleton />
      ) : sorted.length === 0 ? (
        <EmptyState title={t("noStatsTitle")} body={t("noStatsBody")} />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              {COLUMNS.map((column) => {
                const active = sort.key === column.key;
                return (
                  <TableHeadCell
                    key={column.key}
                    aria-sort={
                      active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"
                    }
                    className={column.numeric ? "text-right" : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      aria-label={t("sortBy", { column: t(column.label) })}
                      className={`inline-flex items-center gap-1 rounded-control ${
                        active ? "text-ink" : "text-ink-3 hover:text-ink-2"
                      }`}
                    >
                      {t(column.label)}
                      <span
                        aria-hidden="true"
                        className={`w-2 text-[9px] leading-none transition-opacity ${
                          active ? "opacity-100" : "opacity-0 group-hover/head:opacity-40"
                        }`}
                      >
                        {active && sort.dir === "asc" ? "▲" : "▼"}
                      </span>
                    </button>
                  </TableHeadCell>
                );
              })}
              <TableHeadCell className="w-40">{t("talkRatio")}</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((row) => {
              const ratio = ratios.get(row.seller_id) ?? null;
              return (
                <TableRow key={row.seller_id} className="group relative border-b border-line hover:bg-raised">
                  <TableCell className="max-w-[14rem] truncate">
                    <Link
                      href={`/sellers/${row.seller_id}`}
                      aria-label={t("openProfile", { name: row.full_name })}
                      // Stretches over the whole row, so the hover highlight
                      // and the click target finally describe the same area.
                      className="rounded-control font-medium text-ink underline decoration-transparent underline-offset-4 after:absolute after:inset-0 after:content-[''] hover:decoration-current"
                    >
                      {row.full_name}
                    </Link>
                  </TableCell>
                  <TableCell className="tnum text-right text-ink-2">
                    {formatNumber(row.calls_count, locale)}
                  </TableCell>
                  <TableCell className="tnum text-right font-medium text-ink">
                    {formatScore(row.avg_score, locale)}
                  </TableCell>
                  <TableCell className="tnum text-right text-ink-2">
                    {formatScore(row.avg_situation, locale)}
                  </TableCell>
                  <TableCell className="tnum text-right text-ink-2">
                    {formatScore(row.avg_problem, locale)}
                  </TableCell>
                  <TableCell className="tnum text-right text-ink-2">
                    {formatScore(row.avg_implication, locale)}
                  </TableCell>
                  <TableCell className="tnum text-right text-ink-2">
                    {formatScore(row.avg_need_payoff, locale)}
                  </TableCell>
                  <TableCell className="tnum text-right text-ink-2">
                    {formatNumber(row.total_hours, locale, 1)}
                  </TableCell>
                  <TableCell>
                    {ratio ? (
                      <div className="w-36">
                        <Ribbon
                          segments={ratioAsSegments(ratio)}
                          duration={100}
                          roleOf={(speaker) =>
                            speaker === "seller" ? "seller" : "client"
                          }
                          ratio={ratio}
                          size="seller"
                        />
                        <p className="tnum mt-1.5 text-xs text-ink-3">
                          {ratio.seller}% / {ratio.client}%
                        </p>
                      </div>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}

function TableSkeleton() {
  return (
    <div className="border-t border-line" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex items-center gap-6 border-b border-line py-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="ml-auto h-2.5 w-36 rounded-full" />
        </div>
      ))}
    </div>
  );
}
