import { notFound } from "next/navigation";

/**
 * Unmatched paths under a locale. Without this catch-all, Next falls back to
 * its own untranslated 404 page instead of `app/[locale]/not-found.tsx`.
 */
export default function CatchAllNotFound() {
  notFound();
}
