// In-memory rate limiting, split out of the route handler so the window and
// eviction rules can be unit-tested without a server.
//
// Scope, stated plainly: this is a per-instance counter, so with N Cloud Run
// instances the real ceiling is N times the configured limit, and a cold start
// wipes it. That imprecision is fine for what it defends against — one script
// hammering one endpoint — and the alternative (a shared store) would mean a
// network round-trip on every request, which is the cost we are trying to avoid.
// A distributed flood from many addresses defeats it entirely; that needs an
// edge network, not application code.

/**
 * The client's address as reported by the Cloud Run frontend.
 *
 * Read the LAST entry, not the first. Google appends the address it observed to
 * any X-Forwarded-For the client already sent, and values from the client are
 * kept at the FRONT of the list — so the familiar `split(",")[0]` returns
 * whatever the caller typed there. Anyone could then hand us a fresh fake
 * address per request and never hit a limit. The final entry is the one Google
 * wrote, and it is the only one we did not let the caller choose.
 *
 * This holds because exactly one trusted proxy sits in front of us. Putting a
 * load balancer or CDN in the path would add hops and this would need revisiting.
 */
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return null;

  const entries = forwarded.split(",");
  for (let i = entries.length - 1; i >= 0; i--) {
    const ip = entries[i].trim();
    if (ip) return ip;
  }
  return null;
}

export interface RateLimiter {
  /** True if the key is still within its allowance; false means reject. */
  check(key: string): boolean;
}

interface Window {
  count: number;
  startedAt: number;
}

/**
 * Fixed-window limiter: each key gets `limit` requests per `windowMs`, and the
 * window restarts on the first request after it lapses.
 *
 * Fixed windows allow a burst of up to 2x the limit across a window boundary.
 * A sliding window or token bucket would smooth that out, and neither is worth
 * the extra state here — we are drawing a line between "a person" and "a
 * script", and both sit far from that boundary.
 *
 * `maxKeys` caps memory so a flood from many addresses cannot grow the map
 * without bound. There is no timer: sweeping lazily on insert keeps the event
 * loop empty, which matters when the instance is free to be frozen between
 * requests.
 */
export function createRateLimiter({
  limit,
  windowMs,
  maxKeys,
}: {
  limit: number;
  windowMs: number;
  maxKeys: number;
}): RateLimiter {
  const windows = new Map<string, Window>();

  function evict(now: number) {
    // Lapsed windows first — usually enough on its own.
    for (const [key, window] of windows) {
      if (now - window.startedAt >= windowMs) windows.delete(key);
    }
    // Still full, so these are all live keys: drop the oldest until there is
    // room. Map iterates in insertion order and we only insert when starting a
    // window, so the front of the map is the least recently started one.
    for (const key of windows.keys()) {
      if (windows.size < maxKeys) break;
      windows.delete(key);
    }
  }

  return {
    check(key) {
      const now = Date.now();
      const window = windows.get(key);

      if (!window || now - window.startedAt >= windowMs) {
        if (windows.size >= maxKeys) evict(now);
        windows.set(key, { count: 1, startedAt: now });
        return true;
      }

      window.count += 1;
      return window.count <= limit;
    },
  };
}
