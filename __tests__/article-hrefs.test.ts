import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import articlesData from "../domains/learn/articles.json";

// ── Helpers ──────────────────────────────────────────────────────────

/** Mirrors the headingToId function from domains/learn/utils.tsx */
function headingToId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/** Extract all ## and ### headings from a markdown file and return their generated IDs */
function extractHeadingIds(markdownContent: string): Set<string> {
  const headingRegex = /^#{2,3}\s+(.+)$/gm;
  const ids = new Set<string>();
  let match;
  while ((match = headingRegex.exec(markdownContent)) !== null) {
    // Strip bold markers (**text**) the same way processMarkdownContent does
    const cleanedText = match[1].replace(/\*\*(.+?)\*\*/g, "$1").trim();
    ids.add(headingToId(cleanedText));
  }
  return ids;
}

// ── Data loading ─────────────────────────────────────────────────────

const articlesDir = path.join(process.cwd(), "domains/learn/articles");
const problemsDir = path.join(process.cwd(), "packages/problems");

const validSlugs = new Set(articlesData.articles.map((a) => a.slug));

/** Map from slug to the set of valid heading IDs in that article's markdown */
const slugToHeadingIds = new Map<string, Set<string>>();
for (const article of articlesData.articles) {
  const filePath = path.join(articlesDir, article.markdownFile);
  const content = fs.readFileSync(filePath, "utf8");
  slugToHeadingIds.set(article.slug, extractHeadingIds(content));
}

/** Map from slug to tableOfContents IDs in articles.json */
const slugToTocIds = new Map<string, Set<string>>();
for (const article of articlesData.articles) {
  slugToTocIds.set(article.slug, new Set(article.tableOfContents.map((entry) => entry.id)));
}

// ── Extract all /learn/ hrefs from markdown articles ─────────────────

type HrefLocation = {
  file: string;
  line: number;
  slug: string;
  fragment: string | null;
  linkText: string | null;
};

function extractMarkdownHrefs(): HrefLocation[] {
  const hrefs: HrefLocation[] = [];
  const mdFiles = fs.readdirSync(articlesDir).filter((f) => f.endsWith(".md"));

  for (const file of mdFiles) {
    const filePath = path.join(articlesDir, file);
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      // Match markdown links: [text](/learn/slug) or [text](/learn/slug#fragment)
      const linkRegex = /\[([^\]]+)\]\(\/learn\/([a-z0-9-]+)(?:#([a-z0-9-]+))?\)/g;
      let match;
      while ((match = linkRegex.exec(lines[i])) !== null) {
        hrefs.push({
          file,
          line: i + 1,
          linkText: match[1],
          slug: match[2],
          fragment: match[3] || null,
        });
      }
    }
  }
  return hrefs;
}

// ── Extract all /learn/ hrefs from problem .ts files ─────────────────

function extractProblemHrefs(): HrefLocation[] {
  const hrefs: HrefLocation[] = [];
  const tsFiles = fs
    .readdirSync(problemsDir)
    .filter((f) => f.endsWith(".ts") && f !== "article-links.ts");

  for (const file of tsFiles) {
    const filePath = path.join(problemsDir, file);
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      // Match href: "/learn/slug#fragment" or href: "/learn/slug"
      const hrefRegex = /href:\s*"\/learn\/([a-z0-9-]+)(?:#([a-z0-9-]+))?"/g;
      let match;
      while ((match = hrefRegex.exec(lines[i])) !== null) {
        hrefs.push({
          file,
          line: i + 1,
          linkText: null,
          slug: match[1],
          fragment: match[2] || null,
        });
      }
    }
  }
  return hrefs;
}

// ── Tests ────────────────────────────────────────────────────────────

