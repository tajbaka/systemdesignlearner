import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getBaseUrl } from "@/lib/getBaseUrl";
import { PRACTICE_STEPS, SLUGS_TO_STEPS } from "@/domains/practice/back-end/constants";
import { calculateMaxVisitedStep } from "@/domains/practice/utils/access-control";
import { fetchSteps } from "@/domains/practice/data/fetchPracticeData";
import { BackendStepRenderer } from "@/domains/practice/back-end/BackendStepRenderer";

type Props = {
  params: Promise<{ slug: string; step: string }>;
};

const STEP_DESCRIPTIONS: Record<string, string> = {
  functional:
    "Define the functional requirements for {scenario}. Identify core features, user actions, and system capabilities with AI-guided feedback.",
  "non-functional":
    "Specify non-functional requirements for {scenario}: latency targets, throughput, availability, consistency, and scalability constraints.",
  api: "Design the API endpoints for {scenario}. Define HTTP methods, request/response payloads, and RESTful resource paths.",
  "high-level-design":
    "Build the high-level architecture for {scenario} with a drag-and-drop design canvas. Connect services, databases, caches, and load balancers.",
  score:
    "Review your {scenario} system design scorecard. See detailed feedback, bonus points, and share your solution.",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, step } = await params;
  const baseUrl = getBaseUrl();
  const canonicalUrl = `${baseUrl}/practice/${slug}/${step}`;
  const ogImage = `${baseUrl}/desktop-url-shortener-practice.gif`;

  const scenarioName = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const stepName = step
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const description =
    STEP_DESCRIPTIONS[step]?.replace("{scenario}", scenarioName) ??
    `Complete the ${stepName} step for ${scenarioName} system design practice.`;

  const pageTitle = `${stepName} - ${scenarioName} Practice`;

  return {
    title: pageTitle,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: pageTitle,
      description,
      type: "website",
      url: canonicalUrl,
      images: [
        { url: ogImage, width: 1200, height: 630, alt: `${scenarioName} System Design Practice` },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [ogImage],
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug, step } = await params;

  const validStepRoutes = Object.keys(SLUGS_TO_STEPS);

  if (!validStepRoutes.includes(step)) {
    redirect(`/practice/${slug}`);
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const steps = await fetchSteps(slug, cookieHeader);

  if (steps) {
    const maxVisitedStep = calculateMaxVisitedStep(
      steps,
      (s) => s.userStep?.status === "completed"
    );

    const currentStepConfig = Object.values(PRACTICE_STEPS).find((s) => s.route === step);

    if (currentStepConfig && currentStepConfig.order > maxVisitedStep) {
      const targetStep = Object.values(PRACTICE_STEPS).find((s) => s.order === maxVisitedStep);
      if (targetStep) {
        redirect(`/practice/${slug}/${targetStep.route}`);
      }
    }
  }

  return <BackendStepRenderer />;
}
