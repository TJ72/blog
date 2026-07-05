import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/posts";
import { SITE_URL } from "@/lib/site";

// File convention: this becomes /sitemap.xml — the list of pages we invite
// search engines to index. Runs at build time (posts are read from disk), so
// a new post enters the sitemap with the deploy that ships it.
export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts(); // already sorted newest-first

  return [
    {
      url: SITE_URL,
      // The home page effectively changes when a post is published.
      lastModified: posts[0]?.date || undefined,
    },
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.date || undefined,
    })),
  ];
}
