import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// File convention: this becomes /robots.txt. Crawl-policy only — it asks
// polite crawlers to stay out; it is NOT an access control (that's the signed
// admin cookie's job). /admin and /api have nothing worth indexing: the admin
// page is a login wall and /api/cv is a download endpoint, not a page.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
