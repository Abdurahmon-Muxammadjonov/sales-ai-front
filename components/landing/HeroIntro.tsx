"use client";

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * The hero is on screen the moment the page loads, so it plays on mount rather
 * than on scroll.
 *
 * Like Reveal, it starts visible and is only hidden once JavaScript has run.
 * This is the page's headline: shipping it as `opacity: 0` in the server HTML
 * would mean a failed bundle or a slow connection shows a blank first screen,
 * which is a far worse outcome than a missing fade.
 */
export function HeroIntro({ children }: { children: ReactNode }) {
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  useIsoLayoutEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    setArmed(true);
  }, []);

  useEffect(() => {
    if (!armed) return;
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [armed]);

  const style =
    armed && !shown
      ? { opacity: 0, transform: "translateY(14px)" }
      : armed
        ? {
            opacity: 1,
            transform: "none",
            transition:
              "opacity 600ms var(--ease-out-soft) 60ms, transform 600ms var(--ease-out-soft) 60ms",
          }
        : undefined;

  return <div style={style}>{children}</div>;
}

export default HeroIntro;
