// Best-effort bot/crawler/probe detection for the vanity view counter, split out
// of the route handler so it can be unit-tested in isolation. UA strings are
// spoofable and this list is never complete, so the result is an approximation —
// which is the right precision for a vanity metric.
const BOT_UA =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|whatsapp|preview|monitor|uptime|headless|curl|wget|python-requests|axios|go-http|okhttp/i;

/** True for requests with a bot-like or empty User-Agent. */
export function isBot(request: Request): boolean {
  const ua = request.headers.get("user-agent") ?? "";
  return ua === "" || BOT_UA.test(ua);
}