describe("Article href validation", () => {
  const markdownHrefs = extractMarkdownHrefs();
  const problemHrefs = extractProblemHrefs();

  // ── articles.json integrity ──────────────────────────────────────

  describe("articles.json integrity", () => {
    it("every article has a unique slug", () => {
      const slugs = articlesData.articles.map((a) => a.slug);
      const duplicates = slugs.filter((s, i) => slugs.indexOf(s) !== i);
      expect(duplicates).toEqual([]);
    });

    it("every article markdown file exists on disk", () => {
      for (const article of articlesData.articles) {
        const filePath = path.join(articlesDir, article.markdownFile);
        expect(
          fs.existsSync(filePath),
          `${article.slug}: markdown file "${article.markdownFile}" does not exist`
        ).toBe(true);
      }
    });

    it("every category article slug references a valid article", () => {
      for (const category of articlesData.categories) {
        for (const ref of category.articles) {
          expect(
            validSlugs.has(ref.slug),
            `category "${category.id}" references unknown slug "${ref.slug}"`
          ).toBe(true);
        }
      }
    });

    describe("tableOfContents IDs match actual markdown headings", () => {
      for (const article of articlesData.articles) {
        const headingIds = slugToHeadingIds.get(article.slug)!;
        for (const tocEntry of article.tableOfContents) {
          it(`${article.slug}: ToC entry "${tocEntry.id}" exists as a heading in markdown`, () => {
            expect(
              headingIds.has(tocEntry.id),
              `"${article.slug}" tableOfContents has id "${tocEntry.id}" ` +
                `but no matching heading found in ${article.markdownFile}. ` +
                `Available heading IDs: ${[...headingIds].join(", ")}`
            ).toBe(true);
          });
        }
      }
    });
  });

  // ── Markdown cross-links ─────────────────────────────────────────

  describe("markdown article cross-links", () => {
    it("found cross-links to validate", () => {
      expect(markdownHrefs.length).toBeGreaterThan(0);
    });

    describe("every /learn/ slug references a valid article", () => {
      for (const href of markdownHrefs) {
        it(`${href.file}:${href.line} -> /learn/${href.slug}`, () => {
          expect(
            validSlugs.has(href.slug),
            `"${href.file}" line ${href.line}: links to unknown slug "${href.slug}". ` +
              `Valid slugs: ${[...validSlugs].join(", ")}`
          ).toBe(true);
        });
      }
    });

    describe("every #fragment references a valid heading ID in the target article", () => {
      const withFragments = markdownHrefs.filter((h) => h.fragment !== null);

      for (const href of withFragments) {
        it(`${href.file}:${href.line} -> /learn/${href.slug}#${href.fragment}`, () => {
          const headingIds = slugToHeadingIds.get(href.slug);
          expect(
            headingIds,
            `cannot validate fragment: slug "${href.slug}" not found`
          ).toBeDefined();
          expect(
            headingIds!.has(href.fragment!),
            `"${href.file}" line ${href.line}: fragment "#${href.fragment}" ` +
              `does not match any heading in "${href.slug}". ` +
              `Available heading IDs: ${[...headingIds!].join(", ")}`
          ).toBe(true);
        });
      }
    });
  });

  // ── Problem file hint hrefs ──────────────────────────────────────

  describe("problem file hint hrefs", () => {
    it("found problem hrefs to validate", () => {
      expect(problemHrefs.length).toBeGreaterThan(0);
    });

    describe("every /learn/ slug references a valid article", () => {
      // Deduplicate to avoid hundreds of identical test cases
      const uniqueSlugs = [...new Set(problemHrefs.map((h) => h.slug))];

      for (const slug of uniqueSlugs) {
        it(`slug "${slug}" exists in articles.json`, () => {
          expect(
            validSlugs.has(slug),
            `Problem files reference unknown slug "${slug}". ` +
              `Valid slugs: ${[...validSlugs].join(", ")}`
          ).toBe(true);
        });
      }
    });

    describe("every #fragment references a valid heading ID in the target article", () => {
      // Deduplicate slug#fragment pairs
      const seen = new Set<string>();
      const uniqueFragmentHrefs = problemHrefs.filter((h) => {
        if (!h.fragment) return false;
        const key = `${h.slug}#${h.fragment}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      for (const href of uniqueFragmentHrefs) {
        it(`/learn/${href.slug}#${href.fragment} (${href.file}:${href.line})`, () => {
          const headingIds = slugToHeadingIds.get(href.slug);
          expect(
            headingIds,
            `cannot validate fragment: slug "${href.slug}" not found`
          ).toBeDefined();
          expect(
            headingIds!.has(href.fragment!),
            `"${href.file}" line ${href.line}: fragment "#${href.fragment}" ` +
              `does not match any heading in "${href.slug}". ` +
              `Available heading IDs: ${[...headingIds!].join(", ")}`
          ).toBe(true);
        });
      }
    });
  });

  // ── buildLinks slug validation ───────────────────────────────────

  describe("buildLinks slug references", () => {
    it("every slug passed to buildLinks exists in articles.json", () => {
      const tsFiles = fs
        .readdirSync(problemsDir)
        .filter((f) => f.endsWith(".ts") && f !== "article-links.ts");

      for (const file of tsFiles) {
        const filePath = path.join(problemsDir, file);
        const content = fs.readFileSync(filePath, "utf8");

        // Match buildLinks(["slug-1", "slug-2", ...])
        const buildLinksRegex = /buildLinks\(\[([^\]]+)\]\)/g;
        let match;
        while ((match = buildLinksRegex.exec(content)) !== null) {
          const slugsStr = match[1];
          const slugRegex = /"([^"]+)"/g;
          let slugMatch;
          while ((slugMatch = slugRegex.exec(slugsStr)) !== null) {
            const slug = slugMatch[1];
            expect(
              validSlugs.has(slug),
              `${file}: buildLinks references unknown slug "${slug}"`
            ).toBe(true);
          }
        }
      }
    });
  });
});
