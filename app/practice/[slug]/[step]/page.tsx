import { Metadata } from "next";
import { notFound } from "next/navigation";
import { SCENARIOS } from "@/lib/scenarios";
import { PRACTICE_STEPS, type PracticeStep } from "@/lib/practice/types";
import PracticeStepClient from "./PracticeStepClient";
import { IntroPage } from "@/components/practice/steps/IntroPage";

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

export default async function PracticeStepPage({ params, searchParams }: Props) {
  const { slug, step } = await params;
  const search = await searchParams;

  // Check if the slug is a valid scenario
  const scenario = SCENARIOS.find((s) => s.id === slug);
  if (!scenario) {
    notFound();
  }

  // Normalize step name (convert kebab-case to camelCase for nonFunctional)
  const normalizedStep = step === "non-functional" ? "nonFunctional" : step;

  // If this is the intro step, render it as a standalone page
  if (normalizedStep === "intro") {
    return <IntroPage slug={slug} />;
  }

  // Check if the step is valid
  if (!PRACTICE_STEPS.includes(normalizedStep as PracticeStep)) {
    notFound();
  }

  return (
    <PracticeStepClient
      scenario={slug}
      step={normalizedStep as PracticeStep}
      searchParams={search}
    />
  );
}
