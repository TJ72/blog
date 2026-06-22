import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export default function Home() {
  const posts = getAllPosts();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">部落格</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        紀錄我的開發與雲端學習筆記。
      </p>

      <ul className="mt-10 space-y-8">
        {posts.map((post) => (
          <li key={post.slug} className="group">
            <Link href={`/blog/${post.slug}`} className="block">
              <time className="text-sm text-zinc-500">{post.date}</time>
              <h2 className="mt-1 text-xl font-semibold tracking-tight group-hover:underline">
                {post.title}
              </h2>
              {post.description && (
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">
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
