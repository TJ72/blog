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

import { getAllPosts, getPostBySlug, getPostSlugs, postExists } from "./posts";

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
});
