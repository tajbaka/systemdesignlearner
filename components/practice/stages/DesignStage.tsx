"use client";

import { useCallback, useEffect, useMemo } from "react";
import { COMPONENT_LIBRARY } from "@/app/components/data";
import type { ComponentKind, PlacedNode, Edge } from "@/app/components/types";
import ReactFlowBoard from "@/app/components/ReactFlowBoard";
import Palette from "@/app/components/Palette";
import { findScenarioPath } from "@/app/components/utils";
import { SCENARIOS } from "@/lib/scenarios";
import type {
  PracticeDesignState,
  Requirements,
} from "@/lib/practice/types";
import { track } from "@/lib/analytics";

type UpdateDesignFn = (updater: (prev: PracticeDesignState) => PracticeDesignState) => void;

type DesignStageProps = {
  design: PracticeDesignState;
  requirements: Requirements;
  locked: boolean;
  readOnly?: boolean;
  designComplete?: boolean;
  updateDesign: UpdateDesignFn;
  onContinue: () => void;
};

type TutorialStep = {
  id: string;
  title: string;
  body: string;
  auto: boolean;
  optional?: boolean;
  check?: (ctx: { nodes: PlacedNode[]; edges: Edge[]; requirements: Requirements }) => boolean;
};

const URL_SHORTENER = SCENARIOS.find((scenario) => scenario.id === "url-shortener")!;

const RECOMMENDED_COMPONENTS: ComponentKind[] = [
  "Web",
  "API Gateway",
  "Service",
  "Cache (Redis)",
  "DB (Postgres)",
  "CDN",
  "Load Balancer",
  "Message Queue (Kafka Topic)",
  "Worker Pool",
  "Rate Limiter",
  "Tracing/Logging",
  "Object Store (S3)",
  "Edge Function",
];

const componentSpecFor = (kind: ComponentKind) => {
  const spec = COMPONENT_LIBRARY.find((component) => component.kind === kind);
  if (!spec) {
    throw new Error(`Component spec missing for ${kind}`);
  }
  return spec;
};

const tutorialStepsFor = (requirements: Requirements): TutorialStep[] => {
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
      body: "Open the Components list and drag “Cache (Redis)” onto the board. Place it beside the Service so we can route reads through it.",
      auto: true,
      check: ({ nodes }) =>
        nodes.some((node) => node.spec.kind === "Cache (Redis)"),
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

        // Check if service sends events to queue AND queue connects to worker
        const serviceToQueue = hasEdge(edges, service.id, queue.id);
        const queueToWorker = hasEdge(edges, queue.id, worker.id);
        return serviceToQueue && queueToWorker;
      },
    });
  }

  return steps;
};

const hasEdge = (edges: Edge[], fromId: string, toId: string) =>
  edges.some(
    (edge) =>
      (edge.from === fromId && edge.to === toId) ||
      (edge.from === toId && edge.to === fromId)
  );

const pruneEdges = (edges: Edge[], nodes: PlacedNode[]): Edge[] => {
  const nodeIds = new Set(nodes.map((node) => node.id));
  return edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));
};

