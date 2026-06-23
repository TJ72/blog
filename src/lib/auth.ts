import { cookies } from "next/headers";

// Name of the httpOnly session cookie set after a successful admin login.
export const ADMIN_COOKIE = "admin_session";

/**
 * Minimal admin gate: the session cookie must equal the configured ADMIN_TOKEN.
 * Storing the token itself (httpOnly, HTTPS-only in prod) is deliberately simple
 * — without a signing secret a fixed marker would just be forgeable, so matching
 * the secret is actually the safer minimal option. Upgrade path is IAP / a real
 * session store. If ADMIN_TOKEN isn't set, the page stays locked.
 */
export async function isAuthed(): Promise<boolean> {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === expected;
}
