"use client";

import { useEffect } from "react";

/** Copies a section's full URL when its `#` anchor (injected at build time
 *  by rehype-autolink-headings) is clicked — one delegated listener, not an
 *  island per heading. The anchors are static server markup React never
 *  reconciles, so the ✓ feedback can mutate them in place. Without JS they
 *  still work as plain fragment links. */
export function HeadingAnchors() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.("a.heading-anchor");
      if (!anchor) return;
      // Default navigation still runs (hash + smooth scroll + TOC pin);
      // the copy rides along.
      const url = new URL(anchor.getAttribute("href")!, window.location.href);
      navigator.clipboard.writeText(url.toString()).then(
        () => {
          if (anchor.textContent === "✓") return;
          const original = anchor.textContent;
          anchor.textContent = "✓";
          window.setTimeout(() => {
            anchor.textContent = original;
          }, 1600);
        },
        () => {},
      );
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