const nextPosition = (nodes: PlacedNode[]) => {
  if (nodes.length === 0) {
    return { x: -120, y: -120 };
  }
  const maxX = Math.max(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  return { x: maxX + 180, y: minY };
};

export default function DesignStage({
  design,
  requirements,
  locked,
  readOnly = false,
  designComplete = false,
  updateDesign,
  onContinue,
}: DesignStageProps) {
  console.debug('[DesignStage] render nodes', design.nodes.map(node => ({ id: node.id, replicas: node.replicas })));
  const paletteItems = useMemo(
    () =>
      COMPONENT_LIBRARY.filter((component) =>
        RECOMMENDED_COMPONENTS.includes(component.kind)
      ),
    []
  );

  const tutorialSteps = useMemo(() => tutorialStepsFor(requirements), [requirements]);
  const stepCount = tutorialSteps.length;

  const currentStep =
    design.guidedDismissed || design.guidedCompleted
      ? null
      : tutorialSteps[design.guidedStepIndex] ?? null;

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
          track("practice_design_tutorial_completed", { slug: "url-shortener" });
        }
        return {
          ...prev,
          guidedStepIndex: Math.min(nextIndex, Math.max(stepCount - 1, 0)),
          guidedCompleted: isComplete,
        };
      });
    }
  }, [currentStep, requirements, design.nodes, design.edges, stepCount, updateDesign]);

  const handleAdvanceManualStep = useCallback(() => {
    updateDesign((prev) => {
      if (prev.guidedDismissed || prev.guidedCompleted) {
        return prev;
      }
      const nextIndex = prev.guidedStepIndex + 1;
      const isComplete = nextIndex >= stepCount;
      if (isComplete && !prev.guidedCompleted) {
        track("practice_design_tutorial_completed", { slug: "url-shortener" });
      }
      return {
        ...prev,
        guidedStepIndex: Math.min(nextIndex, Math.max(stepCount - 1, 0)),
        guidedCompleted: isComplete,
      };
    });
  }, [stepCount, updateDesign]);

  const handleSkipGuidance = useCallback(() => {
    if (design.guidedDismissed) return;
    updateDesign((prev) => ({
      ...prev,
      guidedDismissed: true,
      freeModeUnlocked: true,
    }));
    track("practice_design_guided_skipped", { slug: "url-shortener", step: currentStep?.id ?? "unknown" });
  }, [design.guidedDismissed, updateDesign, currentStep?.id]);

  const addNode = useCallback(
    (kind: ComponentKind, position?: { x: number; y: number }) => {
      if (locked || readOnly) return;
      const spec = componentSpecFor(kind);
      const nodePosition = position ?? nextPosition(design.nodes);
      updateDesign((prev) => ({
        ...prev,
        nodes: [
          ...prev.nodes,
          {
            id: `node-${kind}-${Date.now()}`,
            spec,
            x: nodePosition.x,
            y: nodePosition.y,
            replicas: 1,
          },
        ],
      }));
      track("practice_design_node_added", { slug: "url-shortener", kind });
    },
    [design.nodes, locked, readOnly, updateDesign]
  );

  const handleConnect = useCallback(
    (edge: Edge) => {
      if (locked || readOnly) return;
      updateDesign((prev) => {
        const exists = prev.edges.some(
          (existing) =>
            (existing.from === edge.from && existing.to === edge.to) ||
            (existing.from === edge.to && existing.to === edge.from)
        );
        if (exists) {
          return prev;
        }
        return {
          ...prev,
          edges: [
            ...prev.edges,
            {
              ...edge,
              id: `edge-${Date.now()}`,
            },
          ],
        };
      });
    },
    [locked, readOnly, updateDesign]
  );

  const handleDrop = useCallback(
    (kind: string, position: { x: number; y: number }) => {
      addNode(kind as ComponentKind, position);
    },
    [addNode]
  );

  const handleNodesChange = useCallback(
    (nextNodes: PlacedNode[]) => {
      if (locked || readOnly) return;
      updateDesign((prev) => ({
        ...prev,
        nodes: nextNodes,
        edges: pruneEdges(prev.edges, nextNodes),
      }));
    },
    [locked, readOnly, updateDesign]
  );

  const handleEdgesChange = useCallback(
    (nextEdges: Edge[]) => {
      if (locked || readOnly) return;
      updateDesign((prev) => ({
        ...prev,
        edges: nextEdges,
      }));
    },
    [locked, readOnly, updateDesign]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (locked || readOnly) return;
      updateDesign((prev) => {
        const nodes = prev.nodes.filter((node) => node.id !== nodeId);
        const edges = pruneEdges(prev.edges, nodes);
        return { ...prev, nodes, edges };
      });
    },
    [locked, readOnly, updateDesign]
  );

  const handleUpdateReplicas = useCallback(
    (nodeId: string, replicas: number) => {
      if (locked || readOnly) return;
      updateDesign((prev) => ({
        ...prev,
        nodes: prev.nodes.map(node =>
          node.id === nodeId ? { ...node, replicas } : node
        ),
      }));
      track("practice_design_node_replicas_changed", { slug: "url-shortener", nodeId, replicas });
    },
    [locked, readOnly, updateDesign]
  );

  const designHasCache = useMemo(
    () => design.nodes.some((node) => node.spec.kind === "Cache (Redis)"),
    [design.nodes]
  );

  const serviceNode = useMemo(
    () => design.nodes.find((node) => node.spec.kind === "Service"),
    [design.nodes]
  );

  const cacheNode = useMemo(
    () => design.nodes.find((node) => node.spec.kind === "Cache (Redis)"),
    [design.nodes]
  );

  const dbNode = useMemo(
    () => design.nodes.find((node) => node.spec.kind === "DB (Postgres)"),
    [design.nodes]
  );

  const cacheOnPath =
    designHasCache &&
    serviceNode &&
    cacheNode &&
    dbNode &&
    hasEdge(design.edges, serviceNode.id, cacheNode.id) &&
    hasEdge(design.edges, cacheNode.id, dbNode.id) &&
    !hasEdge(design.edges, serviceNode.id, dbNode.id); // No direct service → db bypass

  const requiresAnalytics = requirements.functional["basic-analytics"];
  const analyticsPresent = design.nodes.some(
    (node) => node.spec.kind === "Message Queue (Kafka Topic)"
  );

  const designReady = cacheOnPath && (!requiresAnalytics || analyticsPresent);

  const pathPreview = useMemo(() => {
    const path = findScenarioPath(URL_SHORTENER, design.nodes, design.edges);
    return path.nodeIds.map((id) => {
      const node = design.nodes.find((n) => n.id === id);
      return node?.spec.label ?? node?.spec.kind ?? id;
    });
  }, [design.nodes, design.edges]);

  const canContinue = !locked && !readOnly && (designReady || designComplete);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">Design</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Follow the checklist to shape a fast redirect flow. On desktop we pulled the components to the left and the coach panel to the right so you have a roomy canvas in the middle.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-zinc-300">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1">
              Target path: {pathPreview.join(" → ")}
            </span>
            {requiresAnalytics ? (
              <span className={`rounded-full border px-3 py-1 ${
                analyticsPresent
                  ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-200"
                  : "border-indigo-400/40 bg-transparent text-indigo-200"
              }`}>
                Analytics queue required
              </span>
            ) : (
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-300">
                Analytics optional
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          {!design.guidedDismissed ? (
            <button
              type="button"
              onClick={handleSkipGuidance}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
            >
              Skip guided mode
            </button>
          ) : (
            <span className="text-xs text-zinc-400">
              Free mode unlocked. Re-enable guidance by refreshing.
            </span>
          )}
          <button
            type="button"
            onClick={() => track("practice_design_reset_prompt", { slug: "url-shortener" })}
            className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
            disabled
          >
            Reset board (coming soon)
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(320px,1fr)_minmax(780px,auto)_minmax(320px,1fr)] lg:gap-8 lg:items-start lg:max-w-screen-2xl lg:mx-auto">
        <aside className="order-2 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:order-2 lg:order-1 lg:sticky lg:top-28 lg:h-[660px] lg:flex lg:flex-col lg:min-h-[660px] lg:overflow-hidden">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Component palette</h3>
          <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
            Pick the blocks you need. Drag them into the board or click to spawn near the current flow.
          </p>
          <Palette
            componentLibrary={paletteItems}
            onSpawn={addNode}
            title=""
            subtitle=""
            className="mt-4 flex flex-1 min-h-0 flex-col gap-3"
            listClassName="pb-4"
          />
        </aside>

        <div className="order-1 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-3 sm:order-1 lg:order-2 lg:px-8 lg:py-6 sm:p-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-2 lg:p-6">
            <div className="relative h-[580px] sm:h-[640px] lg:h-[720px] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/50">
              {locked || readOnly ? (
                <div className="absolute inset-0 z-20 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center text-sm text-zinc-300">
                  Shared view · editing disabled
                </div>
              ) : null}
              <ReactFlowBoard
                nodes={design.nodes}
                edges={design.edges}
                onConnect={handleConnect}
                onDrop={handleDrop}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onDeleteNode={handleDeleteNode}
                onUpdateReplicas={handleUpdateReplicas}
                className={locked || readOnly ? "pointer-events-none opacity-60" : ""}
              />
            </div>
          </div>
        </div>

        <aside className="order-3 flex flex-col gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:order-3 lg:order-3 lg:sticky lg:top-28 lg:h-[640px]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Guided steps</h3>
            <span className="text-xs text-zinc-500">
              {design.guidedCompleted ? "Complete" : `${Math.min(design.guidedStepIndex + 1, stepCount)}/${stepCount}`}
            </span>
          </div>
          {currentStep ? (
            <div className="rounded-2xl border border-blue-400/30 bg-blue-500/10 p-4 text-sm text-blue-50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-200">
                Step {design.guidedStepIndex + 1}
                {currentStep.optional ? (
                  <span className="rounded-full border border-yellow-400/40 bg-yellow-500/20 px-2 py-0.5 text-[10px] font-semibold text-yellow-100 uppercase">
                    Optional
                  </span>
                ) : null}
              </div>
              <h4 className="text-base font-semibold text-white">{currentStep.title}</h4>
              <p className="text-sm leading-relaxed text-blue-100">{currentStep.body}</p>
              {!currentStep.auto ? (
                <button
                  type="button"
                  onClick={handleAdvanceManualStep}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-white/20 px-4 text-sm font-semibold text-white transition hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  Got it → next
                </button>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              Guided mode is complete. Iterate freely or continue to simulation.
            </div>
          )}

          <div className="space-y-2 text-xs text-zinc-400">
            <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
              cacheOnPath ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100" : "border-zinc-700"
            }`}>
              <span className="h-2 w-2 rounded-full bg-current" />
              Cache sits on redirect path
            </div>
            {requiresAnalytics ? (
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                analyticsPresent ? "border-indigo-400/40 bg-indigo-500/10 text-indigo-100" : "border-zinc-700"
              }`}>
                <span className="h-2 w-2 rounded-full bg-current" />
                Analytics queue added
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => {
              track("practice_design_continue_clicked", { slug: "url-shortener" });
              onContinue();
            }}
            disabled={!canContinue}
            className="mt-auto inline-flex h-12 items-center justify-center rounded-full bg-emerald-500 px-6 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-300"
          >
            Continue to Run
          </button>
          {!designReady ? (
            <p className="text-xs text-zinc-500">
              Need help? Make sure the green redirect arrow goes Service → Redis → Postgres (and drop in a queue if analytics is on) to unlock the simulator.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
