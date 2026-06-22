import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a minimal, self-contained server build for Docker / Cloud Run.
  output: "standalone",
};

export default nextConfig;
