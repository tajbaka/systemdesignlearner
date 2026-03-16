import { getBaseUrl } from "@/lib/getBaseUrl";
import { ORGANIZATION_SCHEMA, AUTHOR_SCHEMA } from "@/lib/schemas";

interface ArticleStructuredDataProps {
  title: string;
  subtitle: string;
  description?: string;
  author?: string;
  date?: string;
  readTime?: string;
  slug: string;
  keywords?: string[];
}

export function ArticleStructuredData({
  title,
  subtitle,
  description,
  date,
  readTime,
  slug,
  keywords,
}: ArticleStructuredDataProps) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/learn/${slug}`;
  const imageUrl = `${baseUrl}/og-image.png`;

  // Article schema for rich snippets
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    description: description || subtitle,
    image: imageUrl,
    ...(date && { datePublished: date }),
    ...(date && { dateModified: date }),
    author: AUTHOR_SCHEMA,
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
    ...(keywords?.length && { keywords }),
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
