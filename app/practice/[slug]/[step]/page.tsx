import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import PracticeBackend from "@/domains/practice/back-end/PracticeBackend";
import type { ProblemResponse, ProblemStepWithUserStep } from "@/app/api/v2/practice/schemas";
import { getBaseUrl } from "@/lib/getBaseUrl";
import { PRACTICE_STEPS, SLUGS_TO_STEPS } from "@/domains/practice/back-end/constants";
import { calculateMaxVisitedStep } from "@/domains/practice/utils/access-control";

type Props = {
  params: Promise<{ slug: string; step: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const STEP_DESCRIPTIONS: Record<string, string> = {
  intro:
    "Begin the {scenario} system design practice. Define scope, understand the problem, and prepare for an interactive design exercise.",
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

  // Format slug for display
  const scenarioName = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Format step for display
  const stepName = step
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const description =
    STEP_DESCRIPTIONS[step]?.replace("{scenario}", scenarioName) ??
    `Complete the ${stepName} step for ${scenarioName} system design practice.`;

  const pageTitle =
    step === "intro"
      ? `${scenarioName} - System Design Practice`
      : `${stepName} - ${scenarioName} Practice`;

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

export default async function Page({ params, searchParams }: Props) {
  const { slug, step } = await params;
  const query = await searchParams;

  // Get cookies to forward authentication to internal API calls
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const baseUrl = getBaseUrl();

  // Validate that the step is a valid route
  const validStepRoutes = Object.keys(SLUGS_TO_STEPS);

  if (!validStepRoutes.includes(step)) {
    redirect(`/practice/${slug}/intro`);
  }

  // Fetch problem and steps in parallel
  const [problem, steps] = await Promise.all([
    fetch(`${baseUrl}/api/v2/practice/${slug}`, {
      next: { revalidate: 60 * 5 },
      headers: { Cookie: cookieHeader },
    }).then(async (response) => {
      if (response.ok) {
        const data = await response.json();
        return (data?.data ?? null) as ProblemResponse | null;
      }
      return null;
    }),
    fetch(`${baseUrl}/api/v2/practice/${slug}/steps`, {
      cache: "no-store",
      headers: { Cookie: cookieHeader },
    }).then(async (response) => {
      if (response.ok) {
        const data = await response.json();
        return (data?.data ?? null) as ProblemStepWithUserStep[] | null;
      }
      return null;
    }),
  ]);

  if (!problem) {
    return <div>Problem not found</div>;
  }

  if (!steps) {
    return <div>Steps not found</div>;
  }

  // If continue parameter is present and we're on intro, redirect to maxVisitedStep
  if (query.continue === "true" && step === "intro") {
    const maxVisitedStep = calculateMaxVisitedStep(
      steps,
      (step) => step.userStep?.status === "completed"
    );

    const targetStep = Object.values(PRACTICE_STEPS).find((s) => s.order === maxVisitedStep);

    if (targetStep) {
      redirect(`/practice/${slug}/${targetStep.route}`);
    }
  }

  // Access control: Calculate maxVisitedStep from completed steps (skip for intro)
  if (step !== "intro") {
    const maxVisitedStep = calculateMaxVisitedStep(
      steps,
      (step) => step.userStep?.status === "completed"
    );

    const currentStepConfig = Object.values(PRACTICE_STEPS).find((s) => s.route === step);

    if (currentStepConfig && currentStepConfig.order > maxVisitedStep) {
      const targetStep = Object.values(PRACTICE_STEPS).find((s) => s.order === maxVisitedStep);
      if (targetStep) {
        redirect(`/practice/${slug}/${targetStep.route}`);
      }
    }
  }

  return <PracticeBackend slug={slug} step={step} data={{ problem, steps }} />;
}
