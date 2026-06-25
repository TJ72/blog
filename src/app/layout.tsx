import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
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

// Serif display face for big headings (--font-display). Variable font, so no
// weight needed; swap to Newsreader / Instrument_Serif here in one line later.
const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Albert's Blog",
    template: "%s · Albert's Blog",
  },
  description: "Notes on software development and learning the cloud.",
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
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <header className="border-b border-line">
            <div className="mx-auto flex w-full max-w-[var(--w-content)] items-center justify-between px-6 py-4">
              <Link href="/" className="font-semibold tracking-tight">
                Albert&apos;s Blog
              </Link>
              <div className="flex items-center gap-4">
                <a
                  href="/api/cv"
                  target="_blank"
                  rel="noopener"
                  className="text-sm text-muted hover:underline"
                >
                  CV
                </a>
                <ThemeToggle />
              </div>
            </div>
          </header>
          <div className="flex-1">{children}</div>
          <footer className="border-t border-line">
            <div className="mx-auto w-full max-w-[var(--w-content)] px-6 py-6 text-sm text-muted">
              © {new Date().getFullYear()} Albert · Built with Next.js
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
