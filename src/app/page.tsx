import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { SITE_DESCRIPTION } from "@/lib/site";
import { SocialLinks } from "./social-links";

// Inline-link style for the bio prose — leerob's understated underline.
const link =
  "underline decoration-faint underline-offset-[3px] transition-colors hover:decoration-ink";

export default function Home() {
  const posts = getAllPosts();

  return (
    <main className="mx-auto w-full max-w-(--w-content) px-6 py-24">
      {/* Bio / intro — leerob-style: name as the h1, then prose with inline links. */}
      <h1 className="text-2xl font-medium tracking-tight">Albert Tseng</h1>
      {/* Same string as the <meta> description on purpose — one source in
          lib/site.ts, so editing the tagline updates both. */}
      <p className="mt-1 italic text-muted">{SITE_DESCRIPTION}</p>

      {/* TODO(Albert): replace this placeholder bio with your own words + links. */}
      <div className="mt-8 space-y-4 leading-relaxed">
        <p>
          I&apos;m a frontend developer based in Taiwan, currently going deep on
          cloud and deployment. This site is my playground for that — built from
          scratch with{" "}
          <a
            className={link}
            href="https://nextjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Next.js
          </a>{" "}
          and shipped to Google Cloud Run. I&apos;m also studying for the AWS
          Solutions Architect Associate exam.
        </p>
        <p>
          Outside of code, I&apos;m into{" "}
          <span className="text-faint">⟨your interests here⟩</span>. You can find
          me on{" "}
          <a
            className={link}
            href="https://github.com/TJ72"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          , or read my{" "}
          <a className={link} href="/api/cv" target="_blank" rel="noopener">
            CV
          </a>
          .
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
      </section>
    </main>
  );
}
