import type { CSSProperties } from "react";

/**
 * "SalesPulse" with the `l` of "Sales" replaced by an ECG trace in the
 * salesperson red. The SVG is sized in `em`, so the mark scales with whatever
 * font size it is dropped into and inherits colour for the letters.
 */
export function Wordmark({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`font-display inline-flex items-baseline font-semibold tracking-tight whitespace-nowrap ${className}`}
      style={style}
    >
      <span aria-hidden="true">Sa</span>
      <svg
        viewBox="0 0 12 26"
        role="img"
        aria-label="SalesPulse"
        focusable="false"
        style={{
          height: "1.02em",
          width: "0.46em",
          verticalAlign: "-0.06em",
          marginInline: "0.015em",
          flex: "none",
        }}
        fill="none"
      >
        <path
          d="M0.6 24H3.3L4.4 20.4L5.9 2.6L7.4 22.6L8.4 24H11.4"
          stroke="var(--red-voice)"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span aria-hidden="true">esPulse</span>
    </span>
  );
}

export default Wordmark;
