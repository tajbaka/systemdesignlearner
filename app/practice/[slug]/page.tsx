"use client";

import { notFound, useParams, useSearchParams } from "next/navigation";
import PracticeFlow from "@/components/practice/PracticeFlow";
import { decodeDesign } from "@/lib/shareLink";
import { Navbar } from "@/components/Navbar";
import type { PracticeState } from "@/lib/practice/types";

const VALID_SLUG = "url-shortener";

export default function PracticeSlugPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;

  if (slug !== VALID_SLUG) {
    notFound();
  }

  let sharedState: PracticeState | null = null;
  const shareParam = searchParams?.get('s');
  if (shareParam) {
    try {
      sharedState = decodeDesign<PracticeState>(shareParam);
      // Validate that the shared state matches the expected slug
      if (sharedState.slug !== slug) {
        sharedState = null;
      }
    } catch (error) {
      console.warn("Failed to decode shared practice state", error);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <Navbar />
      <PracticeFlow sharedState={sharedState} />
    </div>
  );
}
