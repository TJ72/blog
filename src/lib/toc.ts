import GithubSlugger from "github-slugger";

/** One entry of a post's table of contents. */
export type Heading = {
  depth: 2 | 3;
  text: string;
  id: string;
};

/** The h2/h3 headings of a post body, each with the id rehype-slug will stamp
 *  on the rendered element — computed with github-slugger, the same library
 *  rehype-slug uses, so link and target can't drift. h1 is the post title;
 *  h4+ is below TOC granularity. */
export function extractHeadings(content: string): Heading[] {
  // Fresh slugger per document: repeats get -1, -2 — as rehype-slug does.
  const slugger = new GithubSlugger();
  const headings: Heading[] = [];
  // A `#` inside a code fence is a comment, not a heading. Closing a fence
  // needs the same char and at least the opening's length (CommonMark), so
  // a quoted ``` inside a ```` fence stays content.
  let fence: { char: string; length: number } | null = null;

  for (const line of content.split("\n")) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) {
      if (fence === null) {
        fence = { char: marker[0], length: marker.length };
        continue;
      }
      if (marker[0] === fence.char && marker.length >= fence.length) {
        fence = null;
        continue;
      }
    }
    if (fence !== null) continue;

    const match = /^(#{2,3})\s+(.*\S)/.exec(line);
    if (!match) continue;

    // Slug the VISIBLE text, as rehype-slug sees it: drop an ATX closing
    // sequence (`## Title ##`), collapse [label](url), strip `/*. Underscores
    // stay — intraword `_` is literal markdown (snake_case) and slugs keep it.
    const text = match[2]
      .replace(/\s+#+\s*$/, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[`*]/g, "")
      .trim();

    headings.push({
      depth: match[1].length as 2 | 3,
      text,
      id: slugger.slug(text),
    });
  }

  return headings;
}
