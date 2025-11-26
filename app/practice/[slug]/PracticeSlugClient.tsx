"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import type { PracticeState } from "@/lib/practice/types";
import { PracticeSessionProvider } from "@/components/practice/session/PracticeSessionProvider";

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

interface PracticeSlugClientProps {
  slug: string;
  sharedState: PracticeState | null;
}

export default function PracticeSlugClient({ slug, sharedState }: PracticeSlugClientProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-zinc-950">
      <PracticeSidebar />
      <main className="flex-1 min-h-0 overflow-hidden">
        <PracticeSessionProvider slug={slug} initialStep="functional" sharedState={sharedState}>
          <PracticeFlow />
        </PracticeSessionProvider>
      </main>
    </div>
  );
}
