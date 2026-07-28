import { fileStore, viewCounter } from "@/lib/store";
import { isBot } from "@/lib/bots";
import { etagFor, etagMatches } from "@/lib/etag";

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

export async function GET(request: Request) {
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
