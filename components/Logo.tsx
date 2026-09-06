import type { CSSProperties } from "react";

/**
 * The brand mark: a black tile with a red pulse trace through it — the same
 * drawing as the favicon, so the browser tab and the sidebar agree. The tile
 * stays black in both themes (a mark that changes colour stops being a mark);
 * in dark mode a hairline keeps it from dissolving into the background.
 */
export function Logo({
  className = "",
  showText = true,
  size = 28,
  style,
}: {
  className?: string;
  showText?: boolean;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} style={style}>
      <span
        aria-hidden="true"
        className="grid shrink-0 place-items-center rounded-[8px] ring-white/12 dark:ring-1"
        style={{ width: size, height: size, background: "#0a0a0b" }}
      >
        <svg
          width={size * 0.74}
          height={size * 0.74}
          viewBox="0 0 32 32"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 20h4.4l2-5.2L15.6 26l4.1-20 3.4 14H27"
            stroke="var(--red)"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {showText ? (
        <span className="font-display text-[15px] font-semibold tracking-[-0.02em] whitespace-nowrap text-ink">
          SalesPulse AI
        </span>
      ) : null}
    </span>
  );
}

export default Logo;
