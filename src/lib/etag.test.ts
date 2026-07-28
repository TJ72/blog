import { describe, expect, it } from "vitest";
import { etagFor, etagMatches } from "./etag";

describe("etagFor", () => {
  it("is stable for the same bytes and different for different bytes", () => {
    const a = etagFor(Buffer.from("cv-v1"));
    const b = etagFor(Buffer.from("cv-v1")); // equal bytes, different object
    const c = etagFor(Buffer.from("cv-v2"));

    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("emits a quoted strong validator", () => {
    // Quoting is required by the spec; no W/ prefix because we serve exact bytes.
    expect(etagFor(Buffer.from("cv"))).toMatch(/^"[\w-]{22}"$/);
  });

  it("reuses the memo when handed the identical Buffer object", () => {
    const buf = Buffer.from("cv");
    expect(etagFor(buf)).toBe(etagFor(buf));
  });
});

describe("etagMatches", () => {
  const etag = '"abc123"';

  it("is false when the header is absent", () => {
    expect(etagMatches(null, etag)).toBe(false);
  });

  it("matches an exact tag", () => {
    expect(etagMatches('"abc123"', etag)).toBe(true);
  });

  it("does not match a different tag", () => {
    expect(etagMatches('"different"', etag)).toBe(false);
  });

  it("matches the wildcard", () => {
    expect(etagMatches("*", etag)).toBe(true);
  });

  it("finds the tag anywhere in a list", () => {
    expect(etagMatches('"stale", "abc123", "older"', etag)).toBe(true);
    expect(etagMatches('"stale", "older"', etag)).toBe(false);
  });

  it("ignores the weak prefix on either side (weak comparison)", () => {
    expect(etagMatches('W/"abc123"', etag)).toBe(true);
    expect(etagMatches('"abc123"', 'W/"abc123"')).toBe(true);
  });

  it("tolerates untrimmed whitespace between list entries", () => {
    expect(etagMatches('"stale",   "abc123"', etag)).toBe(true);
  });
});
