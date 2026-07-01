import { cookies } from "next/headers";
import crypto from "node:crypto";

// Name of the httpOnly session cookie set after a successful admin login.
export const ADMIN_COOKIE = "admin_session";

// Session lifetime. Used for BOTH the signed token's exp claim and the cookie's
// maxAge so the two expire together.
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

// The session cookie holds a SIGNED TOKEN, not the admin password. The token is
//   base64url(payload) + "." + base64url(HMAC_SHA256(payload, SESSION_SECRET))
// so a leaked cookie can't be turned back into the secret (HMAC is one-way), the
// payload carries its own expiry, and rotating SESSION_SECRET invalidates every
// session at once. This is the standard signed-cookie construction (same idea as
// Rails signed cookies), built on Node's vetted HMAC — not home-grown crypto.

function sign(payloadB64: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");
}

// Constant-time string compare. timingSafeEqual throws on length mismatch, so the
// length is checked first (which only leaks length, not content).
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** Check a submitted admin password against ADMIN_TOKEN, in constant time. */
export function verifyPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  return safeEqual(candidate, expected);
}

/**
 * Mint a signed session token valid for SESSION_MAX_AGE_SECONDS. Returns null if
 * SESSION_SECRET isn't configured, so login fails closed.
 */
export function createSession(): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const payload = { exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64, secret)}`;
}

/**
 * Verify a token: signature matches (constant-time) AND it hasn't expired.
 * Exported (though in-app only isAuthed calls it) so the crypto core can be
 * unit-tested directly, without mocking the cookie store.
 */
export function verifySession(token: string, secret: string): boolean {
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);
  // Verify the signature before trusting (parsing) the payload.
  if (!safeEqual(sigB64, sign(payloadB64, secret))) return false;
  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    );
    return typeof payload.exp === "number" && Date.now() < payload.exp;
  } catch {
    return false;
  }
}

/**
 * Minimal admin gate: a valid, unexpired signed session cookie. The cookie no
 * longer contains ADMIN_TOKEN itself — only a signature over an expiry claim.
 * Fails closed if SESSION_SECRET is unset. Upgrade path is IAP / a session store.
 */
export async function isAuthed(): Promise<boolean> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  return !!token && verifySession(token, secret);
}
