"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AudioPlayer, type AudioPlayerHandle } from "@/components/AudioPlayer";
import { Ribbon } from "@/components/Ribbon";
import { SpinScores } from "@/components/SpinScores";
import { Transcript } from "@/components/Transcript";
import { VoiceLegend } from "@/components/VoiceLegend";
import { Button, Notice, SectionTitle, Skeleton, StatusDot } from "@/components/ui";
import { retryCall } from "@/lib/api";
import {
  buildTranscriptText,
  callFileName,
  downloadJson,
  downloadText,
} from "@/lib/download";
import { formatDuration } from "@/lib/format";
import { useDateFormat } from "@/lib/useDateFormat";
import { useStatusPolling } from "@/lib/live";
import {
  fetchAnalysis,
  fetchCall,
  fetchSeller,
  fetchTranscript,
  signAudioUrl,
} from "@/lib/queries";
import { resolveSpeakers } from "@/lib/speakers";
import {
  isSettled,
  type Analysis,
  type Call,
  type Seller,
  type Transcript as TranscriptRow,
} from "@/lib/types";

type LoadState = "loading" | "ready" | "missing" | "error";

export default function CallDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const t = useTranslations("detail");
  const tSpin = useTranslations("spin");
  const tStatus = useTranslations("status");
  const tCommon = useTranslations("common");
  const tCalls = useTranslations("calls");
  const tRoles = useTranslations("roles");
  const dates = useDateFormat();

  const [state, setState] = useState<LoadState>("loading");
  const [call, setCall] = useState<Call | null>(null);
  const [transcript, setTranscript] = useState<TranscriptRow | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const playerRef = useRef<AudioPlayerHandle>(null);

  const loadResult = useCallback(async (callId: string) => {
    const [nextTranscript, nextAnalysis] = await Promise.all([
      fetchTranscript(callId).catch(() => null),
      fetchAnalysis(callId).catch(() => null),
    ]);
    setTranscript(nextTranscript);
    setAnalysis(nextAnalysis);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState("loading");

    (async () => {
      const nextCall = await fetchCall(id);
      if (cancelled) return;
      if (!nextCall) {
        setState("missing");
        return;
      }
      setCall(nextCall);
      setState("ready");

      if (nextCall.seller_id) {
        const nextSeller = await fetchSeller(nextCall.seller_id).catch(() => null);
        if (!cancelled) setSeller(nextSeller);
      }
      if (nextCall.audio_path) {
        const url = await signAudioUrl(nextCall.audio_path);
        if (!cancelled) setAudioUrl(url);
      }
      if (nextCall.status === "done") await loadResult(nextCall.id);
    })().catch(() => {
      if (!cancelled) setState("error");
    });

    return () => {
      cancelled = true;
    };
  }, [id, loadResult]);

  // A call opened mid-processing settles on this page without a reload.
  useStatusPolling(call && !isSettled(call.status) ? [call.id] : [], (status) => {
    setCall((current) =>
      current && current.status !== status.status
        ? {
            ...current,
            status: status.status,
            duration_sec: status.duration_sec ?? current.duration_sec,
            error: status.error ?? current.error,
          }
        : current,
    );
    if (status.status === "done") void loadResult(status.id);
  });

  const dialog = useMemo(() => transcript?.dialog ?? [], [transcript]);

  const speakers = useMemo(
    () => resolveSpeakers(dialog, transcript?.talk_ratio),
    [dialog, transcript?.talk_ratio],
  );

  const duration = useMemo(() => {
    if (call?.duration_sec) return call.duration_sec;
    const last = dialog[dialog.length - 1];
    return last?.end ?? 0;
  }, [call?.duration_sec, dialog]);

  const activeIndex = useMemo(() => {
    if (dialog.length === 0) return -1;
    let found = -1;
    for (let index = 0; index < dialog.length; index += 1) {
      if (dialog[index].start <= currentTime) found = index;
      else break;
    }
    if (found >= 0 && currentTime > (dialog[found]?.end ?? 0) + 2) return -1;
    return found;
  }, [currentTime, dialog]);

  const seek = useCallback((seconds: number) => {
    playerRef.current?.seek(seconds);
    playerRef.current?.play();
  }, []);

  const clientName = call?.client_name?.trim() || tCalls("unnamedClient");

  function copyTranscript() {
    const text = buildTranscriptText(dialog, speakers.roleOf, {
      seller: tRoles("salesperson"),
      client: tRoles("client"),
    });
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  async function onRetry() {
    if (!call) return;
    setRetrying(true);
    try {
      const result = await retryCall(call.id);
      setCall({ ...call, status: result.status, error: null });
    } catch {
      /* the row keeps its failed state; the button stays available */
    } finally {
      setRetrying(false);
    }
  }

  if (state === "loading") return <DetailSkeleton />;

  if (state === "missing" || state === "error") {
    return (
      <div className="py-8">
        <BackLink label={t("backToCalls")} />
        <Notice
          className="mt-6"
          title={state === "missing" ? t("notFoundTitle") : tCommon("somethingBroke")}
          body={state === "missing" ? t("notFoundBody") : tCommon("somethingBrokeBody")}
          action={
            <Link
              href="/calls"
              className="text-sm font-medium text-ink underline underline-offset-4"
            >
              {t("backToCalls")}
            </Link>
          }
        />
      </div>
    );
  }

  if (!call) return <DetailSkeleton />;

  const hasRibbon = dialog.length > 0 && duration > 0;

  return (
    <div className="pb-4">
      <div className="pt-6">
        <BackLink label={t("backToCalls")} />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 py-5">
        <div className="min-w-0">
          <h1 className="font-display truncate text-xl font-semibold tracking-tight sm:text-2xl">
            {clientName}
          </h1>
          {/* Whose call this was. A manager opening a recording needs the name
              here, not only back on the list. */}
          <p className="mt-1 text-sm text-ink-3">
            {call.seller_id ? (seller?.full_name ?? "") : tCalls("noSeller")}
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <p className="tnum text-sm text-ink-2">
            {call.duration_sec != null ? formatDuration(call.duration_sec) : "—"}
            <span className="text-ink-3"> · </span>
            {dates.dateTime(call.called_at ?? call.created_at)}
          </p>
          {dialog.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={copyTranscript}>
                {copied ? t("copied") : t("copyTranscript")}
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  downloadText(
                    buildTranscriptText(
                      dialog,
                      speakers.roleOf,
                      { seller: tRoles("salesperson"), client: tRoles("client") },
                      `${clientName} — ${dates.dateTime(call.created_at)}`,
                    ),
                    callFileName(call.client_name, call.id, "txt"),
                  )
                }
              >
                {t("downloadTxt")}
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  downloadJson(
                    { call, transcript, analysis },
                    callFileName(call.client_name, call.id, "json"),
                  )
                }
              >
                {t("downloadJson")}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {call.status === "failed" ? (
        <Notice
          className="mb-8"
          tone="warning"
          title={t("failedTitle")}
          body={call.error?.trim() ? call.error : t("failedBodyFallback")}
          action={
            <Button size="sm" disabled={retrying} onClick={() => void onRetry()}>
              {retrying ? tCalls("retrying") : tCalls("retryCall")}
            </Button>
          }
        />
      ) : null}

      {!isSettled(call.status) ? (
        <div className="mb-8 flex items-center gap-2.5 rounded-card border border-line bg-raised px-4 py-3.5">
          <StatusDot tone="working" />
          <div>
            <p className="text-sm font-medium text-ink">{tStatus(call.status)}</p>
            <p className="text-sm text-ink-2">{t("processingBody")}</p>
          </div>
        </div>
      ) : null}

      {hasRibbon ? (
        <section aria-labelledby="ribbon-heading" className="mb-8">
          <h2 id="ribbon-heading" className="sr-only">
            {t("transcriptTitle")}
          </h2>
          <Ribbon
            segments={dialog}
            duration={duration}
            roleOf={speakers.roleOf}
            ratio={speakers.ratio}
            size="hero"
            interactive
            animate
            currentTime={currentTime}
            onSeek={seek}
          />
          <VoiceLegend
            ratio={speakers.ratio}
            className="mt-4"
            trailing={
              <>
                <span className="tnum text-ink-3">{formatDuration(duration)}</span>
                {transcript?.words_count ? (
                  <span className="tnum text-ink-3">
                    {t("words", { count: transcript.words_count })}
                  </span>
                ) : null}
              </>
            }
          />
          {!speakers.ratio ? (
            <p className="mt-2 text-sm text-ink-3">{t("ratioUnavailable")}</p>
          ) : null}
        </section>
      ) : null}

      {call.audio_path ? (
        <div className="mb-10 border-y border-line py-3">
          <AudioPlayer
            ref={playerRef}
            src={audioUrl}
            onTime={setCurrentTime}
            onPlayingChange={setPlaying}
          />
          {audioUrl === null && call.audio_path ? (
            <p className="mt-2 text-sm text-ink-3">{t("audioUnavailable")}</p>
          ) : null}
        </div>
      ) : null}

      {call.status === "done" ? (
        analysis ? (
          <SpinScores analysis={analysis} onSeek={seek} />
        ) : (
          <section className="border-t border-line pt-8">
            <Notice title={tSpin("notEnabledTitle")} body={tSpin("notEnabledBody")} />
          </section>
        )
      ) : null}

      {dialog.length > 0 ? (
        <section className="mt-10 border-t border-line pt-8">
          <SectionTitle>{t("transcriptTitle")}</SectionTitle>
          <Transcript
            dialog={dialog}
            roleOf={speakers.roleOf}
            activeIndex={activeIndex}
            following={playing}
            onSeek={seek}
          />
        </section>
      ) : call.status === "done" ? (
        <p className="border-t border-line pt-8 text-sm text-ink-3">
          {t("transcriptEmpty")}
        </p>
      ) : null}
    </div>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link
      href="/calls"
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
      {label}
    </Link>
  );
}

function DetailSkeleton() {
  return (
    <div className="py-8" aria-busy="true">
      <Skeleton className="h-4 w-32" />
      <div className="mt-6 flex items-start justify-between gap-4">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="mt-8 h-3.5 w-full rounded-full" />
      <div className="mt-4 flex gap-5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="mt-8 h-10 w-full" />
      <div className="mt-10 space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="h-1.5 w-full" />
      </div>
      <div className="mt-10 space-y-4">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex gap-4">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-10 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
