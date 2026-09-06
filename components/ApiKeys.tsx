"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Label, Modal, ModalBody, ModalFooter, ModalHeader, TextInput } from "flowbite-react";
import { createApiKey, fetchApiKeys, revokeApiKey, type ApiKey } from "@/lib/apiKeys";
import { useDateFormat } from "@/lib/useDateFormat";
import { Button, Notice, SectionTitle, Skeleton } from "./ui";

export function ApiKeys({
  companyId,
  userId,
  origin,
}: {
  companyId: string;
  userId: string;
  origin: string;
}) {
  const t = useTranslations("apiKeys");
  const dates = useDateFormat();

  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchApiKeys(companyId)
      .then((data) => {
        if (!cancelled) setKeys(data);
      })
      .catch(() => {
        if (!cancelled) {
          setKeys([]);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  async function onRevoke(id: string) {
    setBusyId(id);
    try {
      await revokeApiKey(id);
      const now = new Date().toISOString();
      setKeys((current) =>
        (current ?? []).map((key) => (key.id === id ? { ...key, revoked_at: now } : key)),
      );
    } catch {
      setFailed(true);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionTitle hint={t("hint")}>{t("title")}</SectionTitle>
        <Button tone="primary" onClick={() => setOpen(true)}>
          {t("create")}
        </Button>
      </div>

      {failed ? <Notice className="mb-4" tone="warning" title={t("revokeFailed")} /> : null}

      {keys === null ? (
        <div className="border-t border-line" aria-hidden="true">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="border-b border-line py-4">
              <Skeleton className="h-4 w-56" />
            </div>
          ))}
        </div>
      ) : keys.length === 0 ? (
        <p className="border-t border-line pt-4 text-sm text-ink-3">{t("empty")}</p>
      ) : (
        <ul className="border-t border-line">
          {keys.map((key) => {
            const revoked = Boolean(key.revoked_at);
            return (
              <li
                key={key.id}
                className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className={`font-medium ${revoked ? "text-ink-3 line-through" : "text-ink"}`}>
                    {key.name}
                  </p>
                  <p className="tnum mt-0.5 truncate font-mono text-xs text-ink-3">
                    {key.prefix}…
                  </p>
                </div>
                <div className="tnum text-xs text-ink-3">
                  <p>{dates.date(key.created_at)}</p>
                  <p>
                    {key.last_used_at ? dates.dateTime(key.last_used_at) : t("neverUsed")}
                  </p>
                </div>
                {revoked ? (
                  <span className="text-sm text-ink-3">{t("revoked")}</span>
                ) : (
                  <Button
                    size="sm"
                    disabled={busyId === key.id}
                    onClick={() => void onRevoke(key.id)}
                  >
                    {busyId === key.id ? t("revoking") : t("revoke")}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Docs origin={origin} />

      <CreateKeyModal
        open={open}
        onClose={() => setOpen(false)}
        companyId={companyId}
        userId={userId}
        onCreated={(row) => setKeys((current) => [row, ...(current ?? [])])}
      />
    </section>
  );
}

function Docs({ origin }: { origin: string }) {
  const t = useTranslations("apiKeys");
  const base = origin || "https://your-app.vercel.app";

  return (
    <div className="mt-8 rounded-card border border-line p-4">
      <h3 className="font-display text-base font-semibold tracking-tight">
        {t("docsTitle")}
      </h3>
      <p className="mt-2 text-sm text-ink-2">{t("docsAsync")}</p>

      <p className="mt-4 text-sm text-ink-2">{t("docsSend")}</p>
      <pre className="mt-2 overflow-x-auto rounded-control bg-raised p-3 text-xs leading-relaxed text-ink">
{`curl -X POST ${base}/api/v1/calls \\
  -H "Authorization: Bearer sp_YOUR_KEY" \\
  -F "file=@call.mp3" \\
  -F "client_name=Jahongir"

# → {"id":"7ea8c82a-…","status":"pending"}`}
      </pre>

      <p className="mt-4 text-sm text-ink-2">{t("docsPoll")}</p>
      <pre className="mt-2 overflow-x-auto rounded-control bg-raised p-3 text-xs leading-relaxed text-ink">
{`curl ${base}/api/v1/calls/7ea8c82a-… \\
  -H "Authorization: Bearer sp_YOUR_KEY"

# → {"call":{"status":"done",…},"transcript":{…},"analysis":{…}}`}
      </pre>

      <p className="mt-4 text-[13px] leading-relaxed text-ink-2">{t("docsLimit")}</p>
      <p className="mt-3 text-[13px] leading-relaxed text-red-text">{t("docsServerOnly")}</p>
    </div>
  );
}

/**
 * Creation and the one-time reveal live in the same modal. The key is held in
 * component state and nowhere else — closing the modal is what destroys it,
 * which is why the dismiss button says "saved it" rather than "close".
 */
function CreateKeyModal({
  open,
  onClose,
  companyId,
  userId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  companyId: string;
  userId: string;
  onCreated: (row: ApiKey) => void;
}) {
  const t = useTranslations("apiKeys");
  const tCommon = useTranslations("common");

  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [issued, setIssued] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) return;
    const timer = window.setTimeout(() => {
      setName("");
      setIssued(null);
      setErrorKey(null);
      setCopied(false);
      setBusy(false);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [open]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const clean = name.trim();
    if (busy) return;
    if (!clean) {
      setErrorKey("nameRequired");
      return;
    }
    setBusy(true);
    setErrorKey(null);
    try {
      const { key, row } = await createApiKey(companyId, userId, clean);
      onCreated(row);
      setIssued(key);
    } catch {
      setErrorKey("createFailed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal show={open} onClose={onClose} size="lg" dismissible={!issued}>
      <ModalHeader>{issued ? t("newKeyTitle") : t("create")}</ModalHeader>

      {issued ? (
        <>
          <ModalBody className="space-y-4">
            <Notice tone="warning" title={t("newKeyTitle")} body={t("newKeyWarning")} />
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-control border border-line bg-raised px-3 py-2.5 font-mono text-sm text-ink">
                {issued}
              </code>
              <Button
                tone="primary"
                onClick={() => {
                  void navigator.clipboard?.writeText(issued).then(() => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                  });
                }}
              >
                {copied ? t("copied") : t("copy")}
              </Button>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button tone="primary" onClick={onClose}>
              {t("done")}
            </Button>
          </ModalFooter>
        </>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <ModalBody>
            <Label htmlFor="key-name" className="mb-1.5 block text-sm text-ink-2">
              {t("nameLabel")}
            </Label>
            <TextInput
              id="key-name"
              value={name}
              autoFocus
              maxLength={60}
              placeholder={t("namePlaceholder")}
              onChange={(event) => setName(event.target.value)}
            />
            <p className="mt-2 text-sm text-ink-3">{t("nameHint")}</p>
            {errorKey ? (
              <p role="alert" className="mt-2 text-sm text-red-text">
                {t(errorKey)}
              </p>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button type="submit" tone="primary" disabled={busy}>
              {busy ? t("creating") : t("createSubmit")}
            </Button>
            <Button onClick={onClose}>{tCommon("cancel")}</Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export default ApiKeys;
