import { Metadata } from "next";
import { getBaseUrl } from "@/lib/getBaseUrl";
import { VALID_SLUGS, PRACTICE_IMAGE_URLS } from "@/domains/practice/constants";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  // Format slug for display
  const scenarioName = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Get absolute URL for OG image (required for social media)
  // Check if slug contains any of the scenario identifiers
  let relativeImagePath: string | undefined;
  for (const validSlug of Object.values(VALID_SLUGS)) {
    if (slug.includes(validSlug)) {
      relativeImagePath = PRACTICE_IMAGE_URLS[validSlug as keyof typeof PRACTICE_IMAGE_URLS];
      break;
    }
  }

  const baseUrl = getBaseUrl();
  const ogImage = relativeImagePath ? `${baseUrl}${relativeImagePath}` : `${baseUrl}/og-image.png`;

  return {
    openGraph: {
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `System Design Practice: ${scenarioName}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: [ogImage],
    },
  };
}

export default function PracticeSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
