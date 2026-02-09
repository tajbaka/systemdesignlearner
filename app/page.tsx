import { Metadata } from "next";
import { HomePageClient } from "./HomePageClient";
import { getBaseUrl } from "@/lib/getBaseUrl";

const baseUrl = getBaseUrl();
const ogImage = `${baseUrl}/desktop-url-shortener-practice.gif`;

export const metadata: Metadata = {
  title: "System Design Interview Practice - Interactive Sandbox",
  description:
    "Practice system design interviews with interactive scenarios. AI-powered feedback on distributed systems, scalability & architecture design.",
  alternates: {
    canonical: "https://www.systemdesignsandbox.com",
  },
  openGraph: {
    title: "System Design Interview Practice - Interactive Sandbox",
    description:
      "Practice system design interviews with interactive scenarios. AI-powered feedback on architecture design.",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "System Design Sandbox - Interactive Architecture Playground",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "System Design Interview Practice - Interactive Sandbox",
    description:
      "Practice system design interviews with interactive scenarios. AI-powered feedback on architecture design.",
    images: [ogImage],
  },
  keywords: [
    "system design interview",
    "system design practice",
    "system design tutorial",
    "distributed systems",
    "scalability",
    "system design examples",
    "architecture patterns",
    "system design course",
    "learn system design",
    "system design interview questions",
    "system design preparation",
    "software architecture",
  ],
};

export default function HomePage() {
  // JSON-LD Schema markup for rich results
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "System Design Sandbox",
    url: "https://www.systemdesignsandbox.com",
    logo: "https://www.systemdesignsandbox.com/og-image.png",
    description:
      "Interactive system design interview practice platform with hands-on tutorials and real-world examples",
    sameAs: ["https://www.linkedin.com/in/antonio-coppe", "https://antoniocoppe.com"],
  };

  const courseSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "System Design Interview Practice",
    description:
      "Interactive system design interview preparation with hands-on practice scenarios covering distributed systems, scalability, and architecture patterns",
    provider: {
      "@type": "Organization",
      name: "System Design Sandbox",
      sameAs: "https://www.systemdesignsandbox.com",
    },
    educationalLevel: "Intermediate to Advanced",
    isAccessibleForFree: true,
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: "PT4W",
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "System Design Sandbox",
    url: "https://www.systemdesignsandbox.com",
    description:
      "Interactive system design interview practice platform with hands-on tutorials and real-world examples",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://www.systemdesignsandbox.com/practice?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.systemdesignsandbox.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Practice",
        item: "https://www.systemdesignsandbox.com/practice",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Learn",
        item: "https://www.systemdesignsandbox.com/learn",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <HomePageClient />
    </>
  );
}
