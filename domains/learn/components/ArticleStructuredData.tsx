import { getBaseUrl } from "@/lib/getBaseUrl";
import { ORGANIZATION_SCHEMA } from "@/lib/schemas";

interface ArticleStructuredDataProps {
  title: string;
  subtitle: string;
  description?: string;
  author?: string;
  date?: string;
  readTime?: string;
  slug: string;
}

export function ArticleStructuredData({
  title,
  subtitle,
  description,
  author = "System Design Sandbox",
  date,
  readTime,
  slug,
}: ArticleStructuredDataProps) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/learn/${slug}`;
  const imageUrl = `${baseUrl}/og-image.png`;

  // Article schema for rich snippets
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: description || subtitle,
    image: imageUrl,
    datePublished: date || new Date().toISOString(),
    dateModified: date || new Date().toISOString(),
    author: {
      "@type": "Organization",
      name: author,
      url: baseUrl,
    },
    publisher: {
      ...ORGANIZATION_SCHEMA,
      logo: {
        "@type": "ImageObject",
        url: ORGANIZATION_SCHEMA.logo,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    articleSection: "System Design",
    keywords: [
      "system design",
      "distributed systems",
      "software architecture",
      "scalability",
      "system design interview",
      "backend engineering",
    ],
    ...(readTime && {
      timeRequired: readTime,
    }),
  };

  // Breadcrumb schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Learn",
        item: `${baseUrl}/learn`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: title,
        item: url,
      },
    ],
  };

  return (
    <>
      <script
        id="article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
