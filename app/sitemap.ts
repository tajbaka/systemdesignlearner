import type { MetadataRoute } from "next";
import articlesData from "@/domains/learn/articles.json";

const BASE_URL = "https://www.systemdesignsandbox.com";

const PRACTICE_SLUGS = [
  "url-shortener",
  "pastebin",
  "rate-limiter",
  "notification-system",
  "whatsapp",
];
// Only include intro pages — non-intro steps are gated behind user progress
// and will redirect crawlers back to intro (access control)
const PRACTICE_STEPS = ["intro"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/practice`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/cookies`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/feedback`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
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
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }))
  );

  return [...staticPages, ...learnPages, ...practicePages];
}
