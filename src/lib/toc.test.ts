import { describe, expect, it } from "vitest";
import { extractHeadings } from "./toc";

describe("extractHeadings", () => {
  it("extracts h2/h3 with depth, text, and github-slugger ids", () => {
    const content = [
      "Intro paragraph.",
      "",
      "## The download I skipped",
      "",
      "Body text.",
      "",
      "### A nested point",
    ].join("\n");

    expect(extractHeadings(content)).toEqual([
      { depth: 2, text: "The download I skipped", id: "the-download-i-skipped" },
      { depth: 3, text: "A nested point", id: "a-nested-point" },
    ]);
  });

  it("ignores h1 (post title) and h4+ (below TOC granularity)", () => {
    const content = ["# Title", "#### Fine print", "## Real section"].join(
      "\n",
    );

    expect(extractHeadings(content).map((h) => h.id)).toEqual([
      "real-section",
    ]);
  });

  it("skips comment lines inside fenced code blocks", () => {
    // yaml/hcl comments start with # — without fence tracking these would be
    // parsed as headings.
    const content = [
      "## Before the fence",
      "```yaml",
      "## not a heading, a yaml comment",
      "```",
      "## After the fence",
    ].join("\n");

    expect(extractHeadings(content).map((h) => h.text)).toEqual([
      "Before the fence",
      "After the fence",
    ]);
  });

  it("suffixes duplicate heading texts the way rehype-slug does", () => {
    const content = ["## Setup", "## Setup"].join("\n");

    expect(extractHeadings(content).map((h) => h.id)).toEqual([
      "setup",
      "setup-1",
    ]);
  });

  it("slugs from the visible text, stripping inline markdown", () => {
    const content = "## Notice those are `vars`, not **secrets**";

    expect(extractHeadings(content)).toEqual([
      {
        depth: 2,
        text: "Notice those are vars, not secrets",
        id: "notice-those-are-vars-not-secrets",
      },
    ]);
  });

  it("keeps intraword underscores — literal in markdown and in github ids", () => {
    expect(extractHeadings("## The mdx_components file")).toEqual([
      {
        depth: 2,
        text: "The mdx_components file",
        id: "the-mdx_components-file",
      },
    ]);
  });

  it("drops an ATX closing sequence (## Title ##)", () => {
    expect(extractHeadings("## Setup ##")).toEqual([
      { depth: 2, text: "Setup", id: "setup" },
    ]);
  });

  it("does not close a fence on a shorter marker — quoted fences stay content", () => {
    const content = [
      "````md",
      "```",
      "## quoted, not a heading",
      "```",
      "````",
      "## Real section",
    ].join("\n");

    expect(extractHeadings(content).map((h) => h.text)).toEqual([
      "Real section",
    ]);
  });

  it("returns an empty list for a post with no sections", () => {
    expect(extractHeadings("Just one paragraph.")).toEqual([]);
  });
});
