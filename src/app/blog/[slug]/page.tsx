import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypePrettyCode, {
  type Options as RehypePrettyCodeOptions,
} from "rehype-pretty-code";
import { getAllPosts, getPostBySlug, postExists } from "@/lib/posts";
import { SITE_NAME } from "@/lib/site";

// Syntax highlighting via Shiki (runs at build time → zero client JS).
// Dual theme emits CSS variables (--shiki-light / --shiki-dark) that we switch
// in globals.css; keepBackground:false lets us control the block background there.
const prettyCodeOptions: RehypePrettyCodeOptions = {
  theme: { light: "github-light", dark: "github-dark" },
  keepBackground: false,
};

// Only the posts returned by generateStaticParams exist; any other slug 404s at
// the framework level (dynamicParams=false), so an unknown slug never reaches the
// runtime MDX compile below. Valid here because Cache Components isn't enabled.
export const dynamicParams = false;

// Pre-render every post at build time (SSG).
export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!postExists(slug)) return {};
  const { meta } = getPostBySlug(slug);
  return {
    title: meta.title,
    description: meta.description,
    // The service answers on two Cloud Run hostnames (deterministic + legacy
    // random-tag); canonical tells search engines which one is the real page.
    alternates: { canonical: `/blog/${slug}` },
    // Metadata merges SHALLOWLY across segments: setting openGraph here
    // replaces the layout's whole openGraph object, so siteName must be
    // restated. Relative URLs resolve against the layout's metadataBase.
    openGraph: {
      siteName: SITE_NAME,
      title: meta.title,
      description: meta.description,
      type: "article",
      publishedTime: meta.date || undefined,
      url: `/blog/${slug}`,
    },
  };
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
    <article className="mx-auto w-full max-w-(--w-content) px-6 py-16">
      <Link
        href="/"
        className="font-sans text-sm text-muted transition-colors hover:text-ink"
      >
        ← Back home
      </Link>
      <h1 className="mt-6 text-2xl font-medium tracking-tight">{meta.title}</h1>
      <time
        dateTime={meta.date || undefined}
        className="mt-2 block font-sans text-sm text-muted"
      >
        {meta.date}
      </time>
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
