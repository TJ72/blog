import { fileStore, viewCounter } from "@/lib/store";
import { isBot } from "@/lib/bots";

// The store backend needs the Node.js runtime (not Edge), and this handler must
// never be prerendered or cached — every hit should serve the latest stored file.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pdfHeaders = {
  "Content-Type": "application/pdf",
  "Content-Disposition": 'inline; filename="albert-cv.pdf"',
  // Don't cache: keeps the counter honest and immediately reflects a freshly
  // swapped CV.
  "Cache-Control": "no-store",
};

export async function GET(request: Request) {
  // Count human views only — skip bots so the metric isn't inflated by crawlers
  // and probes. Never let a counter hiccup block the download: serving the CV is
  // the primary job, the metric is secondary. We still await so the write lands
  // before Cloud Run may freeze the instance.
  if (!isBot(request)) {
    try {
      await viewCounter.increment();
    } catch (err) {
      console.error("[/api/cv] failed to increment counter:", err);
    }
  }

  try {
    const pdf = await fileStore.getCv();
    return new Response(new Uint8Array(pdf), { headers: pdfHeaders });
  } catch (err) {
    console.error("[/api/cv] failed to load CV from storage:", err);
    return new Response("CV temporarily unavailable", { status: 502 });
  }
}

// Probes and unfurlers often send HEAD, and Next routes HEAD to the GET handler
// by default — which would tick the counter. Define HEAD explicitly so it answers
// cheaply (status + type) without counting or even reading from storage.
export async function HEAD() {
  return new Response(null, { status: 200, headers: pdfHeaders });
}
