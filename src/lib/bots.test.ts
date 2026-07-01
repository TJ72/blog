import { describe, expect, it } from "vitest";
import { isBot } from "./bots";

function req(userAgent: string | null): Request {
  const headers = new Headers();
  if (userAgent !== null) headers.set("user-agent", userAgent);
  return new Request("https://example.com/api/cv", { headers });
}

describe("isBot", () => {
  it("flags known bots, crawlers, unfurlers, and probes", () => {
    const bots = [
      "Googlebot/2.1 (+http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0)",
      "facebookexternalhit/1.1",
      "WhatsApp/2.23",
      "GoogleStackdriverMonitoring-UptimeChecks",
      "curl/8.4.0",
      "python-requests/2.31.0",
      "axios/1.6.0",
    ];
    for (const ua of bots) {
      expect(isBot(req(ua)), ua).toBe(true);
    }
  });

  it("treats a missing or empty User-Agent as a bot", () => {
    expect(isBot(req(null))).toBe(true);
    expect(isBot(req(""))).toBe(true);
  });

  it("lets a real browser User-Agent through", () => {
    const chrome =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const safariIphone =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
      "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    expect(isBot(req(chrome))).toBe(false);
    expect(isBot(req(safariIphone))).toBe(false);
  });
});
