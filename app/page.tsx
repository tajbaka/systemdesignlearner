import { Metadata } from "next";
import { HomePageClient } from "./HomePageClient";

export const metadata: Metadata = {
  title: "System Design Interview Practice & Tutorial - Interactive Sandbox 2025",
  description: "Ace your system design interview in 2025! Practice with interactive scenarios, learn distributed systems & scalability patterns. Get instant feedback on your architecture designs. Free tutorials & real-world examples.",
  openGraph: {
    title: "System Design Interview Practice & Tutorial - Interactive Sandbox",
    description: "Master system design interviews with hands-on practice. Interactive scenarios for distributed systems, scalability, and architecture patterns. Start learning now!",
    images: [
      {
        url: "/og-image.png", // You'll need to add this image
        width: 1200,
        height: 630,
        alt: "System Design Sandbox - Interactive Architecture Playground",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "System Design Interview Practice & Tutorial - Interactive Sandbox",
    description: "Master system design interviews with hands-on practice. Interactive scenarios, instant feedback, real-world examples.",
    images: ["/og-image.png"],
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
    "name": "System Design Sandbox",
    "url": "https://www.systemdesignsandbox.com",
    "logo": "https://www.systemdesignsandbox.com/og-image.png",
    "description": "Interactive system design interview practice platform with hands-on tutorials and real-world examples",
    "sameAs": [
      "https://www.linkedin.com/in/antonio-coppe",
      "https://antoniocoppe.com"
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How do I prepare for a system design interview?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Start by practicing with interactive scenarios like our URL shortener tutorial. Focus on understanding distributed systems, scalability patterns, and architecture trade-offs. Practice designing systems end-to-end, from requirements gathering to capacity planning. Our platform provides instant feedback on your designs to accelerate learning."
        }
      },
      {
        "@type": "Question",
        "name": "What is system design and why is it important?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "System design is the process of defining the architecture, components, and data flow of large-scale software systems. It's crucial for building scalable, reliable applications and is a key evaluation criterion in senior engineering interviews at top tech companies."
        }
      },
      {
        "@type": "Question",
        "name": "What are the most common system design interview questions?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Common questions include designing URL shorteners, social media feeds (Twitter/Instagram), video streaming platforms (Netflix/YouTube), messaging systems (WhatsApp), ride-sharing apps (Uber), and e-commerce sites (Amazon). Each teaches different scalability and architecture patterns."
        }
      },
      {
        "@type": "Question",
        "name": "How long does it take to learn system design?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "With focused practice, you can learn core system design concepts in 4-8 weeks. Our interactive platform accelerates learning by providing hands-on practice with real-time feedback. Practice 3-4 scenarios per week to build strong fundamentals for your system design interview."
        }
      },
      {
        "@type": "Question",
        "name": "Is System Design Sandbox free to use?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! System Design Sandbox is completely free. We provide interactive tutorials, practice scenarios, and instant feedback at no cost. Our mission is to make high-quality system design education accessible to everyone preparing for technical interviews."
        }
      }
    ]
  };

  const courseSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": "System Design Interview Practice",
    "description": "Interactive system design interview preparation with hands-on practice scenarios covering distributed systems, scalability, and architecture patterns",
    "provider": {
      "@type": "Organization",
      "name": "System Design Sandbox",
      "sameAs": "https://www.systemdesignsandbox.com"
    },
    "educationalLevel": "Intermediate to Advanced",
    "isAccessibleForFree": true,
    "hasCourseInstance": {
      "@type": "CourseInstance",
      "courseMode": "online",
      "courseWorkload": "PT4W"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }}
      />
      <HomePageClient />
    </>
  );
}