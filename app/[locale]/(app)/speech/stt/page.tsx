"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Label, Select, TextInput, ToggleSwitch } from "flowbite-react";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/components/SessionProvider";
import { Recorder } from "@/components/Recorder";
import { Waveform } from "@/components/Waveform";
import { Button, Notice } from "@/components/ui";
import { IconUpload } from "@/components/icons";
import { readAudioSummary, readDuration } from "@/lib/audioPeaks";
import {
  ACCEPTED_AUDIO_ACCEPT,
  ACCEPTED_AUDIO_EXTENSIONS,
  ApiError,
  MAX_UPLOAD_BYTES,
  toApiError,
  uploadCall,
} from "@/lib/api";
import { useStatusPolling } from "@/lib/live";
import { fetchSellers, fetchTranscript } from "@/lib/queries";
import { formatBytes, mmss } from "@/lib/format";
import { resolveSpeakers } from "@/lib/speakers";
import { isSettled, type CallStatus, type Seller, type Transcript } from "@/lib/types";

const MAX_SECONDS = 120 * 60;
const ACCEPTED: readonly string[] = ACCEPTED_AUDIO_EXTENSIONS;

type JobState = "ready" | "uploading" | "processing" | "done" | "failed";

interface Job {
  key: string;
  file: File;
  duration: number | null;
  peaks: number[] | null;
  state: JobState;
  progress: number;
  callId: string | null;
  status: CallStatus | null;
  transcript: Transcript | null;
  errorKey: string | null;
}

let seed = 0;

