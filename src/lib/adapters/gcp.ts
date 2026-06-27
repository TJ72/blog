import { Firestore, FieldValue } from "@google-cloud/firestore";
import { Storage } from "@google-cloud/storage";
import type { FileStore, ViewCounter } from "../store";

// GCP adapter — the ONLY module in the app that imports a Google Cloud SDK. It
// implements the cloud-neutral ports from ../store on top of Firestore (the view
// counter) and Cloud Storage (the CV file). Confining the SDK surface to this one
// file is what keeps the rest of the app provider-agnostic: to move to another
// backend you add a sibling adapter and rebind it in store.ts; nothing else changes.

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

/** View counter backed by an atomic Firestore increment (correct under concurrency). */
export const gcpViewCounter: ViewCounter = {
  async increment() {
    await db()
      .collection(STATS_COLLECTION)
      .doc(CV_DOC)
      .set({ views: FieldValue.increment(1) }, { merge: true });
  },
  async get() {
    const snap = await db().collection(STATS_COLLECTION).doc(CV_DOC).get();
    const views = snap.get("views");
    return typeof views === "number" ? views : 0;
  },
};

/** CV file backed by a private Cloud Storage object, read server-to-server via ADC. */
export const gcpFileStore: FileStore = {
  async getCv() {
    const [buf] = await storage().bucket(CV_BUCKET).file(CV_OBJECT).download();
    return buf;
  },
};
