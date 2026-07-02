import { afterEach, describe, expect, it, vi } from "vitest";
import { withCache, type FileStore } from "./store";

// A FileStore stub that counts fetches and can be told to start failing —
// enough to observe every withCache behaviour without touching a real backend.
function makeInner() {
  let calls = 0;
  let failing = false;
  const store: FileStore = {
    async getCv() {
      calls += 1;
      if (failing) throw new Error("backend down");
      return Buffer.from(`fetch-${calls}`);
    },
  };
  return {
    store,
    calls: () => calls,
    setFailing: (on: boolean) => (failing = on),
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("withCache", () => {
  it("fetches once and serves from memory within the TTL", async () => {
    vi.useFakeTimers();
    const inner = makeInner();
    const cached = withCache(inner.store, 60_000);

    expect((await cached.getCv()).toString()).toBe("fetch-1");
    vi.advanceTimersByTime(59_999); // still inside the TTL
    expect((await cached.getCv()).toString()).toBe("fetch-1");
    expect(inner.calls()).toBe(1);
  });

  it("refetches after the TTL expires", async () => {
    vi.useFakeTimers();
    const inner = makeInner();
    const cached = withCache(inner.store, 60_000);

    await cached.getCv();
    vi.advanceTimersByTime(60_000); // TTL boundary: entry is now expired
    expect((await cached.getCv()).toString()).toBe("fetch-2");
    expect(inner.calls()).toBe(2);
  });

  it("serves the stale copy when a refresh fails", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {}); // silence the expected log
    const inner = makeInner();
    const cached = withCache(inner.store, 60_000);

    await cached.getCv(); // populate
    vi.advanceTimersByTime(60_000);
    inner.setFailing(true);
    expect((await cached.getCv()).toString()).toBe("fetch-1"); // stale, not a throw
    expect(inner.calls()).toBe(2); // the refresh WAS attempted
  });

  it("propagates the error when nothing was ever cached", async () => {
    const inner = makeInner();
    inner.setFailing(true);
    const cached = withCache(inner.store, 60_000);

    await expect(cached.getCv()).rejects.toThrow("backend down");
  });
});
