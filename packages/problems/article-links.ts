/**
 * Derive practice-problem "Recommended Reading" links from articles.json
 * (single source of truth for article titles and slugs).
 */
import articlesData from "../../domains/learn/articles.json";

type ProblemLink = { label: string; href: string };

const articlesBySlug = Object.fromEntries(
  articlesData.articles.map((a) => [a.slug, { title: a.title, href: `/learn/${a.slug}` }])
);

/** Build links array from article slugs — keeps titles in sync with articles.json */
export function buildLinks(slugs: string[]): ProblemLink[] {
  return slugs.map((slug) => {
    const article = articlesBySlug[slug];
    if (!article) throw new Error(`Unknown article slug in problem links: "${slug}"`);
    return { label: article.title, href: article.href };
  });
}
