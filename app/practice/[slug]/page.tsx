import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getBaseUrl } from "@/lib/getBaseUrl";
import { PRACTICE_STEPS } from "@/domains/practice/back-end/constants";
import { calculateMaxVisitedStep } from "@/domains/practice/utils/access-control";
import { fetchSteps } from "@/domains/practice/data/fetchPracticeData";
import { IntroPage } from "@/domains/practice/back-end/intro/IntroPage";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = getBaseUrl();
  const canonicalUrl = `${baseUrl}/practice/${slug}`;

  const scenarioName = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return {
    title: `${scenarioName} - System Design Practice`,
    description: `Begin the ${scenarioName} system design practice. Define scope, understand the problem, and prepare for an interactive design exercise.`,
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;

  if (query.continue === "true") {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const steps = await fetchSteps(slug, cookieHeader);

    if (steps) {
      const maxVisitedStep = calculateMaxVisitedStep(
        steps,
        (step) => step.userStep?.status === "completed"
      );
      const targetStep = Object.values(PRACTICE_STEPS).find((s) => s.order === maxVisitedStep);
      if (targetStep) {
        redirect(`/practice/${slug}/${targetStep.route}`);
      }
    }
  }

  return <IntroPage />;
}
