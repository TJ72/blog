import type { Metadata } from "next";
import { ViewTransition } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypePrettyCode, {
  type Options as RehypePrettyCodeOptions,
} from "rehype-pretty-code";
import {
  getAllPosts,
  getPostBySlug,
  getRelatedPosts,
  postExists,
} from "@/lib/posts";
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
  const relatedPosts = getRelatedPosts(slug);

  return (
    <article className="mx-auto w-full max-w-(--w-content) px-6 py-16">
      <Link
        href="/"
        className="font-sans text-sm text-muted transition-colors hover:text-ink"
      >
        ← Back home
      </Link>
      {/* Name matches the home list entry for this slug — that pairing is what
          makes the title morph across the navigation. Only the title is
          paired: the date's position relative to the title flips between the
          two layouts, so morphing it as well made the elements cross paths. */}
      <ViewTransition name={`post-title-${slug}`} share="morph">
        <h1 className="mt-6 text-2xl font-medium tracking-tight">
          {meta.title}
        </h1>
      </ViewTransition>
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
      {/* Related reading — an <aside> inside <article> marks content that is
          tangentially related to it. Renders nothing while this is the only
          post; lights up by itself once a second one exists. Cards reuse the
          home list's markup, minus the ViewTransition pairing: pairing here
          would also animate the REVERSE direction (the big h1 flying below
          the fold into a card), the same crossing-paths problem that got the
          date un-animated. */}
      {relatedPosts.length > 0 && (
        <aside aria-label="Read next" className="mt-16">
          <h2 className="text-xl font-medium tracking-tight">Read next</h2>
          <ul className="mt-6 space-y-8">
            {relatedPosts.map((post) => (
              <li key={post.slug} className="group">
                <Link href={`/blog/${post.slug}`} className="block">
                  <time
                    dateTime={post.date || undefined}
                    className="font-sans text-sm text-muted"
                  >
                    {post.date}
                  </time>
                  <h3 className="mt-1 text-lg font-medium tracking-tight group-hover:underline">
                    {post.title}
                  </h3>
                  {post.description && (
                    <p className="mt-1 italic text-muted">{post.description}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </article>
  );
}
