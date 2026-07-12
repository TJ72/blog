import type { Metadata } from "next";
import { Geist, Geist_Mono, STIX_Two_Text } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeToggle } from "./theme-toggle";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Primary serif reading face — STIX Two Text (leerob.com's serif): a clean text
// serif with well-behaved descenders (g/j/y), unlike Fraunces's quirky display
// cut. Used for BOTH body and headings (full-serif); hierarchy comes from
// weight/size/colour, not typeface. Variable font, so no weight needed; swap to
// Source_Serif_4 (ianjchiu.com's, slightly warmer) here in one line.
const stixTwoText = STIX_Two_Text({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Base for every relative URL in metadata below (and in child segments):
  // og:url, canonical, etc. all resolve against this.
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  // Defaults for link previews (Discord, LinkedIn, Slack, …). Post pages
  // override this with article-specific fields in their generateMetadata.
  openGraph: {
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    type: "website",
    url: "/",
  },
  // "summary" = compact text card; there's no og:image yet to justify the
  // large variant. X/Twitter needs this tag, other platforms read openGraph.
  twitter: {
    card: "summary",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: next-themes sets the `class` on <html> before
    // React hydrates, so the server/client attributes intentionally differ.
    // data-scroll-behavior: asks Next 16 to suppress our CSS smooth scrolling
    // during route transitions — navigation snaps to top instead of animating
    // under the view-transition morph; in-page anchors stay smooth.
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${stixTwoText.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>
          {/* Chrome-less, leerob-style: no header/footer. The theme control is
              the only persistent chrome — a small System/Light/Dark pill fixed
              bottom-right, reachable on every page. */}
          <div className="fixed bottom-4 right-12 z-(--z-overlay)">
            <ThemeToggle />
          </div>
          {children}
        </Providers>
      </body>
    </html>
  );
}
