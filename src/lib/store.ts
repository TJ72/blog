import { gcpViewCounter, gcpFileStore } from "./adapters/gcp";

/**
 * Ports — the cloud-neutral contracts the rest of the app depends on. App code
 * (route handlers, pages) imports ONLY from this module and only ever sees these
 * interfaces, never a vendor SDK. The concrete backend is chosen once, at the
 * bottom of this file. To move to another provider — say Postgres for the counter
 * or S3/R2 for the file — you write a new adapter and swap those bindings; nothing
 * else in the app changes. This is the ports-and-adapters (hexagonal) pattern: the
 * app depends on abstractions, and the GCP SDK is just a detail hidden behind them.
 */

/** A single running view counter (the CV download count). */
export interface ViewCounter {
  /** Atomically add one to the count. */
  increment(): Promise<void>;
  /** Read the current count (0 if it has never been incremented). */
  get(): Promise<number>;
}

/** Read-only access to the stored CV document. */
export interface FileStore {
  /** Fetch the CV PDF bytes. */
  getCv(): Promise<Buffer>;
}

/**
 * Caching decorator over a FileStore: remembers the last fetched bytes for
 * ttlMs and serves them from memory, so most /api/cv hits skip the backend
 * round-trip entirely. Swapping the CV takes effect within one TTL.
 *
 * In-memory is the RIGHT call for a cache and would be the WRONG call for the
 * counter — same judgement, opposite conclusions: a cache is disposable derived
 * data (each instance refetching after a cold start or scale-out is harmless),
 * while the counter is the source of truth and must live in shared storage.
 *
 * Stale-on-error: once something has been served successfully, a backend
 * hiccup returns the (possibly expired) copy instead of a 502 — for a rarely
 * changing file, stale beats down.
 *
 * Note it decorates the PORT, not the GCP adapter: caching is backend-agnostic
 * policy, so any future adapter (S3, Postgres large objects, …) gets it free.
 */
export function withCache(inner: FileStore, ttlMs: number): FileStore {
  let cached: { buf: Buffer; at: number } | null = null;
  return {
    async getCv() {
      if (cached && Date.now() - cached.at < ttlMs) return cached.buf;
      try {
        const buf = await inner.getCv();
        cached = { buf, at: Date.now() };
        return buf;
      } catch (err) {
        if (cached) {
          console.error("[fileStore] refresh failed; serving stale CV:", err);
          return cached.buf;
        }
        throw err;
      }
    },
  };
}

/**
 * Composition root — the one place that binds the abstract ports to a concrete
 * backend. Today that's GCP (Firestore + Cloud Storage); swapping these two lines
 * is the entire app-layer cost of changing providers.
 */
export const viewCounter: ViewCounter = gcpViewCounter;
export const fileStore: FileStore = withCache(gcpFileStore, 5 * 60 * 1000);
