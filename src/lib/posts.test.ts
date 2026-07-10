import { beforeEach, describe, expect, it, vi } from "vitest";

// posts.ts reads the real content/ dir via node:fs. We mock fs so the
// parsing/sorting logic is exercised against in-memory MDX — no real files, no
// dependence on the actual posts. gray-matter still does the real frontmatter
// parsing; only fs is faked. vi.hoisted makes the shared state available inside
// the (hoisted) mock factory.
const mock = vi.hoisted(() => ({
  files: new Map<string, string>(), // "<name>.mdx" -> raw file contents
  dirExists: true,
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const basename = (p: string) => p.split(/[/\\]/).pop() ?? "";
  const mocked = {
    ...actual,
    existsSync: (p: string) => {
      const base = basename(p);
      if (mock.files.has(base)) return true; // a known post file
      return mock.dirExists && !base.includes("."); // the posts dir itself
    },
    readdirSync: () => [...mock.files.keys()],
    readFileSync: (p: string) => {
      const contents = mock.files.get(basename(p));
      if (contents === undefined) {
        throw Object.assign(new Error(`ENOENT: ${p}`), { code: "ENOENT" });
      }
      return contents;
    },
  };
  return { ...mocked, default: mocked };
});

import {
  getAllPosts,
  getPostBySlug,
  getPostSlugs,
  getRelatedPosts,
  postExists,
} from "./posts";

beforeEach(() => {
  mock.files.clear();
  mock.dirExists = true;
});

function writePost(name: string, contents: string) {
  mock.files.set(name, contents);
}

describe("getPostSlugs", () => {
  it("returns slugs of .mdx files and ignores anything else", () => {
    writePost("alpha.mdx", "---\ntitle: Alpha\n---\nbody");
    writePost("beta.mdx", "---\ntitle: Beta\n---\nbody");
    writePost("notes.txt", "ignore me");
    writePost("draft.md", "ignore me too"); // .md, not .mdx
    expect(getPostSlugs().sort()).toEqual(["alpha", "beta"]);
  });

  it("returns [] when the posts dir doesn't exist", () => {
    mock.dirExists = false;
    expect(getPostSlugs()).toEqual([]);
  });
});

describe("postExists", () => {
  it("is true for an existing post and false otherwise", () => {
    writePost("hello.mdx", '---\ntitle: "Hi"\n---\nx');
    expect(postExists("hello")).toBe(true);
    expect(postExists("nope")).toBe(false);
  });
});

describe("getPostBySlug", () => {
  it("parses full frontmatter (quoted dates/tags, matching real posts)", () => {
    writePost(
      "full.mdx",
      [
        "---",
        'title: "Full Post"',
        'date: "2026-01-02"',
        'description: "A desc"',
        'tags: ["a", "b"]',
        "---",
        "Hello body",
      ].join("\n"),
    );
    const { meta, content } = getPostBySlug("full");
    expect(meta).toEqual({
      slug: "full",
      title: "Full Post",
      date: "2026-01-02",
      description: "A desc",
      tags: ["a", "b"],
    });
    expect(content.trim()).toBe("Hello body");
  });

  it("normalizes an unquoted YAML date (parsed as a Date object) to the ISO day", () => {
    // No quotes around the date: YAML resolves it to a Date object, the exact
    // frontmatter mistake this guards against.
    writePost("unquoted.mdx", '---\ntitle: "U"\ndate: 2026-01-02\n---\nx');
    expect(getPostBySlug("unquoted").meta.date).toBe("2026-01-02");
  });

  it("falls back sensibly when fields are missing or the wrong type", () => {
    // No title, no date; description is a number and tags is a bare string —
    // both wrong types, so both should drop to undefined.
    writePost("bare.mdx", "---\ndescription: 123\ntags: nope\n---\nbody");
    const { meta } = getPostBySlug("bare");
    expect(meta.title).toBe("bare"); // falls back to the slug
    expect(meta.date).toBe(""); // missing → ""
    expect(meta.description).toBeUndefined(); // 123 is not a string
    expect(meta.tags).toBeUndefined(); // "nope" is not an array
  });
});

describe("getAllPosts", () => {
  it("sorts posts newest first by date", () => {
    writePost("old.mdx", '---\ntitle: "Old"\ndate: "2020-01-01"\n---\nx');
    writePost("new.mdx", '---\ntitle: "New"\ndate: "2026-01-01"\n---\nx');
    writePost("mid.mdx", '---\ntitle: "Mid"\ndate: "2023-06-15"\n---\nx');
    expect(getAllPosts().map((p) => p.slug)).toEqual(["new", "mid", "old"]);
  });

  it("breaks a date tie by slug, so the order is deterministic", () => {
    // Insert in reverse-alphabetical order to prove the sort (not the
    // filesystem enumeration order) decides the outcome.
    writePost("zebra.mdx", '---\ntitle: "Z"\ndate: "2026-01-01"\n---\nx');
    writePost("apple.mdx", '---\ntitle: "A"\ndate: "2026-01-01"\n---\nx');
    expect(getAllPosts().map((p) => p.slug)).toEqual(["apple", "zebra"]);
  });
});

describe("getRelatedPosts", () => {
  it("excludes the current post and ranks candidates by shared-tag count", () => {
    writePost(
      "current.mdx",
      '---\ntitle: "C"\ndate: "2026-07-01"\ntags: ["nextjs", "react"]\n---\nx',
    );
    // two-tags is OLDER than one-tag: overlap must beat recency.
    writePost(
      "two-tags.mdx",
      '---\ntitle: "T"\ndate: "2026-01-01"\ntags: ["nextjs", "react"]\n---\nx',
    );
    writePost(
      "one-tag.mdx",
      '---\ntitle: "O"\ndate: "2026-06-01"\ntags: ["nextjs", "gcp"]\n---\nx',
    );
    writePost(
      "no-overlap.mdx",
      '---\ntitle: "N"\ndate: "2026-06-15"\ntags: ["aws"]\n---\nx',
    );
    expect(getRelatedPosts("current").map((p) => p.slug)).toEqual([
      "two-tags",
      "one-tag",
      "no-overlap",
    ]);
  });

  it("falls back to newest-first when nothing overlaps (or posts are untagged)", () => {
    writePost("current.mdx", '---\ntitle: "C"\ndate: "2026-07-01"\n---\nx');
    writePost("older.mdx", '---\ntitle: "A"\ndate: "2025-01-01"\n---\nx');
    writePost("newer.mdx", '---\ntitle: "B"\ndate: "2026-06-01"\n---\nx');
    expect(getRelatedPosts("current").map((p) => p.slug)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("respects the limit", () => {
    writePost("current.mdx", '---\ntitle: "C"\ndate: "2026-07-01"\n---\nx');
    writePost("a.mdx", '---\ntitle: "A"\ndate: "2026-01-01"\n---\nx');
    writePost("b.mdx", '---\ntitle: "B"\ndate: "2026-02-01"\n---\nx');
    writePost("c.mdx", '---\ntitle: "X"\ndate: "2026-03-01"\n---\nx');
    expect(getRelatedPosts("current", 2)).toHaveLength(2);
  });

  it("returns [] when the current post is the only one (today's reality)", () => {
    writePost("current.mdx", '---\ntitle: "C"\ndate: "2026-07-01"\n---\nx');
    expect(getRelatedPosts("current")).toEqual([]);
  });
});
