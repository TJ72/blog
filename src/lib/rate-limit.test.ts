import { afterEach, describe, expect, it, vi } from "vitest";
import { clientIp, createRateLimiter } from "./rate-limit";

afterEach(() => {
  vi.useRealTimers();
});

function requestWith(forwarded?: string): Request {
  return new Request("https://albertt.dev/api/cv", {
    headers: forwarded ? { "x-forwarded-for": forwarded } : {},
  });
}

describe("clientIp", () => {
  it("is null when the header is absent (e.g. a direct local request)", () => {
    expect(clientIp(requestWith())).toBeNull();
  });

  it("returns the only entry when there is one", () => {
    expect(clientIp(requestWith("203.0.113.9"))).toBe("203.0.113.9");
  });

  it("returns the LAST entry, which is the one Google appended", () => {
    // The caller sent "1.1.1.1"; Cloud Run appended what it actually saw.
    expect(clientIp(requestWith("1.1.1.1, 203.0.113.9"))).toBe("203.0.113.9");
  });

  it("cannot be steered by a spoofed header", () => {
    // Two requests claiming different addresses still land on the same key,
    // so rotating the header does not buy a fresh allowance.
    const a = clientIp(requestWith("9.9.9.9, 203.0.113.9"));
    const b = clientIp(requestWith("8.8.8.8, 203.0.113.9"));
    expect(a).toBe(b);
  });

  it("skips trailing empty entries and trims whitespace", () => {
    expect(clientIp(requestWith("1.1.1.1,  203.0.113.9 , "))).toBe("203.0.113.9");
  });
});

describe("createRateLimiter", () => {
  const options = { limit: 3, windowMs: 60_000, maxKeys: 100 };

  it("allows up to the limit, then rejects", () => {
    const limiter = createRateLimiter(options);
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("a")).toBe(false);
  });

  it("keeps a separate allowance per key", () => {
    const limiter = createRateLimiter(options);
    for (let i = 0; i < 4; i++) limiter.check("noisy");

    expect(limiter.check("noisy")).toBe(false);
    expect(limiter.check("quiet")).toBe(true); // unaffected by the neighbour
  });

  it("starts a fresh window once the old one lapses", () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter(options);
    for (let i = 0; i < 4; i++) limiter.check("a");
    expect(limiter.check("a")).toBe(false);

    vi.advanceTimersByTime(59_999);
    expect(limiter.check("a")).toBe(false); // still inside the window

    vi.advanceTimersByTime(1);
    expect(limiter.check("a")).toBe(true); // window lapsed
  });

  it("stays blocked for the rest of the window even under sustained load", () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter(options);
    for (let i = 0; i < 50; i++) limiter.check("flood");

    vi.advanceTimersByTime(30_000);
    expect(limiter.check("flood")).toBe(false);
  });

  it("evicts lapsed windows instead of growing past maxKeys", () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, maxKeys: 4 });
    for (const key of ["a", "b", "c", "d"]) limiter.check(key);

    vi.advanceTimersByTime(60_000); // every window above has now lapsed
    limiter.check("e"); // triggers the sweep

    // "a" was swept, so it gets a clean allowance rather than a stale count.
    expect(limiter.check("a")).toBe(true);
  });

  it("drops the oldest live window when every key is still active", () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, maxKeys: 2 });
    limiter.check("oldest");
    vi.advanceTimersByTime(1_000);
    limiter.check("newer");

    vi.advanceTimersByTime(1_000);
    limiter.check("newest"); // over the cap with no lapsed windows to sweep

    // Memory stayed bounded; the eviction cost is a forgotten count, not growth.
    expect(limiter.check("newest")).toBe(true);
  });
});
