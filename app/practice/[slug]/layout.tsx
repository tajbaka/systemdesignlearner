import { Metadata } from "next";
import { cookies } from "next/headers";
import { getBaseUrl } from "@/lib/getBaseUrl";
import { VALID_SLUGS, PRACTICE_IMAGE_URLS } from "@/domains/practice/back-end/constants";
import { PracticeShell } from "@/domains/practice/back-end/layouts/PracticeShell";
import { fetchProblem, fetchSteps } from "@/domains/practice/data/fetchPracticeData";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const scenarioName = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

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

export default async function PracticeSlugLayout({ children, params }: Props) {
  const { slug } = await params;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const [problem, steps] = await Promise.all([
    fetchProblem(slug, cookieHeader),
    fetchSteps(slug, cookieHeader),
  ]);

  if (!problem || !steps) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <div className="text-lg font-semibold text-red-400">Error</div>
          <div className="mt-2 text-sm text-zinc-400">Failed to load problem data</div>
        </div>
      </div>
    );
  }

  return <PracticeShell rawData={{ problem, steps }}>{children}</PracticeShell>;
}
