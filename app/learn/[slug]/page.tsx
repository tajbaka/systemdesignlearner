import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/getBaseUrl";
import { VALID_SLUGS, PRACTICE_IMAGE_URLS } from "@/domains/practice/constants";
import { loadArticlesConfig, getArticleBySlug } from "@/domains/learn/utils";
import { LearnArticlePageClient } from "@/domains/learn/containers/LearnArticlePageClient";

// Pre-render all article pages at build time (SSG)
export async function generateStaticParams() {
  const data = loadArticlesConfig();
  return data.articles.map((article) => ({
    slug: article.slug,
  }));
}

type Props = {
  params: Promise<{ slug: string }>;
};

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const config = getArticleBySlug(slug);

  if (!config) {
    return {
      title: "Article Not Found",
    };
  }

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/learn/${slug}`;
  const ogImage = `${baseUrl}${PRACTICE_IMAGE_URLS[VALID_SLUGS.URL_SHORTENER]}`;

  // Use article-specific keywords, fallback to generic ones
  const keywords = config.keywords || [
    "system design",
    "distributed systems",
    "software architecture",
    "scalability",
    "system design interview",
    "backend engineering",
  ];

  return {
    title: config.title,
    description: config.description,
    keywords,
    authors: [{ name: config.author }],
    creator: config.author,
    publisher: "System Design Sandbox",
    openGraph: {
      type: "article",
      locale: "en_US",
      url,
      siteName: "System Design Sandbox",
      title: config.title,
      description: config.description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: config.title,
        },
      ],
      publishedTime: config.date,
      authors: [config.author],
      section: "System Design",
      tags: keywords.slice(0, 4), // Use article-specific keywords for OG tags
    },
    twitter: {
      card: "summary_large_image",
      title: config.title,
      description: config.description,
      images: [ogImage],
      creator: "@systemdesignsb",
    },
    alternates: {
      canonical: url,
    },
    other: {
      "article:published_time": config.date,
      "article:author": config.author,
      "article:section": "System Design",
      "article:tag": "system design, distributed systems, software architecture",
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <LearnArticlePageClient slug={slug} />;
}
