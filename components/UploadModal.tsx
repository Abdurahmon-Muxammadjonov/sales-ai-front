"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import {
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  TextInput,
  ToggleSwitch,
} from "flowbite-react";
import { Link } from "@/i18n/navigation";
import {
  ACCEPTED_AUDIO_ACCEPT,
  ApiError,
  MAX_UPLOAD_BYTES,
  hasAcceptedExtension,
  toApiError,
  uploadCall,
} from "@/lib/api";
import { formatBytes } from "@/lib/format";
import type { CallStatusResponse, Seller } from "@/lib/types";
import { Button, Notice } from "./ui";

type ItemState = "queued" | "uploading" | "sent" | "failed";

interface QueueItem {
  key: string;
  file: File;
  state: ItemState;
  progress: number;
  errorKind: ApiError["kind"] | "file_type" | null;
}

let keySeed = 0;

export function UploadModal({
  open,
  onClose,
  locale,
  companyId,
  hoursLimit,
  sellers,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  locale: string;
  companyId: string;
  hoursLimit: number | null;
  sellers: Seller[];
  onUploaded: (call: CallStatusResponse, meta: { sellerId: string | null; clientName: string | null }) => void;
}) {
  const t = useTranslations("upload");
  const tErrors = useTranslations("errors");
  const tCommon = useTranslations("common");

  const [items, setItems] = useState<QueueItem[]>([]);
  const [sellerId, setSellerId] = useState("");
  const [clientName, setClientName] = useState("");
  const [diarize, setDiarize] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [blocker, setBlocker] = useState<ApiError | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) return;
    // Reset only once the modal is fully dismissed, so the closing frame does
    // not flash an empty queue.
    const timer = window.setTimeout(() => {
      setItems([]);
      setClientName("");
      setBusy(false);
      setBlocker(null);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [open]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const next: QueueItem[] = [];
    for (const file of Array.from(files)) {
      const tooLarge = file.size > MAX_UPLOAD_BYTES;
      const wrongType = !hasAcceptedExtension(file.name);
      next.push({
        key: `f${++keySeed}`,
        file,
        state: tooLarge || wrongType ? "failed" : "queued",
        progress: 0,
        errorKind: wrongType ? "file_type" : tooLarge ? "too_large" : null,
      });
    }
    setItems((current) => [...current, ...next]);
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      if (event.dataTransfer.files?.length) addFiles(event.dataTransfer.files);
    },
    [addFiles],
  );

  const pending = items.filter((item) => item.state === "queued");

  async function startUpload() {
    if (busy || pending.length === 0) return;
    setBusy(true);
    setBlocker(null);

    // Sequential on purpose: several 200 MB files in parallel would starve the
    // connection and make every progress bar useless.
    for (const item of pending) {
      setItems((current) =>
        current.map((entry) =>
          entry.key === item.key ? { ...entry, state: "uploading", progress: 0 } : entry,
        ),
      );

      try {
        const call = await uploadCall(
          {
            file: item.file,
            companyId,
            sellerId: sellerId || null,
            clientName: clientName || null,
            diarize,
          },
          {
            onProgress: (fraction) =>
              setItems((current) =>
                current.map((entry) =>
                  entry.key === item.key ? { ...entry, progress: fraction } : entry,
                ),
              ),
          },
        );

        setItems((current) =>
          current.map((entry) =>
            entry.key === item.key ? { ...entry, state: "sent", progress: 1 } : entry,
          ),
        );
        onUploaded(call, { sellerId: sellerId || null, clientName: clientName || null });
      } catch (error) {
        const apiError = toApiError(error);
        setItems((current) =>
          current.map((entry) =>
            entry.key === item.key
              ? { ...entry, state: "failed", errorKind: apiError.kind }
              : entry,
          ),
        );
        // A spent monthly allowance or a missing company stops the whole queue:
        // the next file would fail the same way.
        if (apiError.kind === "limit" || apiError.kind === "not_found") {
          setBlocker(apiError);
          break;
        }
      }
    }

    setBusy(false);
  }

  const allSent = items.length > 0 && items.every((item) => item.state === "sent");

  return (
    <Modal show={open} onClose={onClose} size="xl" dismissible>
      <ModalHeader>{t("title")}</ModalHeader>
      <ModalBody className="space-y-5">
        {blocker ? <BlockerNotice error={blocker} hoursLimit={hoursLimit} /> : null}

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`rounded-card border border-dashed p-6 text-center transition-colors ${
            dragging ? "border-ink bg-raised" : "border-line"
          }`}
        >
          <p className="text-sm font-medium text-ink">
            {dragging ? t("dropzoneActive") : t("dropzone")}
          </p>
          <p className="mt-1 text-sm text-ink-2">{t("dropzoneHint")}</p>
          <Button className="mt-4" onClick={() => inputRef.current?.click()}>
            {t("chooseFiles")}
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_AUDIO_ACCEPT}
            className="sr-only"
            aria-label={t("chooseFiles")}
            onChange={(event) => {
              if (event.target.files?.length) addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="upload-seller" className="mb-1.5 block text-sm text-ink-2">
              {t("seller")}
            </Label>
            <Select
              id="upload-seller"
              value={sellerId}
              onChange={(event) => setSellerId(event.target.value)}
            >
              <option value="">{t("sellerNone")}</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.full_name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="upload-client" className="mb-1.5 block text-sm text-ink-2">
              {t("clientName")}
            </Label>
            <TextInput
              id="upload-client"
              value={clientName}
              placeholder={t("clientNamePlaceholder")}
              onChange={(event) => setClientName(event.target.value)}
            />
          </div>
        </div>

        <div className="rounded-card border border-line p-4">
          <ToggleSwitch checked={diarize} label={t("diarize")} onChange={setDiarize} />
          <p className="mt-2 text-sm text-ink-2">{t("diarizeHint")}</p>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-medium text-ink">{t("queueTitle")}</h3>
            <p className="text-xs text-ink-3">{t("sequentialNote")}</p>
          </div>
          {items.length === 0 ? (
            <p className="mt-2 border-t border-line pt-3 text-sm text-ink-3">
              {t("noFiles")}
            </p>
          ) : (
            <ul className="mt-2 border-t border-line">
              {items.map((item) => (
                <li
                  key={item.key}
                  className="flex items-center gap-3 border-b border-line py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{item.file.name}</p>
                    <p className="tnum text-xs text-ink-3">
                      {formatBytes(item.file.size, locale)}
                      {item.state === "uploading"
                        ? ` · ${Math.round(item.progress * 100)}%`
                        : ""}
                    </p>
                    {item.state === "uploading" ? (
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line">
                        <div
                          className="h-full bg-ink transition-[width] duration-200"
                          style={{ width: `${Math.round(item.progress * 100)}%` }}
                        />
                      </div>
                    ) : null}
                    {item.state === "failed" && item.errorKind ? (
                      <p className="mt-1 text-xs text-red-text">
                        {errorSentence(item.errorKind, tErrors)}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`shrink-0 text-xs ${
                      item.state === "failed" ? "text-red-text" : "text-ink-2"
                    }`}
                  >
                    {t(item.state === "queued" ? "queued" : item.state)}
                  </span>
                  {item.state === "queued" ? (
                    <button
                      type="button"
                      className="shrink-0 rounded-control p-1 text-ink-3 hover:text-ink"
                      aria-label={t("removeFile", { name: item.file.name })}
                      onClick={() =>
                        setItems((current) =>
                          current.filter((entry) => entry.key !== item.key),
                        )
                      }
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M6 6l12 12M18 6L6 18"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {allSent ? <p className="mt-3 text-sm text-ink-2">{t("doneAll")}</p> : null}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button tone="primary" disabled={busy || pending.length === 0} onClick={() => void startUpload()}>
          {busy ? t("starting") : t("start")}
        </Button>
        <Button onClick={onClose}>{tCommon("close")}</Button>
      </ModalFooter>
    </Modal>
  );
}

function errorSentence(
  kind: ApiError["kind"] | "file_type",
  t: ReturnType<typeof useTranslations<"errors">>,
): string {
  switch (kind) {
    case "file_type":
      return t("fileType");
    case "too_large":
      return t("fileTooLarge");
    case "limit":
      return t("limitTitle");
    case "not_found":
      return t("companyNotFound");
    case "server":
      return t("server");
    case "network":
      return t("network");
    default:
      return t("unknown");
  }
}

function BlockerNotice({
  error,
  hoursLimit,
}: {
  error: ApiError;
  hoursLimit: number | null;
}) {
  const t = useTranslations("errors");
  const limit = error.limit ?? hoursLimit;

  if (error.kind === "not_found") {
    return <Notice tone="warning" title={t("companyNotFound")} body={t("supportHint")} />;
  }

  return (
    <Notice
      tone="warning"
      title={t("limitTitle")}
      body={limit != null ? t("limitBody", { limit }) : t("limitBodyNoLimit")}
      action={
        <Link
          href="/settings"
          className="text-sm font-medium text-ink underline underline-offset-4"
        >
          {t("limitAction")}
        </Link>
      }
    />
  );
}

export default UploadModal;
