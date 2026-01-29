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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, step } = await params;

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

  return {
    title: `${stepName} - ${scenarioName} Practice`,
    description: `Complete the ${stepName} step for ${scenarioName} system design practice.`,
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { slug, step } = await params;
  const query = await searchParams;

  // Get cookies to forward authentication to internal API calls
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  // Map problem category to container component
  const baseUrl = getBaseUrl();
  const problem: ProblemResponse | null = await fetch(`${baseUrl}/api/v2/practice/${slug}`, {
    next: { revalidate: 60 * 5 }, // Cache for 5 minutes
    headers: {
      Cookie: cookieHeader,
    },
  }).then(async (response) => {
    if (response.ok) {
      const data = await response.json();
      return data?.data ?? null;
    }
    return null;
  });

  if (!problem) {
    return <div>Problem not found</div>;
  }

  if (problem.category === "backend") {
    // Validate that the step is a valid route
    const validStepRoutes = Object.keys(SLUGS_TO_STEPS);

    if (!validStepRoutes.includes(step)) {
      // Invalid step - redirect to intro
      redirect(`/practice/${slug}/intro`);
    }

    const steps: ProblemStepWithUserStep[] | null = await fetch(
      `${baseUrl}/api/v2/practice/${slug}/steps`,
      {
        cache: "no-store", // Temporarily disable cache to see new data field
        headers: {
          Cookie: cookieHeader,
        },
      }
    ).then(async (response) => {
      if (response.ok) {
        const data = await response.json();
        return data?.data ?? null;
      }
      return null;
    });

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

      // Find the current step's order from PRACTICE_STEPS
      const currentStepConfig = Object.values(PRACTICE_STEPS).find((s) => s.route === step);

      // If user tries to access a step beyond maxVisitedStep, redirect them
      if (currentStepConfig && currentStepConfig.order > maxVisitedStep) {
        const targetStep = Object.values(PRACTICE_STEPS).find((s) => s.order === maxVisitedStep);
        if (targetStep) {
          redirect(`/practice/${slug}/${targetStep.route}`);
        }
      }
    }

    return <PracticeBackend slug={slug} step={step} data={{ problem, steps }} />;
  }

  return null;
}
