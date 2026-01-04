"use client";

import { useCallback, useEffect, useMemo } from "react";
import type { PlacedNode, Edge } from "@/components/canvas/types";
import type { PracticeDesignState, Requirements } from "@/lib/practice/types";
import { track } from "@/lib/analytics";

/**
 * A tutorial step definition with optional auto-completion check.
 */
export type TutorialStep = {
  id: string;
  title: string;
  body: string;
  /** If true, step auto-advances when check() returns true */
  auto: boolean;
  /** Optional step that can be skipped */
  optional?: boolean;
  /** Check function that returns true when step is complete */
  check?: (ctx: { nodes: PlacedNode[]; edges: Edge[]; requirements: Requirements }) => boolean;
};

/**
 * Check if an edge exists between two nodes (in either direction).
 */
export const hasEdge = (edges: Edge[], fromId: string, toId: string): boolean =>
  edges.some(
    (edge) =>
      (edge.from === fromId && edge.to === toId) || (edge.from === toId && edge.to === fromId)
  );

/**
 * Generate tutorial steps based on enabled requirements.
 */
export function getTutorialSteps(requirements: Requirements): TutorialStep[] {
  const steps: TutorialStep[] = [
    {
      id: "welcome",
      title: "Tour the starter flow",
      body: "We already dropped Web → API Gateway → Service → Postgres on the canvas. Click each block and drag it a little so you get comfortable with moving pieces, then hit next.",
      auto: false,
    },
    {
      id: "add-cache",
      title: "Drop in Redis for speed",
      body: 'Open the Components list and drag "Cache (Redis)" onto the board. Place it beside the Service so we can route reads through it.',
      auto: true,
      check: ({ nodes }) => nodes.some((node) => node.spec.kind === "Cache (Redis)"),
    },
    {
      id: "wire-cache",
      title: "Route traffic through the cache",
      body: "First, connect the Service to the Cache with an arrow. Then connect the Cache to the Database. Finally, delete the direct arrow from Service to Database. Now all requests will check the cache first, making redirects much faster!",
      auto: true,
      check: ({ nodes, edges }) => {
        const service = nodes.find((node) => node.spec.kind === "Service");
        const cache = nodes.find((node) => node.spec.kind === "Cache (Redis)");
        const db = nodes.find((node) => node.spec.kind === "DB (Postgres)");
        if (!service || !cache || !db) return false;
        const serviceToCache = hasEdge(edges, service.id, cache.id);
        const cacheToDb = hasEdge(edges, cache.id, db.id);
        const serviceToDb = hasEdge(edges, service.id, db.id);
        return serviceToCache && cacheToDb && !serviceToDb;
      },
    },
  ];

  if (requirements.functional["basic-analytics"]) {
    steps.push({
      id: "analytics",
      title: "Add click tracking (without slowing redirects)",
      body: "To track clicks without slowing down redirects, add analytics processing: First, drag a Kafka topic (or any message queue) onto the canvas and connect it to your Service (this is where click events get sent). Then add a worker pool and connect it to the queue. The worker will process clicks in the background, so your main redirect path stays fast!",
      auto: true,
      optional: true,
      check: ({ nodes, edges }) => {
        const queue = nodes.find((node) => node.spec.kind === "Message Queue (Kafka Topic)");
        const worker = nodes.find((node) => node.spec.kind === "Worker Pool");
        const service = nodes.find((node) => node.spec.kind === "Service");
        if (!queue || !worker || !service) return false;
        const serviceToQueue = hasEdge(edges, service.id, queue.id);
        const queueToWorker = hasEdge(edges, queue.id, worker.id);
        return serviceToQueue && queueToWorker;
      },
    });
  }

  if (requirements.functional["rate-limiting"]) {
    steps.push({
      id: "rate-limiter",
      title: "Throttle abusive clients",
      body: "Drag a Rate Limiter onto the board and slot it between the API Gateway and Service. Wire API Gateway → Rate Limiter → Service so every redirect request is checked before it hits your core logic.",
      auto: true,
      check: ({ nodes, edges }) => {
        const api = nodes.find((node) => node.spec.kind === "API Gateway");
        const service = nodes.find((node) => node.spec.kind === "Service");
        const limiter = nodes.find((node) => node.spec.kind === "Rate Limiter");
        if (!limiter || !service) return false;
        const limiterToService = hasEdge(edges, limiter.id, service.id);
        if (!limiterToService) return false;
        if (!api) return true;
        return hasEdge(edges, api.id, limiter.id);
      },
    });
  }

  if (requirements.functional["admin-delete"]) {
    steps.push({
      id: "admin-delete",
      title: "Guard admin deletes",
      body: "Add an Auth service (or admin API) and connect it to the core Service so privileged delete requests flow through an authenticated path. Optionally branch the admin flow to a worker if you want deletes handled asynchronously.",
      auto: true,
      check: ({ nodes, edges }) => {
        const auth = nodes.find((node) => node.spec.kind === "Auth");
        const service = nodes.find((node) => node.spec.kind === "Service");
        if (!auth || !service) return false;
        return hasEdge(edges, auth.id, service.id);
      },
    });
  }

  return steps;
}

