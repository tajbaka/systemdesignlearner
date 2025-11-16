"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { logger } from "@/lib/logger";
import { PracticeSessionProvider } from "@/components/practice/session/PracticeSessionProvider";
import { decodeDesign } from "@/lib/shareLink";
import type { PracticeState } from "@/lib/practice/types";

// Dynamically import heavy components to avoid chunk loading issues
const PracticeFlow = dynamic(() => import("@/components/practice/PracticeFlow"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-sm text-zinc-400">
        Loading practice flow…
      </div>
    </div>
  ),
});

const PracticeSidebar = dynamic(
  () =>
    import("@/components/practice/PracticeSidebar").then((mod) => ({
      default: mod.PracticeSidebar,
    })),
  {
    ssr: false,
  }
);

const VALID_SLUG = "url-shortener";

export default function PracticeSlugPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (slug !== VALID_SLUG) {
    notFound();
  }

  let sharedState: PracticeState | null = null;
  const shareParam = searchParams?.get("s");
  if (shareParam) {
    try {
      sharedState = decodeDesign<PracticeState>(shareParam);
      // Validate that the shared state matches the expected slug
      if (sharedState.slug !== slug) {
        sharedState = null;
      }
    } catch (error) {
      logger.warn("Failed to decode shared practice state", error);
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950">
      <PracticeSidebar />
      <main className="flex-1 overflow-hidden">
        <PracticeSessionProvider sharedState={sharedState}>
          <PracticeFlow />
        </PracticeSessionProvider>
      </main>
    </div>
  );
}
