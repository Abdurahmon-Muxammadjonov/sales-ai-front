"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Entrance for a landing-page section: sixteen pixels of rise and a fade, once,
 * as it comes into view.
 *
 * The content is visible by default and is only hidden once JavaScript has run
 * and confirmed motion is wanted. That ordering is the whole point: a reveal
 * built the usual way ships `opacity: 0` in the server HTML, so a crawler, a
 * failed bundle or a slow connection is shown a blank page. Here the worst case
 * is that the animation never plays.
 *
 * Deliberately not used inside the authenticated app. There, content arriving a
 * beat after you asked for it reads as slowness; on a first impression it is
 * the difference between a page assembled and a page made.
 */

// useLayoutEffect warns during SSR, but arming before paint is what prevents a
// visible flash of the un-hidden state.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  useIsoLayoutEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    setArmed(true);
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -72px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const style =
    armed && !shown
      ? { opacity: 0, transform: "translateY(16px)" }
      : armed
        ? {
            opacity: 1,
            transform: "none",
            transition: `opacity 500ms var(--ease-out-soft) ${delay}s, transform 500ms var(--ease-out-soft) ${delay}s`,
          }
        : undefined;

  return (
    <Tag ref={ref as never} className={className} style={style}>
      {children}
    </Tag>
  );
}

export default Reveal;
