import { notFound } from "next/navigation";
import { decodeDesign } from "@/lib/shareLink";
import type { PracticeState } from "@/lib/practice/types";
import { SCENARIOS } from "@/lib/scenarios";
import PracticeSlugClient from "./PracticeSlugClient";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function PracticeSlugPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const search = await searchParams;

  // Check if this scenario has practice mode enabled
  const scenario = SCENARIOS.find((s) => s.id === slug && s.hasPractice);
  if (!scenario) {
    notFound();
  }

  let sharedState: PracticeState | null = null;
  const shareParam = search?.s as string | undefined;

  if (shareParam) {
    try {
      sharedState = decodeDesign<PracticeState>(shareParam);
      // Validate that the shared state matches the expected slug
      if (sharedState.slug !== slug) {
        sharedState = null;
      }
    } catch (error) {
      console.error("Failed to decode shared practice state", error);
    }
  }

  return <PracticeSlugClient slug={slug} sharedState={sharedState} />;
}
