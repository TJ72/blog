import type { Metadata } from "next";
import { Geist, Geist_Mono, STIX_Two_Text } from "next/font/google";
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
      className={`${geistSans.variable} ${geistMono.variable} ${stixTwoText.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>
          {/* Chrome-less, leerob-style: no header/footer. The theme toggle is the
              only persistent control — a subtle fixed button in the top-right,
              reachable on every page. */}
          <div className="fixed right-3 top-3 z-50 rounded-md bg-paper/70 backdrop-blur-sm">
            <ThemeToggle />
          </div>
          {children}
        </Providers>
      </body>
    </html>
  );
}
