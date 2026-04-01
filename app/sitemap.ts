import type { MetadataRoute } from "next";
import articlesData from "@/domains/learn/articles.json";

const BASE_URL = "https://www.systemdesignlearner.com";

const PRACTICE_SLUGS = [
  "url-shortener",
  "pastebin",
  "rate-limiter",
  "notification-system",
  "design-whatsapp",
  "leaderboard",
  "job-scheduler",
  "payment-system",
  "design-dropbox",
  "design-web-crawler",
];
// Only include intro pages — non-intro steps are gated behind user progress
// and will redirect crawlers back to intro (access control)
const PRACTICE_STEPS = ["intro"];

export default function sitemap(): MetadataRoute.Sitemap {
  // Fixed date for pages that rarely change — avoids a new lastModified on every build
  const staticDate = new Date("2025-06-01");

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}`, lastModified: staticDate, changeFrequency: "daily", priority: 1.0 },
    {
      url: `${BASE_URL}/practice`,
      lastModified: staticDate,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: staticDate,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: staticDate,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: staticDate,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: staticDate,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/cookies`,
      lastModified: staticDate,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/feedback`,
      lastModified: staticDate,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const learnPages: MetadataRoute.Sitemap = articlesData.articles.map((article) => ({
    url: `${BASE_URL}/learn/${article.slug}`,
    lastModified: new Date(article.date),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const practicePages: MetadataRoute.Sitemap = PRACTICE_SLUGS.flatMap((slug) =>
    PRACTICE_STEPS.map((step) => ({
      url: `${BASE_URL}/practice/${slug}/${step}`,
      lastModified: staticDate,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }))
  );

  return [...staticPages, ...learnPages, ...practicePages];
}
