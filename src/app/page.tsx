import type { Metadata } from "next";
import { ViewTransition } from "react";
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { SITE_DESCRIPTION } from "@/lib/site";
import { SocialLinks } from "./social-links";

// Identical content on the apex, www, and both *.run.app hostnames; canonical
// names the real one. Set here rather than the root layout: metadata merges
// shallowly, so a canonical up there would be inherited by /admin too.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  const posts = getAllPosts();

  return (
    <main className="mx-auto w-full max-w-(--w-content) px-6 py-24">
      {/* Bio / intro — leerob-style: name as the h1, then prose with inline links. */}
      <h1 className="text-2xl font-medium tracking-tight">Albert Tseng</h1>
      {/* Same string as the <meta> description on purpose — one source in
          lib/site.ts, so editing the tagline updates both. */}
      <p className="mt-1 italic text-muted">{SITE_DESCRIPTION}</p>

      <div className="mt-8 space-y-4 leading-relaxed">
        <p>
          I&apos;m a frontend developer from Taiwan, moving to Australia in
          September 2026 — and open to opportunities there. I believe curiosity
          compounds: I started out centering divs, and three years later
          I&apos;m writing Terraform for the infrastructure this blog runs on.
          The writing here is the interest it pays out.
        </p>
        <p>
          Outside of code, weekends go to reading and sitcoms: currently{" "}
          <em>Rick and Morty</em>, <em>How I Met Your Mother</em> three times
          over, and <em>The Big Bang Theory</em> forever on the list.
        </p>
      </div>

      <SocialLinks />

      {/* Writing */}
      <section className="mt-16">
        <h2 className="text-xl font-medium tracking-tight">Writing</h2>
        <ul className="mt-6 space-y-8">
          {posts.map((post) => (
            <li key={post.slug} className="group">
              <Link href={`/blog/${post.slug}`} className="block">
                <time
                  dateTime={post.date || undefined}
                  className="font-sans text-sm text-muted"
                >
                  {post.date}
                </time>
                {/* Same ViewTransition name as the post page's h1: the browser
                    pairs the two snapshots by name during navigation and
                    animates position + size, so the title visibly travels into
                    the article header instead of being swapped out. The title
                    is deliberately the ONLY paired element — date sits above
                    the title here but below it on the post page, so pairing it
                    too made the two elements cross paths mid-flight.
                    share="morph" tags the pair for the timing CSS in
                    globals.css.
                    default="none" holds the OTHER posts still. Only the clicked
                    post's title is paired across the navigation; every other
                    title here is a named transition that exists on this page
                    only, and an unpaired name falls back to `default`, which is
                    "auto" — React's own crossfade. So clicking one post also
                    animated the titles you didn't click, at the browser's
                    default timing rather than our motion tokens (the CSS above
                    only targets .morph). The stray animations also multiply as
                    posts are added. Keep share="morph" explicit alongside it:
                    with default="none" and no share, the pair stops morphing. */}
                <ViewTransition
                  name={`post-title-${post.slug}`}
                  share="morph"
                  default="none"
                >
                  <h3 className="mt-1 text-lg font-medium tracking-tight group-hover:underline">
                    {post.title}
                  </h3>
                </ViewTransition>
                {post.description && (
                  <p className="mt-1 italic text-muted">{post.description}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
