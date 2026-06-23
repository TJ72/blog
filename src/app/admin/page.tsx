import { isAuthed } from "@/lib/auth";
import { getCvViews } from "@/lib/gcp";

// Reads a cookie + Firestore, so it must render dynamically on the Node runtime
// (the GCP SDK needs Node). Keep it out of search engines.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "後台", robots: { index: false } };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  if (!(await isAuthed())) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">後台登入</h1>
        <p className="mt-2 text-sm text-zinc-500">輸入管理密碼以查看統計。</p>
        {error ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">
            密碼錯誤，請再試一次。
          </p>
        ) : null}
        <form method="post" action="/api/admin/login" className="mt-6 flex gap-2">
          <input
            type="password"
            name="password"
            placeholder="管理密碼"
            autoComplete="current-password"
            required
            className="flex-1 rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
          />
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            登入
          </button>
        </form>
      </main>
    );
  }

  const views = await getCvViews();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">後台</h1>
        <form method="post" action="/api/admin/logout">
          <button
            type="submit"
            className="text-sm text-zinc-500 underline-offset-4 hover:underline"
          >
            登出
          </button>
        </form>
      </div>
      <div className="mt-8 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <p className="text-sm text-zinc-500">CV 瀏覽 / 下載次數</p>
        <p className="mt-1 text-5xl font-bold tabular-nums">{views}</p>
      </div>
      <p className="mt-6 text-xs text-zinc-400">資料來源：Firestore · 即時讀取</p>
    </main>
  );
}
