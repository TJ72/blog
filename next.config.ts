import type { NextConfig } from "next";

// Security headers applied to every response. A strict nonce-based CSP would be
// stronger, but nonces are per-request and would push the static pages into
// dynamic rendering; this baseline keeps the site fully static while still locking
// resources to same-origin and blocking framing/MIME-sniffing. 'unsafe-inline' is
// required because Next's bootstrap, next-themes, and Shiki all emit inline
// <script>/<style> — tightening script-src with nonces is a future hardening step.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // 2 years; no `preload` so a future custom domain isn't locked into the list.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
