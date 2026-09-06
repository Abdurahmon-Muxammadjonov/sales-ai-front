import type { ReactNode } from "react";

/**
 * Window chrome around a live piece of the product. It reads as a screenshot,
 * but what is inside is the real component tree — so it follows the theme,
 * reflows on a phone, and can never show a version of the UI that no longer
 * exists.
 */
export function BrowserFrame({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-card border border-line bg-canvas shadow-[0_12px_40px_-12px_rgba(0,0,0,.22)] transition-shadow duration-300 hover:shadow-[0_20px_56px_-16px_rgba(0,0,0,.3)] ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-line bg-raised px-3.5 py-2.5">
        <span aria-hidden="true" className="flex gap-1.5">
          {["#ff5f57", "#febc2e", "#28c840"].map((color) => (
            <span key={color} className="size-2.5 rounded-full" style={{ background: color }} />
          ))}
        </span>
        <span className="ml-1.5 truncate font-mono text-[11px] text-ink-3">{label}</span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

export default BrowserFrame;
