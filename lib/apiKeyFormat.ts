/** Shared between the browser (which mints keys) and the server (which checks them). */

export const KEY_PREFIX = "sp_";
/** Enough of the key to tell two apart in a list, never enough to use one. */
export const DISPLAY_PREFIX_LENGTH = 11;

/**
 * SHA-256, hex encoded. The plaintext key is hashed in the browser before it
 * is ever sent anywhere, so the database only holds something that cannot be
 * turned back into a working credential.
 */
export async function hashApiKey(key: string): Promise<string> {
  const bytes = new TextEncoder().encode(key.trim());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Pulls the credential out of `Authorization: Bearer sp_…`. */
export function bearerFrom(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token && token.startsWith(KEY_PREFIX) ? token : null;
}
