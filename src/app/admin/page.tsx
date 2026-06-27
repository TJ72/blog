import { isAuthed } from "@/lib/auth";
import { viewCounter } from "@/lib/store";

// Reads a cookie + the view counter, so it must render dynamically; the counter's
// backend needs the Node runtime (not Edge). Keep it out of search engines.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  if (!(await isAuthed())) {
    return (
      <main className="mx-auto w-full max-w-(--w-content) px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Admin login</h1>
        <p className="mt-2 text-sm text-muted">
          Enter the admin password to view stats.
        </p>
        {error ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">
            Wrong password. Please try again.
          </p>
        ) : null}
        <form method="post" action="/api/admin/login" className="mt-6 flex gap-2">
          <input
            type="password"
            name="password"
            placeholder="Admin password"
            autoComplete="current-password"
            required
            className="flex-1 rounded-md border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-muted"
          />
          <button
            type="submit"
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            Sign in
          </button>
        </form>
      </main>
    );
  }

  const views = await viewCounter.get();

  return (
    <main className="mx-auto w-full max-w-(--w-content) px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <form method="post" action="/api/admin/logout">
          <button
            type="submit"
            className="text-sm text-muted underline-offset-4 hover:underline"
          >
            Sign out
          </button>
        </form>
      </div>
      <div className="mt-8 rounded-lg border border-line p-6">
        <p className="text-sm text-muted">CV views / downloads</p>
        <p className="mt-1 text-5xl font-bold tabular-nums">{views}</p>
      </div>
      <p className="mt-6 text-xs text-faint">Source: Firestore · live read</p>
    </main>
  );
}
