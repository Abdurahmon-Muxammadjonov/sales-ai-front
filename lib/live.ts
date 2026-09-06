"use client";

import { useEffect, useRef } from "react";
import { getSupabase } from "./supabase/client";
import { getCallStatus } from "./api";
import type { Call, CallStatusResponse } from "./types";

const POLL_MS = 5000;

/**
 * Polls `GET /calls/{id}` for every call that has not settled yet, and stops
 * the moment the last one reaches `done` or `failed`. Realtime is the fast
 * path; this is the guarantee that a finished call eventually shows up even if
 * the socket never connects.
 */
export function useStatusPolling(
  ids: string[],
  onStatus: (status: CallStatusResponse) => void,
) {
  const key = ids.join(",");
  const handler = useRef(onStatus);
  handler.current = onStatus;

  useEffect(() => {
    const pending = key ? key.split(",") : [];
    if (pending.length === 0) return;

    let alive = true;

    const tick = async () => {
      const results = await Promise.allSettled(pending.map((id) => getCallStatus(id)));
      if (!alive) return;
      for (const result of results) {
        if (result.status === "fulfilled") handler.current(result.value);
      }
    };

    const timer = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [key]);
}

/**
 * Supabase Realtime on the `calls` table, scoped to the viewer's company. If
 * the channel fails to subscribe the caller loses nothing — polling covers it.
 */
export function useCallsRealtime(
  companyId: string | null,
  onChange: (event: "INSERT" | "UPDATE" | "DELETE", call: Partial<Call> & { id: string }) => void,
) {
  const handler = useRef(onChange);
  handler.current = onChange;

  useEffect(() => {
    if (!companyId) return;
    const supabase = getSupabase();
    const channel = supabase
      .channel(`calls:${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "calls",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as (Partial<Call> & { id?: string }) | null;
          if (!row?.id) return;
          handler.current(payload.eventType as "INSERT" | "UPDATE" | "DELETE", {
            ...row,
            id: row.id,
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [companyId]);
}
