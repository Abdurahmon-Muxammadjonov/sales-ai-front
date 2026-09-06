"use client";

import type { ReactNode } from "react";

/** Page title row. Actions sit on the right and wrap below on narrow screens. */
export function PageHeader({
  title,
  actions,
  meta,
}: {
  title: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 py-6 sm:py-8">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink sm:text-[26px]">
          {title}
        </h1>
        {meta ? <div className="mt-1 text-sm text-ink-2">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

/** A named space, not "Nothing here yet." */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-t border-line py-16 text-center sm:py-24">
      <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-2">{body}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

/**
 * Says what happened and what to do. A failure gets the red voice colour as a
 * hairline and nothing more — a red fill at this size would read as a brand
 * surface rather than a warning, and red already means "salesperson".
 */
export function Notice({
  tone = "neutral",
  title,
  body,
  action,
  className = "",
}: {
  tone?: "neutral" | "warning";
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "warning" ? "alert" : undefined}
      className={`rounded-card border px-4 py-3.5 ${
        tone === "warning"
          ? "border-[color-mix(in_srgb,var(--red)_40%,transparent)] bg-[color-mix(in_srgb,var(--red)_5%,var(--canvas))]"
          : "border-line bg-raised"
      } ${className}`}
    >
      <p className="text-sm font-medium text-ink">{title}</p>
      {body ? <div className="mt-1 text-sm text-ink-2">{body}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-control text-[13px] font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40";

const BUTTON_TONE = {
  primary: "bg-accent-fill text-white hover:bg-accent-hover active:scale-[.98]",
  secondary: "border border-line bg-canvas text-ink hover:bg-hover active:scale-[.98]",
  ghost: "text-ink-2 hover:bg-hover hover:text-ink",
  danger: "border border-line bg-canvas text-red-text hover:bg-[color-mix(in_srgb,var(--red)_8%,transparent)]",
} as const;

const BUTTON_SIZE = {
  sm: "h-8 px-3",
  md: "h-9 px-4",
} as const;

export function Button({
  tone = "secondary",
  size = "md",
  className = "",
  type = "button",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: keyof typeof BUTTON_TONE;
  size?: keyof typeof BUTTON_SIZE;
}) {
  return (
    <button
      type={type}
      className={`${BUTTON_BASE} ${BUTTON_TONE[tone]} ${BUTTON_SIZE[size]} ${className}`}
      {...rest}
    />
  );
}

/** Bordered rows, not cards — the list idiom used across the product. */
export function RowList({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-line" role="list" aria-label={label}>
      {children}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <div className="border-t border-line" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 border-b border-line px-1 py-4"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="hidden h-1.5 w-48 rounded-full sm:block" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Section heading used down the call detail page and in settings. */
export function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-ink">{children}</h2>
      {hint ? <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{hint}</p> : null}
    </div>
  );
}

export function StatusDot({ tone }: { tone: "working" | "failed" | "done" }) {
  const color =
    tone === "failed"
      ? "var(--red-voice)"
      : tone === "done"
        ? "var(--ink-3)"
        : "var(--ink-2)";
  return (
    <span
      aria-hidden="true"
      className="inline-block size-1.5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}
