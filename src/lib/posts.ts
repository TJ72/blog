import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

// A build-time constant on purpose: Next's output-file tracing (@vercel/nft)
// statically reads this path to know which files to copy into the standalone
// image. A dynamic value here (e.g. an env override) defeats that analysis and
// makes nft conservatively copy the whole project root. Tests mock node:fs
// instead of redirecting this path. See posts.test.ts.
const POSTS_DIR = path.join(process.cwd(), "content/posts");

// TODO: Design category & tag features for the blog (discussed 2026-06-22).
//  - Model: one `category` per post (big section, e.g. Cloud / Study abroad / Algorithms)
//    + keep `tags` for fine-grained labels. Adding `category` is cheap: frontmatter
//    line + a field here + the parser below — no data migration needed.
//  - Build the consumption side (tags are currently parsed but unused anywhere):
//    show category/tags on home + post pages, add /category/[name] listing pages + nav.
export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  description?: string;
  tags?: string[];
};

export type Post = {
  meta: PostMeta;
  content: string;
};

/** All post slugs (filenames without the .mdx extension). */
export function getPostSlugs(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

export function postExists(slug: string): boolean {
  return fs.existsSync(path.join(POSTS_DIR, `${slug}.mdx`));
}

/** Read one post and parse its frontmatter. */
export function getPostBySlug(slug: string): Post {
  const fullPath = path.join(POSTS_DIR, `${slug}.mdx`);
  const raw = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(raw);

  return {
    meta: {
      slug,
      title: typeof data.title === "string" ? data.title : slug,
      // YAML parses an UNQUOTED date (date: 2026-01-02) into a Date object, not
      // a string — without the instanceof branch such a post would silently
      // render an empty date and sort to the bottom. Normalize it back to the
      // ISO day string (Date is at UTC midnight, so the day survives the slice).
      date:
        typeof data.date === "string"
          ? data.date
          : data.date instanceof Date
            ? data.date.toISOString().slice(0, 10)
            : "",
      description:
        typeof data.description === "string" ? data.description : undefined,
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : undefined,
    },
    content,
  };
}

/** All posts' metadata, newest first; date ties break by slug so the order
 *  never depends on filesystem enumeration. */
export function getAllPosts(): PostMeta[] {
  return getPostSlugs()
    .map((slug) => getPostBySlug(slug).meta)
    .sort(
      (a, b) =>
        (a.date < b.date ? 1 : a.date > b.date ? -1 : 0) ||
        a.slug.localeCompare(b.slug),
    );
}
