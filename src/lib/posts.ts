import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const POSTS_DIR = path.join(process.cwd(), "content/posts");

// TODO: Design category & tag features for the blog (discussed 2026-06-22).
//  - Model: one `category` per post (big section, e.g. 雲端學習 / 澳洲遊學 / 演算法)
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
      date: typeof data.date === "string" ? data.date : "",
      description:
        typeof data.description === "string" ? data.description : undefined,
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : undefined,
    },
    content,
  };
}

/** All posts' metadata, newest first. */
export function getAllPosts(): PostMeta[] {
  return getPostSlugs()
    .map((slug) => getPostBySlug(slug).meta)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}
