import { Firestore, FieldValue } from "@google-cloud/firestore";
import { Storage } from "@google-cloud/storage";

// Where the CV lives in Cloud Storage. Read from env so swapping bucket/object
// never needs a code change (you already swap the file itself with `gcloud
// storage cp ...`); the defaults match what we provisioned.
const CV_BUCKET = process.env.CV_BUCKET ?? "albert-blog-2606221144-cv";
const CV_OBJECT = process.env.CV_OBJECT ?? "cv.pdf";

// The single Firestore document that holds the running view count.
const STATS_COLLECTION = "stats";
const CV_DOC = "cv";

// Lazy singletons. Both clients authenticate via Application Default
// Credentials (ADC): on Cloud Run that's the runtime service account,
// automatically; locally it's `gcloud auth application-default login`. No keys
// live in the code or the image either way. We stash the instances on
// globalThis so Next's dev hot-reload doesn't leak a fresh client per edit.
const g = globalThis as typeof globalThis & {
  __firestore?: Firestore;
  __storage?: Storage;
};

function db(): Firestore {
  return (g.__firestore ??= new Firestore());
}

function storage(): Storage {
  return (g.__storage ??= new Storage());
}

/** Atomically add 1 to the CV view counter, creating the doc on first hit. */
export async function incrementCvViews(): Promise<void> {
  await db()
    .collection(STATS_COLLECTION)
    .doc(CV_DOC)
    .set({ views: FieldValue.increment(1) }, { merge: true });
}

/** Read the current CV view count (0 if it doesn't exist yet). */
export async function getCvViews(): Promise<number> {
  const snap = await db().collection(STATS_COLLECTION).doc(CV_DOC).get();
  const views = snap.get("views");
  return typeof views === "number" ? views : 0;
}

/** Download the CV PDF bytes from Cloud Storage (server-to-server, via ADC). */
export async function getCvFile(): Promise<Buffer> {
  const [buf] = await storage().bucket(CV_BUCKET).file(CV_OBJECT).download();
  return buf;
}
