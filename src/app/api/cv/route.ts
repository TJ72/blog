import { getCvFile, incrementCvViews } from "@/lib/gcp";

// The GCP SDKs need the Node.js runtime (not Edge), and this handler must never
// be prerendered or cached — every hit should both count and serve the latest
// file that's sitting in the bucket.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Count the view first, but never let a counter hiccup block the download:
  // serving the CV is the primary job, the metric is secondary. We still await
  // it so the write actually lands before Cloud Run may freeze the instance.
  try {
    await incrementCvViews();
  } catch (err) {
    console.error("[/api/cv] failed to increment counter:", err);
  }

  try {
    const pdf = await getCvFile();
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="albert-cv.pdf"',
        // Don't cache: keeps the counter honest and immediately reflects a
        // freshly-swapped CV.
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[/api/cv] failed to load CV from storage:", err);
    return new Response("CV temporarily unavailable", { status: 502 });
  }
}
