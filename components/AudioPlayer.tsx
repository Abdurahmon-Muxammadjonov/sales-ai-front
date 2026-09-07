"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { useTranslations } from "next-intl";
import { mmss } from "@/lib/format";

export interface AudioPlayerHandle {
  seek: (seconds: number) => void;
  play: () => void;
}

const SPEEDS = [1, 1.25, 1.5, 2] as const;

/**
 * The player the ribbon and the transcript both steer. Time is reported
 * upwards rather than held here, so a click on a ribbon slice and a click on a
 * missed-opportunity timestamp are the same operation.
 */
export function AudioPlayer({
  src,
  onTime,
  onPlayingChange,
  onDuration,
  ref,
  className = "",
}: {
  src: string | null;
  onTime: (seconds: number) => void;
  onPlayingChange?: (playing: boolean) => void;
  onDuration?: (seconds: number) => void;
  ref?: Ref<AudioPlayerHandle>;
  className?: string;
}) {
  const t = useTranslations("player");
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [rate, setRate] = useState<number>(1);
  const [broken, setBroken] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      seek(seconds: number) {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = Math.max(0, seconds);
        setPosition(audio.currentTime);
        onTime(audio.currentTime);
      },
      play() {
        void audioRef.current?.play();
      },
    }),
    [onTime],
  );

  useEffect(() => {
    setBroken(false);
    setPlaying(false);
    setPosition(0);
  }, [src]);

  const step = useCallback(
    (delta: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = Math.min(
        Math.max(0, audio.currentTime + delta),
        audio.duration || Number.MAX_SAFE_INTEGER,
      );
      setPosition(audio.currentTime);
      onTime(audio.currentTime);
    },
    [onTime],
  );

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }

  const disabled = !src || broken;

  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${className}`}>
      <audio
        ref={audioRef}
        src={src ?? undefined}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration;
          if (Number.isFinite(value)) {
            setDuration(value);
            onDuration?.(value);
          }
        }}
        onTimeUpdate={(event) => {
          const value = event.currentTarget.currentTime;
          setPosition(value);
          onTime(value);
        }}
        onPlay={() => {
          setPlaying(true);
          onPlayingChange?.(true);
        }}
        onPause={() => {
          setPlaying(false);
          onPlayingChange?.(false);
        }}
        onEnded={() => {
          setPlaying(false);
          onPlayingChange?.(false);
        }}
        onError={() => setBroken(true)}
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => step(-15)}
        aria-label={t("back15")}
        className="inline-flex size-9 items-center justify-center rounded-control text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink active:scale-[.94] disabled:opacity-40 disabled:active:scale-100"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={toggle}
        aria-label={playing ? t("pause") : t("play")}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-canvas transition-transform duration-150 hover:opacity-90 active:scale-[.94] disabled:opacity-40 disabled:active:scale-100"
      >
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
          </svg>
        )}
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => step(15)}
        aria-label={t("forward15")}
        className="inline-flex size-9 items-center justify-center rounded-control text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink active:scale-[.94] disabled:opacity-40 disabled:active:scale-100"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 5V2l5 4-5 4V7a6 6 0 1 0 6 6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <span className="tnum w-12 shrink-0 text-right text-sm text-ink-2">
        {mmss(position)}
      </span>

      <input
        type="range"
        className="sp-range h-4 min-w-0 flex-1"
        min={0}
        max={Math.max(1, duration)}
        step={0.1}
        value={Math.min(position, Math.max(1, duration))}
        disabled={disabled}
        aria-label={t("seek")}
        aria-valuetext={mmss(position)}
        onChange={(event) => {
          const value = Number(event.target.value);
          const audio = audioRef.current;
          if (audio) audio.currentTime = value;
          setPosition(value);
          onTime(value);
        }}
      />

      <span className="tnum hidden w-12 shrink-0 text-sm text-ink-3 sm:inline">
        {mmss(duration)}
      </span>

      <label className="sr-only" htmlFor="player-speed">
        {t("speed")}
      </label>
      <select
        id="player-speed"
        value={rate}
        disabled={disabled}
        onChange={(event) => {
          const value = Number(event.target.value);
          setRate(value);
          if (audioRef.current) audioRef.current.playbackRate = value;
        }}
        className="tnum h-9 shrink-0 rounded-control border border-line bg-canvas px-1.5 text-sm text-ink-2"
      >
        {SPEEDS.map((speed) => (
          <option key={speed} value={speed}>
            {speed}×
          </option>
        ))}
      </select>
    </div>
  );
}

export default AudioPlayer;
