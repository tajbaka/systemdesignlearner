import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PracticePageClient } from "@/domains/practice/PracticePageClient";
import { getBaseUrl } from "@/lib/getBaseUrl";
import { BASE_URL } from "@/lib/schemas";

const canonicalUrl = `${getBaseUrl()}/practice`;
const ogImage = `${getBaseUrl()}/desktop-url-shortener-practice.gif`;

export const metadata: Metadata = {
  title: "System Design Practice Scenarios - Interactive Interview Challenges",
  description:
    "Practice system design interviews with real-world scenarios. Master distributed systems, caching strategies, and scalability patterns through hands-on interactive tutorials. Free practice problems for 2025.",
  keywords: [
    "system design practice",
    "system design scenarios",
    "system design exercises",
    "system design problems",
    "practice system design",
    "system design challenges",
  ],
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    title: "System Design Practice Scenarios - Interactive Challenges",
    description:
      "Master system design interviews with hands-on practice scenarios. URL shortener, distributed systems, caching & more.",
    type: "website",
    url: canonicalUrl,
    images: [{ url: ogImage, width: 1200, height: 630, alt: "System Design Practice Scenarios" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "System Design Practice Scenarios - Interactive Challenges",
    description:
      "Master system design interviews with hands-on practice scenarios. URL shortener, distributed systems, caching & more.",
    images: [ogImage],
  },
};

export default async function Page() {
  // Fetch problems from API endpoint
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const baseUrl = getBaseUrl();
  const problems = await fetch(`${baseUrl}/api/v2/practice`, {
    cache: "no-store",
    headers: {
      Cookie: cookieHeader,
    },
  }).then(async (response) => {
    if (response.ok) {
      const data = await response.json();
      return data?.data ?? [];
    }
    return [];
  });

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "System Design Practice Scenarios",
    description: "Interactive system design interview simulations with AI-powered feedback",
    numberOfItems: problems.length,
    itemListElement: problems.map(
      (p: { title: string; slug: string; description: string }, i: number) => ({
        "@type": "ListItem",
        position: i + 1,
        name: p.title,
        url: `${BASE_URL}/practice/${p.slug}/intro`,
        description: p.description,
      })
    ),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: BASE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Practice",
        item: `${BASE_URL}/practice`,
      },
    ],
  };

  return (
    <>
      <script
        id="itemlist-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <PracticePageClient problems={problems} />
    </>
  );
}
