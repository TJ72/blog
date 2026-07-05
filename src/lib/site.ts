/**
 * Single source of truth for the site's public identity. Everything that needs
 * an absolute URL (OpenGraph tags, sitemap, robots) derives from SITE_URL, so
 * when Phase 3 lands a custom domain, this is the only line that changes.
 *
 * This is the deterministic Cloud Run URL (project-number-based), not the
 * legacy random-tag one — the same choice the uptime check makes.
 */
export const SITE_URL = "https://blog-503336128890.asia-east1.run.app";

export const SITE_NAME = "Albert's Blog";
export const SITE_DESCRIPTION =
  "Notes on software development and learning the cloud.";
