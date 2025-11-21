import { notFound } from "next/navigation";
import { decodeDesign } from "@/lib/shareLink";
import type { PracticeState } from "@/lib/practice/types";
import PracticeSlugClient from "./PracticeSlugClient";

const VALID_SLUG = "url-shortener";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function PracticeSlugPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const search = await searchParams;

  if (slug !== VALID_SLUG) {
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
