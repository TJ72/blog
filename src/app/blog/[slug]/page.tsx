import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypePrettyCode, {
  type Options as RehypePrettyCodeOptions,
} from "rehype-pretty-code";
import { getAllPosts, getPostBySlug, postExists } from "@/lib/posts";

// Syntax highlighting via Shiki (runs at build time → zero client JS).
// Dual theme emits CSS variables (--shiki-light / --shiki-dark) that we switch
// in globals.css; keepBackground:false lets us control the block background there.
const prettyCodeOptions: RehypePrettyCodeOptions = {
  theme: { light: "github-light", dark: "github-dark" },
  keepBackground: false,
};

// Pre-render every post at build time (SSG).
export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!postExists(slug)) return {};
  const { meta } = getPostBySlug(slug);
  return { title: meta.title, description: meta.description };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!postExists(slug)) notFound();

  const { meta, content } = getPostBySlug(slug);

  return (
    <article className="mx-auto w-full max-w-2xl px-6 py-16">
      <Link
        href="/"
        className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        ← Back home
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">{meta.title}</h1>
      <time className="mt-2 block text-sm text-zinc-500">{meta.date}</time>
      <div className="prose prose-zinc mt-8 max-w-none dark:prose-invert">
        <MDXRemote
          source={content}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm],
              rehypePlugins: [[rehypePrettyCode, prettyCodeOptions]],
            },
          }}
        />
      </div>
    </article>
  );
}