type UseTutorialManagerOptions = {
  design: PracticeDesignState;
  requirements: Requirements;
  editingLocked: boolean;
  slug: string;
  updateDesign: (updater: (prev: PracticeDesignState) => PracticeDesignState) => void;
};

type UseTutorialManagerReturn = {
  /** All tutorial steps for this scenario */
  steps: TutorialStep[];
  /** Current active step (or null if completed/dismissed) */
  currentStep: TutorialStep | null;
  /** Total number of steps */
  stepCount: number;
  /** Current step index (0-based) */
  currentStepIndex: number;
  /** Whether tutorial is complete */
  isComplete: boolean;
  /** Whether tutorial was dismissed */
  isDismissed: boolean;
  /** Advance to next step (for manual steps) */
  advanceStep: () => void;
  /** Skip/dismiss the tutorial */
  skipTutorial: () => void;
};

/**
 * Hook for managing the guided tutorial in the design stage.
 * Handles step generation, auto-advancement, and user interactions.
 */
export function useTutorialManager({
  design,
  requirements,
  editingLocked,
  slug,
  updateDesign,
}: UseTutorialManagerOptions): UseTutorialManagerReturn {
  const steps = useMemo(() => getTutorialSteps(requirements), [requirements]);
  const stepCount = steps.length;

  const currentStep =
    design.guidedDismissed || design.guidedCompleted
      ? null
      : (steps[design.guidedStepIndex] ?? null);

  // Clamp guided index if requirements changed and removed steps
  useEffect(() => {
    updateDesign((prev) => {
      const maxIndex = Math.max(stepCount - 1, 0);
      if (prev.guidedStepIndex > maxIndex) {
        return {
          ...prev,
          guidedStepIndex: maxIndex,
          guidedCompleted: stepCount === 0 ? true : prev.guidedCompleted,
        };
      }
      if (stepCount === 0 && !prev.guidedCompleted) {
        return { ...prev, guidedCompleted: true };
      }
      return prev;
    });
  }, [stepCount, updateDesign]);

  // Auto advance tutorial steps when criteria satisfied
  useEffect(() => {
    if (!currentStep || !currentStep.auto || !currentStep.check) {
      return;
    }

    if (currentStep.check({ nodes: design.nodes, edges: design.edges, requirements })) {
      updateDesign((prev) => {
        if (prev.guidedDismissed || prev.guidedCompleted) {
          return prev;
        }
        const nextIndex = prev.guidedStepIndex + 1;
        const isComplete = nextIndex >= stepCount;
        if (isComplete && !prev.guidedCompleted) {
          track("practice_design_tutorial_completed", { slug });
        }
        return {
          ...prev,
          guidedStepIndex: Math.min(nextIndex, Math.max(stepCount - 1, 0)),
          guidedCompleted: isComplete,
        };
      });
    }
  }, [currentStep, requirements, design.nodes, design.edges, stepCount, updateDesign, slug]);

  const advanceStep = useCallback(() => {
    updateDesign((prev) => {
      if (prev.guidedDismissed || prev.guidedCompleted) {
        return prev;
      }
      const nextIndex = prev.guidedStepIndex + 1;
      const isComplete = nextIndex >= stepCount;
      if (isComplete && !prev.guidedCompleted) {
        track("practice_design_tutorial_completed", { slug });
      }
      return {
        ...prev,
        guidedStepIndex: Math.min(nextIndex, Math.max(stepCount - 1, 0)),
        guidedCompleted: isComplete,
      };
    });
  }, [stepCount, updateDesign, slug]);

  const skipTutorial = useCallback(() => {
    if (design.guidedDismissed || editingLocked) return;
    updateDesign((prev) => ({
      ...prev,
      guidedDismissed: true,
      freeModeUnlocked: true,
    }));
    track("practice_design_guided_skipped", {
      slug,
      step: currentStep?.id ?? "unknown",
    });
  }, [design.guidedDismissed, updateDesign, currentStep?.id, editingLocked, slug]);

  return {
    steps,
    currentStep,
    stepCount,
    currentStepIndex: design.guidedStepIndex,
    isComplete: design.guidedCompleted,
    isDismissed: design.guidedDismissed,
    advanceStep,
    skipTutorial,
  };
}
