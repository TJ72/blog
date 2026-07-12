"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react";

/** Client wrapper around rehype-pretty-code's <pre>: the Shiki-highlighted
 *  children stay server-rendered; this island only adds the copy button.
 *  Text is read from the DOM at click time, so the source isn't duplicated
 *  into the HTML. The button sits on the wrapper, NOT inside the <pre>
 *  scroll container, so it stays put on horizontal scroll. */
export function CodeBlock(props: ComponentPropsWithoutRef<"pre">) {
  const preRef = useRef<HTMLPreElement>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const copy = () => {
    const text = preRef.current?.querySelector("code")?.textContent;
    if (!text) return;
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => setCopied(false), 1600);
      },
      () => {},
    );
  };

  return (
    <div className="group relative">
      <pre ref={preRef} {...props} />
      {/* pointer-coarse: no hover on touch screens — show it always there. */}
      <button
        type="button"
        aria-label={copied ? "Copied" : "Copy code"}
        onClick={copy}
        className="absolute right-2 top-2 rounded-md border border-line bg-paper p-1.5 text-muted opacity-0 transition-[opacity,color] duration-(--duration-fast) hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"
      >
        {copied ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    </div>
  );
}
