"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { mmss } from "@/lib/format";
import { Button } from "./ui";
import { IconMic } from "./icons";

/** Picks a container the browser can actually produce and the API accepts. */
function pickMimeType(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  if (typeof MediaRecorder === "undefined") return undefined;
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export function Recorder({ onRecorded }: { onRecorded: (file: File) => void }) {
  const t = useTranslations("stt");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [level, setLevel] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  async function start() {
    setErrorKey(null);
    const mimeType = pickMimeType();
    if (!navigator.mediaDevices?.getUserMedia || !mimeType) {
      setErrorKey("recUnsupported");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setErrorKey("recDenied");
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    setSeconds(0);

    // A live level meter, so the person can see the microphone is actually
    // hearing them before they talk for ten minutes into a muted input.
    try {
      const context = new AudioContext();
      audioCtxRef.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const value of data) peak = Math.max(peak, Math.abs(value - 128) / 128);
        setLevel(peak);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      /* the meter is a nicety; recording works without it */
    }

    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const extension = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "m4a" : "webm";
      onRecorded(
        new File([blob], `${t("recName").replace(/\s+/g, "-").toLowerCase()}.${extension}`, {
          type: mimeType,
        }),
      );
      cleanup();
      setLevel(0);
    };
    recorder.start();
    setRecording(true);
  }

  function stop() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line-strong px-6 py-12 text-center">
      <button
        type="button"
        onClick={recording ? stop : () => void start()}
        aria-label={recording ? t("recStop") : t("recStart")}
        className="relative grid size-16 place-items-center rounded-full text-white transition-transform duration-150 hover:scale-105"
        style={{ background: recording ? "var(--red)" : "var(--accent)" }}
      >
        {recording ? (
          <span aria-hidden="true" className="block size-5 rounded-[3px] bg-white" />
        ) : (
          <span aria-hidden="true" className="scale-150">
            <IconMic />
          </span>
        )}
        {recording ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              boxShadow: `0 0 0 ${4 + level * 14}px color-mix(in srgb, var(--red) 14%, transparent)`,
              transition: "box-shadow 90ms linear",
            }}
          />
        ) : null}
      </button>

      <p className="mt-4 text-[15px] font-medium text-ink">
        {recording ? t("recording") : t("recStart")}
      </p>
      {recording ? (
        <p className="tnum mt-1 font-mono text-[22px] font-semibold text-ink">{mmss(seconds)}</p>
      ) : (
        <p className="mt-1 max-w-xs text-[13px] text-ink-2">{t("recHint")}</p>
      )}

      {recording ? (
        <Button className="mt-5" onClick={stop}>
          {t("recStop")}
        </Button>
      ) : null}

      {errorKey ? (
        <p role="alert" className="mt-4 max-w-sm text-[13px] text-red-text">
          {t(errorKey)}
        </p>
      ) : null}
    </div>
  );
}

export default Recorder;