export default function SttPage() {
  const t = useTranslations("stt");
  const tUpload = useTranslations("upload");
  const tStatus = useTranslations("status");
  const locale = useLocale();
  const { companyId } = useSession();

  const [tab, setTab] = useState<"upload" | "record">("upload");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [sellerId, setSellerId] = useState("");
  const [clientName, setClientName] = useState("");
  const [diarize, setDiarize] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocker, setBlocker] = useState<ApiError | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSellers(companyId)
      .then((data) => {
        if (!cancelled) setSellers(data.filter((s) => s.active));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const patch = useCallback((key: string, next: Partial<Job>) => {
    setJobs((current) => current.map((job) => (job.key === key ? { ...job, ...next } : job)));
  }, []);

  /**
   * Validate, then read the waveform. The peaks are decoded lazily and never
   * block adding the file — a long recording should appear in the queue at once
   * and grow its picture a moment later.
   */
  const addFiles = useCallback(
    async (files: File[]) => {
      const added: Job[] = files.map((file) => {
        const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
        const badFormat = !ACCEPTED.includes(extension);
        const tooLarge = file.size > MAX_UPLOAD_BYTES;
        return {
          key: `j${++seed}`,
          file,
          duration: null,
          peaks: null,
          state: badFormat || tooLarge ? "failed" : "ready",
          progress: 0,
          callId: null,
          status: null,
          transcript: null,
          errorKey: badFormat ? "errFormat" : tooLarge ? "errTooLarge" : null,
        };
      });

      setJobs((current) => [...current, ...added]);

      for (const job of added) {
        if (job.state === "failed") continue;
        const duration = await readDuration(job.file);
        if (duration != null && duration > MAX_SECONDS) {
          patch(job.key, { state: "failed", errorKey: "errTooLong", duration });
          continue;
        }
        patch(job.key, { duration });
        const summary = await readAudioSummary(job.file);
        if (summary) patch(job.key, { peaks: summary.peaks, duration: summary.duration });
      }
    },
    [patch],
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      const files = Array.from(event.dataTransfer.files ?? []);
      if (files.length) void addFiles(files);
    },
    [addFiles],
  );

  const ready = jobs.filter((job) => job.state === "ready");

  async function startAll() {
    if (busy || ready.length === 0) return;
    setBusy(true);
    setBlocker(null);

    // Sequential: several large uploads at once would starve each other and
    // make every progress bar meaningless.
    for (const job of ready) {
      patch(job.key, { state: "uploading", progress: 0 });
      try {
        const call = await uploadCall(
          {
            file: job.file,
            companyId,
            sellerId: sellerId || null,
            clientName: clientName || null,
            diarize,
          },
          { onProgress: (fraction) => patch(job.key, { progress: fraction }) },
        );
        patch(job.key, {
          state: "processing",
          progress: 1,
          callId: call.id,
          status: call.status,
        });
      } catch (error) {
        const apiError = toApiError(error);
        patch(job.key, { state: "failed", errorKey: "errUpload" });
        if (apiError.kind === "limit" || apiError.kind === "not_found") {
          setBlocker(apiError);
          break;
        }
      }
    }

    setBusy(false);
  }

  const pendingIds = useMemo(
    () =>
      jobs
        .filter((job) => job.callId && job.state === "processing")
        .map((job) => job.callId as string),
    [jobs],
  );

  const loadTranscript = useCallback(
    async (key: string, callId: string) => {
      const transcript = await fetchTranscript(callId).catch(() => null);
      patch(key, { transcript });
    },
    [patch],
  );

  useStatusPolling(pendingIds, (status) => {
    setJobs((current) =>
      current.map((job) => {
        if (job.callId !== status.id) return job;
        if (job.status === status.status && !isSettled(status.status)) return job;
        if (status.status === "done") void loadTranscript(job.key, status.id);
        return {
          ...job,
          status: status.status,
          state: status.status === "failed" ? "failed" : isSettled(status.status) ? "done" : "processing",
          errorKey: status.status === "failed" ? "errUpload" : job.errorKey,
        };
      }),
    );
  });

  return (
    <div className="py-6 sm:py-8">
      <header className="mb-6">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">{t("title")}</h2>
        <p className="mt-1 max-w-2xl text-[14px] text-ink-2">{t("subtitle")}</p>
      </header>

      {blocker ? (
        <Notice
          className="mb-5"
          tone="warning"
          title={tUpload("title")}
          body={t("errUpload")}
          action={
            <Link href="/settings" className="text-[13px] font-medium text-accent">
              {tUpload("title")}
            </Link>
          }
        />
      ) : null}

      <div className="card p-4 sm:p-5">
        <div
          role="tablist"
          aria-label={t("title")}
          className="mb-4 inline-flex rounded-control bg-raised p-0.5"
        >
          {(["upload", "record"] as const).map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`rounded-[8px] px-3.5 py-1.5 text-[13px] transition-colors duration-150 ${
                tab === key ? "bg-canvas font-medium text-ink shadow-sm" : "text-ink-2 hover:text-ink"
              }`}
            >
              {t(key === "upload" ? "tabUpload" : "tabRecord")}
            </button>
          ))}
        </div>

        {tab === "upload" ? (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-card border border-dashed px-6 py-12 text-center transition-colors duration-150 ${
              dragging ? "border-accent bg-accent-soft" : "border-line-strong hover:bg-hover"
            }`}
          >
            <span
              aria-hidden="true"
              className="mx-auto grid size-11 place-items-center rounded-full bg-accent-soft text-accent"
            >
              <IconUpload />
            </span>
            <p className="mt-3.5 text-[15px] font-medium text-ink">
              {dragging ? t("dropActive") : t("dropTitle")}
            </p>
            <p className="mt-1 text-[13px] text-ink-2">{t("dropHint")}</p>
            <p className="mt-3 font-mono text-[11px] text-ink-3">{t("formats")}</p>
            <p className="mt-1 text-[11px] text-ink-3">{t("limits")}</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED_AUDIO_ACCEPT}
              className="sr-only"
              aria-label={t("choose")}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                if (files.length) void addFiles(files);
                event.target.value = "";
              }}
            />
          </div>
        ) : (
          <Recorder onRecorded={(file) => void addFiles([file])} />
        )}

        <p className="mt-3 text-[12px] text-ink-3">{t("autoLanguage")}</p>

        <div className="mt-4 border-t border-divider pt-4">
          <button
            type="button"
            onClick={() => setShowOptions((v) => !v)}
            aria-expanded={showOptions}
            className="text-[13px] font-medium text-accent hover:opacity-75"
          >
            {t("options")}
          </button>

          {showOptions ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="stt-seller" className="mb-1.5 block text-[13px] text-ink-2">
                  {tUpload("seller")}
                </Label>
                <Select
                  id="stt-seller"
                  value={sellerId}
                  onChange={(event) => setSellerId(event.target.value)}
                >
                  <option value="">{tUpload("sellerNone")}</option>
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.full_name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="stt-client" className="mb-1.5 block text-[13px] text-ink-2">
                  {tUpload("clientName")}
                </Label>
                <TextInput
                  id="stt-client"
                  value={clientName}
                  placeholder={tUpload("clientNamePlaceholder")}
                  onChange={(event) => setClientName(event.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <ToggleSwitch checked={diarize} label={tUpload("diarize")} onChange={setDiarize} />
                <p className="mt-2 text-[13px] text-ink-2">{tUpload("diarizeHint")}</p>
              </div>
            </div>
          ) : null}
        </div>

        {jobs.length > 0 ? (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-divider pt-4">
            <Button tone="primary" disabled={busy || ready.length === 0} onClick={() => void startAll()}>
              {busy ? t("starting") : t("start")}
            </Button>
            <Button onClick={() => setJobs([])} disabled={busy}>
              {t("clear")}
            </Button>
          </div>
        ) : null}
      </div>

      <section className="mt-6">
        <h3 className="mb-3 text-[13px] font-medium text-ink-3">{t("queueTitle")}</h3>
        {jobs.length === 0 ? (
          <p className="card px-5 py-8 text-center text-[13px] text-ink-3">{t("queueEmpty")}</p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard
                key={job.key}
                job={job}
                locale={locale}
                statusLabel={job.status ? tStatus(job.status) : null}
                onRemove={() => setJobs((c) => c.filter((j) => j.key !== job.key))}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function JobCard({
  job,
  locale,
  statusLabel,
  onRemove,
}: {
  job: Job;
  locale: string;
  statusLabel: string | null;
  onRemove: () => void;
}) {
  const t = useTranslations("stt");
  const tRoles = useTranslations("roles");
  const [copied, setCopied] = useState(false);

  const speakers = useMemo(
    () => resolveSpeakers(job.transcript?.dialog, job.transcript?.talk_ratio),
    [job.transcript],
  );

  const stateLabel =
    job.state === "ready"
      ? t("stateReady")
      : job.state === "uploading"
        ? t("stateUploading")
        : job.state === "failed"
          ? t("stateFailed")
          : (statusLabel ?? t("stateWaiting"));

  const text = job.transcript?.full_text ?? "";

  return (
    <article className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-ink">{job.file.name}</p>
          <p className="tnum mt-0.5 text-[12px] text-ink-3">
            {formatBytes(job.file.size, locale)}
            {job.duration ? ` · ${mmss(job.duration)}` : ""}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            job.state === "failed"
              ? "bg-[color-mix(in_srgb,var(--red)_12%,transparent)] text-red-text"
              : job.state === "done"
                ? "bg-[color-mix(in_srgb,var(--green)_14%,transparent)] text-green"
                : "bg-raised text-ink-2"
          }`}
        >
          {stateLabel}
        </span>
        {job.state === "ready" || job.state === "failed" ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t("remove", { name: job.file.name })}
            className="shrink-0 rounded-control p-1 text-ink-3 hover:text-ink"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>

      {job.peaks ? <Waveform peaks={job.peaks} className="mt-3" height={38} /> : null}

      {job.state === "uploading" ? (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-raised">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-200"
            style={{ width: `${Math.round(job.progress * 100)}%` }}
          />
        </div>
      ) : null}

      {job.errorKey ? (
        <p role="alert" className="mt-3 text-[13px] text-red-text">
          {t(job.errorKey)}
        </p>
      ) : null}

      {job.state === "done" && job.transcript ? (
        <div className="mt-4 border-t border-divider pt-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-[13px] font-medium text-ink">{t("resultTitle")}</p>
            {job.transcript.words_count ? (
              <span className="tnum text-[12px] text-ink-3">
                {t("words", { count: job.transcript.words_count })}
              </span>
            ) : null}
            {speakers.ratio ? (
              <span className="tnum text-[12px] text-ink-3">
                <span style={{ color: "var(--red-voice)" }}>●</span> {tRoles("salesperson")}{" "}
                {speakers.ratio.seller}% ·{" "}
                <span style={{ color: "var(--blue-voice)" }}>●</span> {tRoles("client")}{" "}
                {speakers.ratio.client}%
              </span>
            ) : null}
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  void navigator.clipboard?.writeText(text).then(() => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                  });
                }}
              >
                {copied ? t("copied") : t("copy")}
              </Button>
              {job.callId ? (
                <Link
                  href={`/calls/${job.callId}`}
                  className="inline-flex h-8 items-center rounded-control border border-line px-2.5 text-[13px] font-medium text-ink hover:bg-hover"
                >
                  {t("openCall")}
                </Link>
              ) : null}
            </div>
          </div>
          <p className="mt-3 max-h-56 overflow-y-auto rounded-control bg-tint p-3 text-[13px] leading-relaxed whitespace-pre-wrap text-ink">
            {text}
          </p>
        </div>
      ) : null}
    </article>
  );
}
