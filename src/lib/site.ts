/**
 * Single source of truth for the site's public identity. Everything that needs
 * an absolute URL (OpenGraph tags, sitemap, robots) derives from SITE_URL.
 *
 * Phase 3: the custom domain (Cloud Run domain mapping, terraform/cloudrun.tf).
 * The two *.run.app hostnames still serve; canonical URLs point search engines
 * here.
 */
export const SITE_URL = "https://albertt.dev";

export const SITE_NAME = "Albert's Blog";
export const SITE_DESCRIPTION =
  "Frontend developer, learning the cloud by building on it.";
