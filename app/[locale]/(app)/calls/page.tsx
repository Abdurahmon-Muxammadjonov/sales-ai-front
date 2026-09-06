"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Select } from "flowbite-react";
import { useSession } from "@/components/SessionProvider";
import { CallRowItem } from "@/components/CallRowItem";
import { UploadModal } from "@/components/UploadModal";
import { Button, EmptyState, Notice, PageHeader, RowList, SkeletonRows } from "@/components/ui";
import { retryCall } from "@/lib/api";
import { useCallsRealtime, useStatusPolling } from "@/lib/live";
import {
  CALLS_PAGE_SIZE,
  fetchCall,
  fetchCalls,
  fetchRibbonSources,
  fetchSellers,
  toCallRows,
} from "@/lib/queries";
import { CALL_STATUSES, isSettled, type CallRow, type CallStatus, type Seller } from "@/lib/types";

export default function CallsPage() {
  const t = useTranslations("calls");
  const tStatus = useTranslations("status");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { companyId, company } = useSession();

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [sellerFilter, setSellerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [rows, setRows] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const sellerNames = useMemo(
    () => new Map(sellers.map((seller) => [seller.id, seller.full_name])),
    [sellers],
  );
  const sellerNamesRef = useRef(sellerNames);
  sellerNamesRef.current = sellerNames;

  useEffect(() => {
    let cancelled = false;
    fetchSellers(companyId)
      .then((data) => {
        if (!cancelled) setSellers(data);
      })
      .catch(() => {
        /* the filter simply stays empty; names fall back to "no seller" */
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const load = useCallback(
    async (offset: number) => {
      const calls = await fetchCalls({
        companyId,
        sellerId: sellerFilter || null,
        status: (statusFilter || null) as CallStatus | null,
        offset,
      });
      // Only finished calls have a ribbon to draw, so only they cost a second
      // query.
      const doneIds = calls.filter((call) => call.status === "done").map((call) => call.id);
      const ribbons = await fetchRibbonSources(doneIds);
      return {
        rows: toCallRows(calls, sellerNamesRef.current, ribbons),
        hasMore: calls.length === CALLS_PAGE_SIZE,
      };
    },
    [companyId, sellerFilter, statusFilter],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    load(0)
      .then((result) => {
        if (cancelled) return;
        setRows(result.rows);
        setHasMore(result.hasMore);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Seller names arrive independently of the call rows; stitch them together
  // rather than re-running the whole query.
  useEffect(() => {
    setRows((current) =>
      current.map((row) =>
        row.seller_id
          ? { ...row, seller_name: sellerNames.get(row.seller_id) ?? null }
          : row,
      ),
    );
  }, [sellerNames]);

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await load(rows.length);
      setRows((current) => {
        const seen = new Set(current.map((row) => row.id));
        return [...current, ...result.rows.filter((row) => !seen.has(row.id))];
      });
      setHasMore(result.hasMore);
    } catch {
      setFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }

  /** Pulls the ribbon for a call that just finished, so the row fills in. */
  const hydrateRibbon = useCallback(async (id: string) => {
    const ribbons = await fetchRibbonSources([id]).catch(() => null);
    const ribbon = ribbons?.get(id);
    if (!ribbon) return;
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? { ...row, dialog: ribbon.dialog, talk_ratio: ribbon.talk_ratio }
          : row,
      ),
    );
  }, []);

  const applyStatus = useCallback(
    (id: string, status: CallStatus, durationSec: number | null, error?: string | null) => {
      setRows((current) => {
        const existing = current.find((row) => row.id === id);
        if (!existing || existing.status === status) return current;
        if (status === "done") void hydrateRibbon(id);
        return current.map((row) =>
          row.id === id
            ? {
                ...row,
                status,
                duration_sec: durationSec ?? row.duration_sec,
                error: error ?? row.error,
              }
            : row,
        );
      });
    },
    [hydrateRibbon],
  );

  const unsettledIds = useMemo(
    () => rows.filter((row) => !isSettled(row.status)).map((row) => row.id),
    [rows],
  );

  useStatusPolling(unsettledIds, (status) =>
    applyStatus(status.id, status.status, status.duration_sec, status.error),
  );

  /**
   * A call this client has never seen — someone else on the team uploaded it.
   * Fetch it in full so the active filters and the seller name are applied the
   * same way they would be on a fresh load.
   */
  const adoptNewCall = useCallback(
    async (id: string) => {
      const call = await fetchCall(id).catch(() => null);
      if (!call) return;
      if (sellerFilter && call.seller_id !== sellerFilter) return;
      if (statusFilter && call.status !== statusFilter) return;
      setRows((current) => {
        if (current.some((row) => row.id === call.id)) return current;
        return [...toCallRows([call], sellerNamesRef.current, new Map()), ...current];
      });
    },
    [sellerFilter, statusFilter],
  );

  const knownIds = useMemo(() => new Set(rows.map((row) => row.id)), [rows]);
  const knownIdsRef = useRef(knownIds);
  knownIdsRef.current = knownIds;

  useCallsRealtime(companyId, (event, call) => {
    if (event === "DELETE") {
      setRows((current) => current.filter((row) => row.id !== call.id));
      return;
    }
    if (!knownIdsRef.current.has(call.id)) {
      void adoptNewCall(call.id);
      return;
    }
    if (call.status === "done") void hydrateRibbon(call.id);
    setRows((current) =>
      current.map((row) => (row.id === call.id ? { ...row, ...call, id: row.id } : row)),
    );
  });

  async function onRetry(id: string) {
    setRetryingId(id);
    try {
      const result = await retryCall(id);
      setRows((current) =>
        current.map((row) =>
          row.id === id ? { ...row, status: result.status, error: null } : row,
        ),
      );
    } catch {
      setFailed(true);
    } finally {
      setRetryingId(null);
    }
  }

  const filtered = Boolean(sellerFilter || statusFilter);

  return (
    <>
      <PageHeader
        title={t("title")}
        meta={!loading && rows.length > 0 ? t("count", { count: rows.length }) : undefined}
        actions={
          <>
            <Select
              sizing="sm"
              aria-label={t("filterSeller")}
              value={sellerFilter}
              onChange={(event) => setSellerFilter(event.target.value)}
            >
              <option value="">{t("allSellers")}</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.full_name}
                </option>
              ))}
            </Select>
            <Select
              sizing="sm"
              aria-label={t("filterStatus")}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">{t("allStatuses")}</option>
              {CALL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {tStatus(status)}
                </option>
              ))}
            </Select>
            <Button tone="primary" onClick={() => setUploadOpen(true)}>
              {t("upload")}
            </Button>
          </>
        }
      />

      {failed ? (
        <Notice
          className="mb-4"
          tone="warning"
          title={tCommon("somethingBroke")}
          body={tCommon("somethingBrokeBody")}
        />
      ) : null}

      {loading ? (
        <SkeletonRows count={8} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={filtered ? t("emptyFilteredTitle") : t("emptyTitle")}
          body={filtered ? t("emptyFilteredBody") : t("emptyBody")}
          action={
            filtered ? (
              <Button
                onClick={() => {
                  setSellerFilter("");
                  setStatusFilter("");
                }}
              >
                {t("clearFilters")}
              </Button>
            ) : (
              <Button tone="primary" onClick={() => setUploadOpen(true)}>
                {t("upload")}
              </Button>
            )
          }
        />
      ) : (
        <>
          <RowList label={t("listLabel")}>
            {rows.map((row) => (
              <CallRowItem
                key={row.id}
                call={row}
                retrying={retryingId === row.id}
                onRetry={(id) => void onRetry(id)}
              />
            ))}
          </RowList>
          {hasMore ? (
            <div className="flex justify-center py-8">
              <Button onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore ? tCommon("loading") : t("loadMore")}
              </Button>
            </div>
          ) : null}
        </>
      )}

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        locale={locale}
        companyId={companyId}
        hoursLimit={company?.hours_limit ?? null}
        sellers={sellers.filter((seller) => seller.active)}
        onUploaded={(call, meta) => {
          setRows((current) => {
            if (current.some((row) => row.id === call.id)) return current;
            const now = new Date().toISOString();
            return [
              {
                id: call.id,
                company_id: companyId,
                seller_id: meta.sellerId,
                audio_path: null,
                duration_sec: call.duration_sec,
                status: call.status,
                error: call.error,
                client_name: meta.clientName,
                called_at: null,
                created_at: now,
                updated_at: now,
                seller_name: meta.sellerId
                  ? (sellerNamesRef.current.get(meta.sellerId) ?? null)
                  : null,
                dialog: null,
                talk_ratio: null,
              },
              ...current,
            ];
          });
        }}
      />
    </>
  );
}
