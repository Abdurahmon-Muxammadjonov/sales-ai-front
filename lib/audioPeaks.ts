"use client";

/**
 * Peak envelope for a waveform preview.
 *
 * Decoded through an OfflineAudioContext at 8 kHz mono rather than the default
 * device rate: a 26-minute stereo mp3 at 44.1 kHz would decode to well over a
 * gigabyte of float samples, which is enough to kill the tab. At 8 kHz mono the
 * same file is a few tens of megabytes, and the peaks look identical once they
 * are bucketed down to a couple of hundred bars.
 */
const PEAK_RATE = 8000;

type OfflineCtor = typeof OfflineAudioContext;

function offlineContext(): OfflineAudioContext | null {
  const Ctor =
    (globalThis as unknown as { OfflineAudioContext?: OfflineCtor }).OfflineAudioContext ??
    (globalThis as unknown as { webkitOfflineAudioContext?: OfflineCtor })
      .webkitOfflineAudioContext;
  if (!Ctor) return null;
  try {
    return new Ctor(1, 1, PEAK_RATE);
  } catch {
    return null;
  }
}

export interface AudioSummary {
  peaks: number[];
  duration: number;
}

export async function readAudioSummary(
  file: Blob,
  buckets = 240,
): Promise<AudioSummary | null> {
  const context = offlineContext();
  if (!context) return null;

  let buffer: AudioBuffer;
  try {
    buffer = await context.decodeAudioData(await file.arrayBuffer());
  } catch {
    // An unsupported codec is not an error worth surfacing — the upload still
    // works, it just goes up without a picture of itself.
    return null;
  }

  const samples = buffer.getChannelData(0);
  const size = Math.max(1, Math.floor(samples.length / buckets));
  const peaks: number[] = [];

  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const start = bucket * size;
    let peak = 0;
    for (let i = start; i < start + size && i < samples.length; i += 1) {
      const value = Math.abs(samples[i]);
      if (value > peak) peak = value;
    }
    peaks.push(peak);
  }

  const loudest = Math.max(...peaks, 0.01);
  return {
    peaks: peaks.map((peak) => peak / loudest),
    duration: buffer.duration,
  };
}

/** Duration alone, without decoding — enough to enforce the length limit. */
export function readDuration(file: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () =>
      done(Number.isFinite(audio.duration) ? audio.duration : null);
    audio.onerror = () => done(null);
    audio.src = url;
  });
}
