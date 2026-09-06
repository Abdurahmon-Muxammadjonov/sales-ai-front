"use client";

import { useEffect, useRef } from "react";

/**
 * Draws a peak envelope onto a canvas, mirrored about the centre line. Redrawn
 * on resize and on theme change, since the colours come from CSS variables that
 * canvas cannot resolve on its own.
 */
export function Waveform({
  peaks,
  progress = 0,
  height = 40,
  className = "",
}: {
  peaks: number[];
  /** 0-1; bars before it take the accent colour. */
  progress?: number;
  height?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const width = parent.clientWidth;
      if (width <= 0) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const styles = getComputedStyle(document.documentElement);
      // Read through the tokens so the canvas follows the theme; the fallback
      // is only reached if the stylesheet has not applied yet.
      const played = styles.getPropertyValue("--accent-fill").trim() || "#0071e3";
      const pending = styles.getPropertyValue("--line-strong").trim() || "rgba(0,0,0,.14)";

      const gap = 1;
      const barWidth = Math.max(1, width / peaks.length - gap);
      const mid = height / 2;

      peaks.forEach((peak, index) => {
        const x = index * (barWidth + gap);
        const barHeight = Math.max(1.5, peak * (height - 2));
        ctx.fillStyle = index / peaks.length <= progress ? played : pending;
        ctx.beginPath();
        const radius = Math.min(barWidth / 2, 1.5);
        const y = mid - barHeight / 2;
        if (ctx.roundRect) ctx.roundRect(x, y, barWidth, barHeight, radius);
        else ctx.rect(x, y, barWidth, barHeight);
        ctx.fill();
      });
    };

    draw();
    const observer = new ResizeObserver(draw);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    // The palette flips with the theme; redraw when the class on <html> changes.
    const themeWatcher = new MutationObserver(draw);
    themeWatcher.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      themeWatcher.disconnect();
    };
  }, [peaks, progress, height]);

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
}

export default Waveform;
