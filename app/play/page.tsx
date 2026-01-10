"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { decodeDesign } from "@/domains/practice/lib/shareLink";
import { PracticeSessionProvider } from "@/domains/practice/components/PracticeSessionProvider";
import { HighLevelDesignUI } from "@/domains/practice/components/HighLevelDesignUI";
import { makeInitialPracticeState } from "@/domains/practice/lib/defaults";
import type { PracticeState, PlacedNode, Edge } from "@/domains/practice/types";
import { useHighLevelDesign } from "@/hooks";

type SharePayload = {
  scenarioId: string;
  nodes: Array<{ id: string; kind: string; x: number; y: number }>;
  edges: Array<{ id: string; from: string; to: string }>;
};

function PlayDesignView() {
  const designProps = useHighLevelDesign();

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden">
      <HighLevelDesignUI {...designProps} hideLockOverlay={true} />
    </div>
  );
}

function PlayPageClient() {
  const searchParams = useSearchParams();
  const [sharedState, setSharedState] = useState<PracticeState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const encoded = searchParams.get("s");
    if (!encoded) {
      setError("No design data found in URL");
      return;
    }

    try {
      const payload = decodeDesign<SharePayload>(encoded);

      if (!payload.scenarioId || !Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) {
        setError("Invalid design data format");
        return;
      }

      // Create a minimal state with just the design
      const baseState = makeInitialPracticeState(payload.scenarioId);
      const state: PracticeState = {
        ...baseState,
        design: {
          ...baseState.design,
          // Extract only id, x, y from nodes (kind is not needed in PlacedNode)
          nodes: payload.nodes.map(({ id, x, y }) => ({ id, x, y })) as PlacedNode[],
          edges: payload.edges.map(({ id, from, to }) => ({ id, from, to })) as Edge[],
        },
      };

      setSharedState(state);
    } catch (err) {
      console.error("Failed to decode design:", err);
      setError("Invalid design data");
    }
  }, [searchParams]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="text-center space-y-4 px-4">
          <div className="text-6xl">⚠️</div>
          <h1 className="text-2xl font-semibold">Unable to load design</h1>
          <p className="text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!sharedState) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="text-center">
          <div className="text-2xl">Loading design...</div>
        </div>
      </div>
    );
  }

  return (
    <PracticeSessionProvider
      slug={sharedState.slug}
      initialStep="highLevelDesign"
      sharedState={sharedState}
    >
      <PlayDesignView />
    </PracticeSessionProvider>
  );
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-100">
          <div className="text-center">
            <div className="text-2xl">Loading...</div>
          </div>
        </div>
      }
    >
      <PlayPageClient />
    </Suspense>
  );
}
