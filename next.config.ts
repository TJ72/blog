import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a minimal, self-contained server build for Docker / Cloud Run.
  output: "standalone",
  // The Google Cloud SDKs rely on Node.js-native features (gRPC, fs) and are not
  // in Next's auto-externalized list. Keep them out of the Server Component /
  // Route Handler bundle so they're `require`d at runtime from node_modules
  // instead of being mangled by the bundler. They're still traced into the
  // standalone output automatically.
  // Keep firestore external — its grpc/protobufjs internals use dynamic requires
  // that don't bundle. storage, by contrast, is HTTP-based and bundles cleanly,
  // and bundling it sidesteps a standalone "dual-package" tracing hazard: left
  // external, the file tracer followed its ESM `exports` condition and dropped
  // the CJS entries that the Node runtime require()s (e.g. its html-entities
  // dependency went missing). Bundling compiles storage + its deps into the
  // server chunk, so there's nothing to resolve from node_modules at runtime.
  serverExternalPackages: ["@google-cloud/firestore"],
};

export default nextConfig;
