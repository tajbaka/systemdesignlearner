import { Metadata } from "next";

const VALID_SLUGS = {
  URL_SHORTENER: "url-shortener",
};

const PRACTICE_IMAGE_URLS = {
  [VALID_SLUGS.URL_SHORTENER]: "/desktop-url-shortener-practice.gif",
} as const;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  // Format slug for display
  const scenarioName = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Use GIF for URL Shortener, static image for others (relative URLs work with tunnel)
  const defaultOgImage = PRACTICE_IMAGE_URLS[slug as keyof typeof PRACTICE_IMAGE_URLS];

  // Default metadata
  const defaultMetadata: Metadata = {
    title: `Practice: ${scenarioName} - System Design Interview`,
    description: `Practice system design interview for ${scenarioName}. Complete all steps: functional requirements, non-functional requirements, API design, and high-level architecture.`,
    openGraph: {
      title: `Practice: ${scenarioName}`,
      description: `Complete system design practice session for ${scenarioName}. Interactive learning with instant feedback.`,
      type: "website",
      images: [
        {
          url: defaultOgImage,
          width: 1200,
          height: 630,
          alt: `System Design Practice: ${scenarioName}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `Practice: ${scenarioName}`,
      description: `Complete system design practice session for ${scenarioName}. Interactive learning with instant feedback.`,
      images: [defaultOgImage],
    },
  };

  return defaultMetadata;
}

export default function PracticeSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
