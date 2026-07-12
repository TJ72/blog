"use client";

import { useEffect, useRef, useState } from "react";
import type { Heading } from "@/lib/toc";

// Reading line: the section whose heading most recently crossed this line is
// the one being read. The same 6rem as the headings' scroll-margin-top in
// globals.css, converted from the live root font size so both move together.
const READING_LINE_REM = 6;

// A TOC jump lands its heading exactly ON the line, and subpixel rounding
// decides such ties unpredictably — the slack makes "at the line" count.
const LANDING_SLACK_PX = 8;

/** Active-section highlight for the article TOC. Two layers decide it:
 *
 *  1. GEOMETRY — the reading-line rule, plus an end-zone stretch: headings
 *     the page can't scroll far enough to reach still activate, in order,
 *     as the remaining travel is mapped onto them.
 *  2. INTENT — a click or #fragment arrival pins its target. Clamped at the
 *     bottom, geometry can't tell which unreachable entry was chosen; the
 *     pin holds until the reader scrolls by hand.
 *
 *  Driven by a passive scroll listener, not an IntersectionObserver:
 *  reaching the end of the page crosses nothing an observer watches. */
export function TableOfContents({ headings }: { headings: Heading[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef<string | null>(null);
  // Active id and indicator position are one state, measured together. When
  // nothing is active the bar keeps its last position and only fades.
  const [active, setActive] = useState<{
    id: string | null;
    top: number;
    height: number;
  }>({ id: null, top: 0, height: 0 });

  useEffect(() => {
    const targets = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element !== null);
    if (targets.length === 0) return;

    const applyActive = (current: string | null) => {
      const link = current
        ? listRef.current?.querySelector<HTMLAnchorElement>(
            `a[href="#${current}"]`,
          )
        : null;
      // Offsets are relative to the positioned wrapper (listRef).
      const next = link
        ? { id: current, top: link.offsetTop, height: link.offsetHeight }
        : null;
      // Runs every scroll frame: return the SAME object when nothing changed
      // so React bails out instead of re-rendering.
      setActive((prev) => {
        if (next) {
          return prev.id === next.id &&
            prev.top === next.top &&
            prev.height === next.height
            ? prev
            : next;
        }
        return prev.id === current ? prev : { ...prev, id: current };
      });
    };

    const geometricActive = (): string | null => {
      const scrollY = window.scrollY;
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      const readingLine =
        READING_LINE_REM *
        parseFloat(getComputedStyle(document.documentElement).fontSize);
      // The scroll position at which each heading reaches the reading line,
      // from fresh rects so layout shifts can't leave stale numbers behind.
      const activationPoints = targets.map(
        (element) =>
          element.getBoundingClientRect().top + scrollY - readingLine,
      );

      // End-zone stretch: activation points beyond maxScroll are unreachable
      // — map the real travel between the last reachable point and the
      // bottom onto the full span, so the tail activates proportionally.
      let effectiveScroll = scrollY;
      const lastPoint = activationPoints[activationPoints.length - 1];
      if (maxScroll > 0 && lastPoint > maxScroll) {
        let zoneStart = 0;
        for (const point of activationPoints) {
          if (point <= maxScroll) zoneStart = Math.max(zoneStart, point);
        }
        if (scrollY > zoneStart && maxScroll > zoneStart) {
          effectiveScroll =
            zoneStart +
            ((scrollY - zoneStart) * (lastPoint - zoneStart)) /
              (maxScroll - zoneStart);
        }
      }

      // Active = the last heading whose activation point has been passed.
      let current: string | null = null;
      activationPoints.forEach((point, i) => {
        if (point <= effectiveScroll + LANDING_SLACK_PX) {
          current = targets[i].id;
        }
      });
      return current;
    };

    const recompute = () => {
      // Below xl the gutter is display:none (offsetParent === null) but the
      // component still mounts — skip the work; resize re-enters.
      if (listRef.current?.offsetParent === null) return;
      // Never release a pin on geometric agreement: the click's own smooth
      // scroll sweeps THROUGH the target's zone on its way to a clamped
      // landing, and that transient agreement would spend the pin mid-flight.
      if (pinnedRef.current !== null) {
        applyActive(pinnedRef.current);
        return;
      }
      applyActive(geometricActive());
    };

    // A reader gesture overrides any pin. (A scrollbar drag emits none of
    // the gesture events; that pin lingers harmlessly until the next one.)
    const releasePin = () => {
      if (pinnedRef.current === null) return;
      pinnedRef.current = null;
      recompute();
    };

    // Delegated so the pin applies through the same measured path recompute
    // uses; default anchor behavior still runs.
    const onListClick = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.("a[href^='#']");
      if (!link) return;
      pinnedRef.current = link.getAttribute("href")!.slice(1);
      applyActive(pinnedRef.current);
    };

    // A #fragment (deep link, back/forward) names a section like a click.
    const pinFromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!targets.some((element) => element.id === id)) return;
      pinnedRef.current = id;
      applyActive(id);
    };

    const listElement = listRef.current;
    window.addEventListener("scroll", recompute, { passive: true });
    window.addEventListener("resize", recompute);
    window.addEventListener("hashchange", pinFromHash);
    window.addEventListener("wheel", releasePin, { passive: true });
    window.addEventListener("touchstart", releasePin, { passive: true });
    window.addEventListener("keydown", releasePin);
    window.addEventListener("pointerdown", releasePin);
    listElement?.addEventListener("click", onListClick);
    // Initial state, deferred a frame so the effect body itself doesn't set
    // state synchronously.
    const initialFrame = requestAnimationFrame(() => {
      if (window.location.hash) pinFromHash();
      recompute();
    });

    return () => {
      window.removeEventListener("scroll", recompute);
      window.removeEventListener("resize", recompute);
      window.removeEventListener("hashchange", pinFromHash);
      window.removeEventListener("wheel", releasePin);
      window.removeEventListener("touchstart", releasePin);
      window.removeEventListener("keydown", releasePin);
      window.removeEventListener("pointerdown", releasePin);
      listElement?.removeEventListener("click", onListClick);
      cancelAnimationFrame(initialFrame);
    };
  }, [headings]);

  return (
    <nav aria-label="Table of contents" className="font-sans text-sm">
      <h2 className="text-xs font-medium uppercase tracking-widest text-faint">
        On this page
      </h2>
      <div ref={listRef} className="relative mt-4">
        {/* One continuous object the eye can track between two actives —
            colour alone changes in two disconnected places. aria-hidden: it
            only repeats what aria-current already says. */}
        <span
          aria-hidden="true"
          className="absolute left-0 w-0.5 bg-ink motion-safe:transition-[top,height,opacity] duration-(--duration) ease-(--ease-standard)"
          style={{
            top: active.top,
            height: active.height,
            opacity: active.id ? 1 : 0,
          }}
        />
        <ul className="space-y-2.5 border-l border-line">
          {headings.map((heading) => (
            <li key={heading.id}>
              {/* font-weight interpolates only because Geist is a variable
                  font; a non-variable fallback snaps, which is fine. */}
              <a
                href={`#${heading.id}`}
                aria-current={
                  active.id === heading.id ? "location" : undefined
                }
                className={`block leading-snug transition-[color,font-weight] duration-(--duration-fast) ${
                  heading.depth === 3 ? "pl-7" : "pl-4"
                } ${
                  active.id === heading.id
                    ? "font-medium text-ink"
                    : "text-muted hover:text-ink"
                }`}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
