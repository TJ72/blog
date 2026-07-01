import { afterEach, describe, expect, it, vi } from "vitest";
import { createSession, verifyPassword, verifySession } from "./auth";

const SECRET = "test-session-secret";
const TOKEN = "correct-horse-battery-staple";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("verifyPassword", () => {
  it("accepts the correct password", () => {
    vi.stubEnv("ADMIN_TOKEN", TOKEN);
    expect(verifyPassword(TOKEN)).toBe(true);
  });

  it("rejects a wrong password of the same length", () => {
    vi.stubEnv("ADMIN_TOKEN", TOKEN);
    expect(verifyPassword("x".repeat(TOKEN.length))).toBe(false);
  });

  it("rejects a password of a different length", () => {
    // Exercises the length-mismatch branch of safeEqual (timingSafeEqual would
    // otherwise throw on unequal-length buffers).
    vi.stubEnv("ADMIN_TOKEN", TOKEN);
    expect(verifyPassword(TOKEN + "-extra")).toBe(false);
  });

  it("fails closed when ADMIN_TOKEN is unset", () => {
    vi.stubEnv("ADMIN_TOKEN", undefined);
    expect(verifyPassword(TOKEN)).toBe(false);
  });
});

describe("createSession + verifySession", () => {
  it("round-trips a freshly minted token", () => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    const token = createSession();
    expect(token).not.toBeNull();
    expect(verifySession(token!, SECRET)).toBe(true);
  });

  it("returns null when SESSION_SECRET is unset (login fails closed)", () => {
    vi.stubEnv("SESSION_SECRET", undefined);
    expect(createSession()).toBeNull();
  });

  it("rejects a tampered payload", () => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    const [payload, sig] = createSession()!.split(".");
    const badPayload = (payload[0] === "A" ? "B" : "A") + payload.slice(1);
    expect(verifySession(`${badPayload}.${sig}`, SECRET)).toBe(false);
  });

  it("rejects a tampered signature", () => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    const [payload, sig] = createSession()!.split(".");
    const badSig = (sig[0] === "A" ? "B" : "A") + sig.slice(1);
    expect(verifySession(`${payload}.${badSig}`, SECRET)).toBe(false);
  });

  it("rejects a token signed with a different secret (rotation kills sessions)", () => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    const token = createSession()!;
    expect(verifySession(token, "a-different-secret")).toBe(false);
  });

  it("rejects malformed tokens", () => {
    expect(verifySession("", SECRET)).toBe(false);
    expect(verifySession("no-dot-here", SECRET)).toBe(false);
    expect(verifySession(".onlySig", SECRET)).toBe(false);
  });

  it("rejects an expired token but accepts one still within its lifetime", () => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = createSession()!;

    // +4h: within the 8h lifetime
    vi.setSystemTime(new Date("2026-01-01T04:00:00Z"));
    expect(verifySession(token, SECRET)).toBe(true);

    // +8h1s: past expiry
    vi.setSystemTime(new Date("2026-01-01T08:00:01Z"));
    expect(verifySession(token, SECRET)).toBe(false);
  });
});
