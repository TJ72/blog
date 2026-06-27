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
 * Composition root — the one place that binds the abstract ports to a concrete
 * backend. Today that's GCP (Firestore + Cloud Storage); swapping these two lines
 * is the entire app-layer cost of changing providers.
 */
export const viewCounter: ViewCounter = gcpViewCounter;
export const fileStore: FileStore = gcpFileStore;
