import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export default function Home() {
  const posts = getAllPosts();

  return (
    <main className="mx-auto w-full max-w-[var(--w-content)] px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
      <p className="mt-2 text-muted">
        Notes on software development and learning the cloud.
      </p>

      <ul className="mt-10 space-y-8">
        {posts.map((post) => (
          <li key={post.slug} className="group">
            <Link href={`/blog/${post.slug}`} className="block">
              <time className="text-sm text-muted">{post.date}</time>
              <h2 className="mt-1 text-xl font-semibold tracking-tight group-hover:underline">
                {post.title}
              </h2>
              {post.description && (
                <p className="mt-1 text-muted">
                  {post.description}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
