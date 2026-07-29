import { createHash } from "node:crypto";

// ETag helpers for conditional requests, split out of the route handler so the
// parsing rules can be unit-tested without spinning up a server.
//
// The point of all this: an ETag lets the browser ask "still the same file?"
// instead of "send me the file". When the answer is yes we reply 304 with no
// body — a couple of hundred bytes instead of the whole PDF — while the request
// still reaches us, so the view counter stays exact.

// Single-slot memo. withCache (see ./store) hands back the SAME Buffer object
// for its whole TTL, so reference equality is enough to know the bytes haven't
// changed — no need to re-hash the file on every request. A new Buffer after a
// cache refresh simply replaces the entry.
let memo: { buf: Buffer; etag: string } | null = null;

/**
 * Strong ETag for the given bytes: a content fingerprint, not a security
 * control — it only has to change when the file changes. Truncated to 22
 * base64url characters (~132 bits), which is far past the point where accidental
 * collisions matter and keeps the header short.
 */
export function etagFor(buf: Buffer): string {
  if (memo?.buf === buf) return memo.etag;
  const digest = createHash("sha256").update(buf).digest("base64url");
  const etag = `"${digest.slice(0, 22)}"`;
  memo = { buf, etag };
  return etag;
}

/** Drop the weak-validator prefix, so W/"abc" and "abc" compare as equal. */
function stripWeak(tag: string): string {
  return tag.startsWith("W/") ? tag.slice(2) : tag;
}

/**
 * Does an If-None-Match header match the current ETag?
 *
 * The header is a comma-separated list, or the wildcard "*" which matches any
 * existing resource. RFC 9110 specifies the *weak* comparison function here, so
 * a W/ prefix on either side is ignored — two responses only need to be
 * equivalent, not byte-identical, to skip the download.
 */
export function etagMatches(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false;
  const current = stripWeak(etag);
  return ifNoneMatch.split(",").some((raw) => {
    const tag = raw.trim();
    return tag === "*" || stripWeak(tag) === current;
  });
}
