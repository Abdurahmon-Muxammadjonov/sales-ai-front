"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Badge, Label, TextInput } from "flowbite-react";
import { useSession } from "@/components/SessionProvider";
import { ApiKeys } from "@/components/ApiKeys";
import { Button, Notice, PageHeader, SectionTitle, Skeleton } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { createSeller, fetchSellers, updateSeller } from "@/lib/queries";
import type { Seller } from "@/lib/types";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tRoles = useTranslations("roles");
  const locale = useLocale();
  const { company, companyId, profile, isOwner, user } = useSession();

  // The docs block prints real curl commands, so it needs the deployed origin
  // rather than a placeholder. Only known in the browser.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const [sellers, setSellers] = useState<Seller[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSellers(companyId)
      .then((data) => {
        if (!cancelled) setSellers(data);
      })
      .catch(() => {
        if (!cancelled) {
          setSellers([]);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const used = Number(company?.hours_used ?? 0);
  const limit = Number(company?.hours_limit ?? 0);
  const fraction = limit > 0 ? Math.min(1, used / limit) : 0;
  const nearLimit = fraction > 0.9;

  return (
    <>
      <PageHeader title={t("title")} meta={t("subtitle")} />

      <section className="card mb-4 p-5 sm:p-6">
        <SectionTitle hint={t("companyHint")}>{t("company")}</SectionTitle>

        <dl className="grid gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-[13px] text-ink-3">{t("companyName")}</dt>
            <dd className="mt-1 font-medium text-ink">
              {company ? company.name : <Skeleton className="h-5 w-40" />}
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-ink-3">{t("tariff")}</dt>
            <dd className="mt-1 font-medium text-ink">
              {company ? (
                t(
                  company.tariff === "pro"
                    ? "tariffPro"
                    : company.tariff === "enterprise"
                      ? "tariffEnterprise"
                      : "tariffStart",
                )
              ) : (
                <Skeleton className="h-5 w-20" />
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-7 max-w-xl border-t border-divider pt-5">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-[13px] font-medium text-ink">{t("usage")}</p>
            <p className="tnum font-mono text-[13px] text-ink">
              {t("usageValue", {
                used: formatNumber(used, locale, 1),
                limit: formatNumber(limit, locale, 0),
              })}
            </p>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={limit || 100}
            aria-valuenow={Math.round(used)}
            aria-label={t("usage")}
          >
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{
                width: `${Math.round(fraction * 100)}%`,
                backgroundColor: nearLimit ? "var(--red)" : "var(--accent)",
              }}
            />
          </div>
          {limit > 0 ? (
            <p className="tnum mt-2 text-[12px] text-ink-3">
              {t("usageLeft", { left: formatNumber(Math.max(0, limit - used), locale, 1) })}
            </p>
          ) : null}
          <p className="mt-3 text-[13px] leading-relaxed text-ink-2">{t("usageHint")}</p>
          {fraction >= 1 ? (
            <p className="mt-3 text-[13px] font-medium text-red-text">{t("usageFull")}</p>
          ) : nearLimit ? (
            <p className="mt-3 text-[13px] font-medium text-red-text">{t("usageNearLimit")}</p>
          ) : null}
        </div>
      </section>

      <section className="card mb-4 p-5 sm:p-6">
        <SectionTitle hint={t("sellersHint")}>{t("sellersTitle")}</SectionTitle>

        {failed ? (
          <Notice className="mb-4" tone="warning" title={t("saveFailed")} />
        ) : null}

        {!isOwner ? (
          <Notice
            className="mb-6"
            title={t("ownerOnlyTitle")}
            body={t("ownerOnlyBody", { role: tRoles(profile.role) })}
          />
        ) : (
          <AddSellerForm
            companyId={companyId}
            onAdded={(seller) =>
              setSellers((current) =>
                [...(current ?? []), seller].sort((a, b) =>
                  a.full_name.localeCompare(b.full_name, locale),
                ),
              )
            }
            onError={() => setFailed(true)}
          />
        )}

        {sellers === null ? (
          <div className="mt-6 border-t border-line" aria-hidden="true">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="border-b border-line py-4">
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        ) : sellers.length === 0 ? (
          <p className="mt-6 border-t border-line pt-4 text-sm text-ink-3">
            {t("noSellers")}
          </p>
        ) : (
          <ul className="mt-6 border-t border-line">
            {sellers.map((seller) => (
              <SellerRow
                key={seller.id}
                seller={seller}
                editable={isOwner}
                onChanged={(patch) =>
                  setSellers((current) =>
                    (current ?? []).map((row) =>
                      row.id === seller.id ? { ...row, ...patch } : row,
                    ),
                  )
                }
                onError={() => setFailed(true)}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Credentials are owner-only: a manager who can read every call still
          should not be able to mint access that outlives their own. */}
      {isOwner ? (
        <div className="card p-5 sm:p-6">
          <ApiKeys companyId={companyId} userId={user.id} origin={origin} />
        </div>
      ) : null}
    </>
  );
}

function AddSellerForm({
  companyId,
  onAdded,
  onError,
}: {
  companyId: string;
  onAdded: (seller: Seller) => void;
  onError: () => void;
}) {
  const t = useTranslations("settings");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const name = fullName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      onAdded(await createSeller(companyId, name, phone.trim() || null));
      setFullName("");
      setPhone("");
    } catch {
      onError();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-wrap items-end gap-3 rounded-card border border-line p-4"
    >
      <div className="min-w-48 flex-1">
        <Label htmlFor="seller-name" className="mb-1.5 block text-sm text-ink-2">
          {t("sellerName")}
        </Label>
        <TextInput
          id="seller-name"
          value={fullName}
          required
          onChange={(event) => setFullName(event.target.value)}
        />
      </div>
      <div className="min-w-44 flex-1">
        <Label htmlFor="seller-phone" className="mb-1.5 block text-sm text-ink-2">
          {t("sellerPhone")}
        </Label>
        <TextInput
          id="seller-phone"
          type="tel"
          value={phone}
          placeholder={t("sellerPhonePlaceholder")}
          onChange={(event) => setPhone(event.target.value)}
        />
      </div>
      <Button type="submit" tone="primary" disabled={busy || !fullName.trim()}>
        {t("add")}
      </Button>
    </form>
  );
}

function SellerRow({
  seller,
  editable,
  onChanged,
  onError,
}: {
  seller: Seller;
  editable: boolean;
  onChanged: (patch: Partial<Seller>) => void;
  onError: () => void;
}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(seller.full_name);
  const [busy, setBusy] = useState(false);

  async function save() {
    const name = draft.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await updateSeller(seller.id, { full_name: name });
      onChanged({ full_name: name });
      setEditing(false);
    } catch {
      onError();
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    setBusy(true);
    try {
      await updateSeller(seller.id, { active: !seller.active });
      onChanged({ active: !seller.active });
    } catch {
      onError();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-line py-3.5">
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex flex-wrap items-center gap-2">
            <TextInput
              value={draft}
              sizing="sm"
              aria-label={t("sellerName")}
              onChange={(event) => setDraft(event.target.value)}
            />
            <Button size="sm" tone="primary" disabled={busy} onClick={() => void save()}>
              {tCommon("save")}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setDraft(seller.full_name);
                setEditing(false);
              }}
            >
              {tCommon("cancel")}
            </Button>
          </div>
        ) : (
          <>
            <p className="flex items-center gap-2 truncate font-medium text-ink">
              {seller.full_name}
              {!seller.active ? (
                <Badge color="gray" className="rounded-full">
                  {t("inactive")}
                </Badge>
              ) : null}
            </p>
            {seller.phone ? (
              <p className="tnum mt-0.5 text-sm text-ink-3">{seller.phone}</p>
            ) : null}
          </>
        )}
      </div>

      {editable && !editing ? (
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setEditing(true)}>
            {t("rename")}
          </Button>
          <Button size="sm" disabled={busy} onClick={() => void toggleActive()}>
            {seller.active ? t("deactivate") : t("activate")}
          </Button>
        </div>
      ) : null}
    </li>
  );
}
