import { mmss, slugify } from "./format";
import type { SpeakerRole } from "./speakers";
import type { DialogSegment } from "./types";

/**
 * Plain-text transcript, the shape a manager pastes into a coaching note:
 *
 *   00:12  Sotuvchi
 *          alo, assalomu alaykum...
 */
export function buildTranscriptText(
  dialog: DialogSegment[],
  roleOf: (speaker: string) => SpeakerRole,
  labels: { seller: string; client: string },
  header?: string,
): string {
  const lines: string[] = [];
  if (header) lines.push(header, "");
  for (const segment of dialog) {
    const role = roleOf(segment.speaker);
    lines.push(`${mmss(segment.start)}  ${role === "seller" ? labels.seller : labels.client}`);
    lines.push(`        ${segment.text}`);
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking immediately can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(text: string, filename: string) {
  saveBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), filename);
}

export function downloadJson(value: unknown, filename: string) {
  saveBlob(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" }),
    filename,
  );
}

export function callFileName(clientName: string | null, id: string, extension: string) {
  const base = clientName?.trim() ? slugify(clientName) : id.slice(0, 8);
  return `salespulse-${base}.${extension}`;
}
