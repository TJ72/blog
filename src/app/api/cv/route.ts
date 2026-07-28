import { fileStore, viewCounter } from "@/lib/store";
import { isBot } from "@/lib/bots";
import { etagFor, etagMatches } from "@/lib/etag";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";

// The store backend needs the Node.js runtime (not Edge), and this handler must
// never be prerendered or cached — every hit should serve the latest stored file.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// `no-cache` is not `no-store`. no-store forbids keeping a copy at all, so every
// visit re-downloads the full PDF; no-cache lets the browser keep it but forces
// it to check with us first. Every request still reaches this handler — the view
// counter stays exact — while an unchanged CV comes back as an empty 304 instead
// of ~75 KB of body. That is the whole trade: same metric, a fraction of the
// egress. (It only helps well-behaved clients; a script that ignores caching
// still costs full bandwidth, which is a separate problem.)
const cacheHeaders = {
  "Cache-Control": "no-cache",
};

const pdfHeaders = {
  ...cacheHeaders,
  "Content-Type": "application/pdf",
  "Content-Disposition": 'inline; filename="albert-cv.pdf"',
};

// Ten downloads a minute per address. A person reads the CV once; ten leaves
// room for a reload or a PDF viewer refetching, and still cuts a script down by
// orders of magnitude. The limit is per instance, so the true ceiling is this
// times the running instance count — set it low enough that the multiplied
// figure is still harmless rather than trying to make the count exact.
const WINDOW_MS = 60_000;
const limiter = createRateLimiter({
  limit: 10,
  windowMs: WINDOW_MS,
  // ~10k addresses is well under a megabyte and far past any real traffic here.
  maxKeys: 10_000,
});

export async function GET(request: Request) {
  // Rejected first, before the counter and before storage: the whole point is
  // that a refused request costs us nothing but the connection. Conditional
  // requests (304s) are checked too — they are cheap, not free, and a script
  // could otherwise sit on a valid ETag and still keep an instance busy.
  //
  // A missing address means no proxy in front, which locally is normal and in
  // production should not happen. Sharing one bucket in that case limits the
  // damage rather than waving everyone through.
  if (!limiter.check(clientIp(request) ?? "unknown")) {
    return new Response("Too many requests", {
      status: 429,
      headers: {
        "Retry-After": String(WINDOW_MS / 1000),
        "Cache-Control": "no-store",
      },
    });
  }

  // Count human views only — skip bots so the metric isn't inflated by crawlers
  // and probes. Never let a counter hiccup block the download: serving the CV is
  // the primary job, the metric is secondary. We still await so the write lands
  // before Cloud Run may freeze the instance.
  //
  // This deliberately runs before the 304 check below: a revalidation is still a
  // real view, so conditional requests count exactly like full downloads.
  if (!isBot(request)) {
    try {
      await viewCounter.increment();
    } catch (err) {
      console.error("[/api/cv] failed to increment counter:", err);
    }
  }

  let pdf: Buffer;
  try {
    pdf = await fileStore.getCv();
  } catch (err) {
    console.error("[/api/cv] failed to load CV from storage:", err);
    return new Response("CV temporarily unavailable", { status: 502 });
  }

  const etag = etagFor(pdf);
  if (etagMatches(request.headers.get("if-none-match"), etag)) {
    // A 304 carries no body, and none of the headers that would describe one.
    return new Response(null, {
      status: 304,
      headers: { ...cacheHeaders, ETag: etag },
    });
  }

  return new Response(new Uint8Array(pdf), {
    headers: { ...pdfHeaders, ETag: etag },
  });
}

// Probes and unfurlers often send HEAD, and Next routes HEAD to the GET handler
// by default — which would tick the counter. Define HEAD explicitly so it answers
// cheaply (status + type) without counting or even reading from storage. No ETag
// here for the same reason: producing one would mean fetching the bytes.
export async function HEAD() {
  return new Response(null, { status: 200, headers: pdfHeaders });
}
