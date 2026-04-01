import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/getBaseUrl";
import { VALID_SLUGS, PRACTICE_IMAGE_URLS } from "@/domains/practice/back-end/constants";
import { loadArticlesConfig, getArticleBySlug } from "@/domains/learn/utils";
import { LearnArticlePageClient } from "@/domains/learn/LearnArticlePageClient";

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

  return {
    title: config.title,
    description: config.description,
    authors: [{ name: config.author }],
    creator: config.author,
    publisher: "System Design Learner",
    openGraph: {
      type: "article",
      locale: "en_US",
      url,
      siteName: "System Design Learner",
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
    },
    twitter: {
      card: "summary_large_image",
      title: config.title,
      description: config.description,
      images: [ogImage],
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
