import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeToggle } from "./theme-toggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Albert's Blog",
    template: "%s · Albert's Blog",
  },
  description: "開發與雲端學習筆記",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: next-themes sets the `class` on <html> before
    // React hydrates, so the server/client attributes intentionally differ.
    <html
      lang="zh-Hant"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <header className="border-b border-zinc-200 dark:border-zinc-800">
            <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-4">
              <Link href="/" className="font-semibold tracking-tight">
                Albert&apos;s Blog
              </Link>
              <ThemeToggle />
            </div>
          </header>
          <div className="flex-1">{children}</div>
          <footer className="border-t border-zinc-200 dark:border-zinc-800">
            <div className="mx-auto w-full max-w-2xl px-6 py-6 text-sm text-zinc-500">
              © {new Date().getFullYear()} Albert · Built with Next.js
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
