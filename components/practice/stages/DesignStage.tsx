"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { TooltipProvider } from "@/components/ui/tooltip";
import { logger } from "@/lib/logger";
import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";

type UpdateDesignFn = (updater: (prev: PracticeDesignState) => PracticeDesignState) => void;

type DesignStageProps = {
  design: PracticeDesignState;
  requirements: Requirements;
  locked: boolean;
  readOnly?: boolean;
  designComplete?: boolean;
  updateDesign: UpdateDesignFn;
  onContinue: () => void;
  onGoBack?: () => void;
  allowedComponentKinds?: ComponentKind[];
  showFooterControls?: boolean;
  layout?: "guided" | "immersive";
  onOpenPalette?: () => void;
  onOpenSimulation?: () => void;
  showPaletteTrigger?: boolean;
  simulationLocked?: boolean;
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
  simulationLocked = false,
  designComplete = false,
  updateDesign,
  onContinue,
  onGoBack,
  allowedComponentKinds,
  showFooterControls = true,
  layout = "guided",
  onOpenPalette: _onOpenPalette,
  onOpenSimulation: _onOpenSimulation,
  showPaletteTrigger: _showPaletteTrigger = true,
}: DesignStageProps) {
  // Access session to clear simulation state when design changes
  const session = usePracticeSession();
  const editingLocked = locked || readOnly || simulationLocked;
  const lockMessage = readOnly
    ? "Shared view · editing disabled"
    : simulationLocked
      ? "Simulation running… editing will unlock when the run completes."
      : locked
        ? "Editing locked for this session."
        : null;
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const allowedKinds = useMemo<ComponentKind[]>(
    () => (allowedComponentKinds && allowedComponentKinds.length ? allowedComponentKinds : RECOMMENDED_COMPONENTS),
    [allowedComponentKinds]
  );
  const paletteItems = useMemo(
    () =>
      COMPONENT_LIBRARY.filter((component) =>
        allowedKinds.includes(component.kind)
      ),
    [allowedKinds]
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
    if (design.guidedDismissed || editingLocked) return;
    updateDesign((prev) => ({
      ...prev,
      guidedDismissed: true,
      freeModeUnlocked: true,
    }));
    track("practice_design_guided_skipped", { slug: "url-shortener", step: currentStep?.id ?? "unknown" });
  }, [design.guidedDismissed, updateDesign, currentStep?.id, editingLocked]);

  const addNode = useCallback(
    (kind: ComponentKind, position?: { x: number; y: number }) => {
      if (editingLocked) return;
      const spec = componentSpecFor(kind);
      const nodePosition = position ?? nextPosition(design.nodes);
      // FIX Issue #15: Use crypto.randomUUID() to prevent ID collisions
      const uniqueId = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      updateDesign((prev) => ({
        ...prev,
        nodes: [
          ...prev.nodes,
          {
            id: `node-${kind}-${uniqueId}`,
            spec,
            x: nodePosition.x,
            y: nodePosition.y,
            replicas: 1,
          },
        ],
      }));

      // FIX Issue #1: Clear simulation state when design changes
      session.setRun((prev) => ({
        ...prev,
        lastResult: null,
        isRunning: false,
      }));

      // FIX Issue #1: Clear design score when design changes
      session.setStepScore("design", undefined);
      session.setStepScore("simulation", undefined);

      track("practice_design_node_added", { slug: "url-shortener", kind });
    },
    [design.nodes, editingLocked, updateDesign, session]
  );

  const handleConnect = useCallback(
    (edge: Edge) => {
      if (editingLocked) return;
      let didChange = false;
      // FIX Issue #15: Use crypto.randomUUID() to prevent ID collisions
      const uniqueId = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      updateDesign((prev) => {
        const exists = prev.edges.some(
          (existing) =>
            (existing.from === edge.from && existing.to === edge.to) ||
            (existing.from === edge.to && existing.to === edge.from)
        );
        if (exists) {
          return prev;
        }
        didChange = true;
        return {
          ...prev,
          edges: [
            ...prev.edges,
            {
              ...edge,
              id: `edge-${uniqueId}`,
            },
          ],
        };
      });

      // FIX Issue #1: Clear simulation state when design changes (only if edge was actually added)
      if (didChange) {
        session.setRun((prev) => ({
          ...prev,
          lastResult: null,
        }));

        // FIX Issue #1: Clear design score when design changes
        session.setStepScore("design", undefined);
        session.setStepScore("simulation", undefined);
      }
    },
    [editingLocked, updateDesign, session]
  );

  const handleDrop = useCallback(
    (kind: string, position: { x: number; y: number }) => {
      addNode(kind as ComponentKind, position);
    },
    [addNode]
  );

  const handleNodesChange = useCallback(
    (nextNodes: PlacedNode[]) => {
      if (editingLocked) return;
      let prunedEdges: Edge[] = [];
      updateDesign((prev) => {
        const edges = pruneEdges(prev.edges, nextNodes);
        prunedEdges = edges;
        return {
          ...prev,
          nodes: nextNodes,
          edges,
        };
      });

      // FIX Issue #1: Clear simulation state when design changes
      session.setRun((prev) => ({
        ...prev,
        lastResult: null,
        isRunning: false,
      }));

      // FIX Issue #1: Clear design score when design changes
      session.setStepScore("design", undefined);
      session.setStepScore("simulation", undefined);

      setSelectedNodeId((prev) =>
        prev && nextNodes.some((node) => node.id === prev) ? prev : null
      );
      setSelectedEdgeId((prev) =>
        prev && prunedEdges.some((edge) => edge.id === prev) ? prev : null
      );
    },
    [editingLocked, updateDesign, session]
  );

  const handleEdgesChange = useCallback(
    (nextEdges: Edge[]) => {
      if (editingLocked) return;
      updateDesign((prev) => ({
        ...prev,
        edges: nextEdges,
      }));

      // FIX Issue #1: Clear simulation state when design changes
      session.setRun((prev) => ({
        ...prev,
        lastResult: null,
        isRunning: false,
      }));

      // FIX Issue #1: Clear design score when design changes
      session.setStepScore("design", undefined);
      session.setStepScore("simulation", undefined);

      setSelectedEdgeId((prev) =>
        prev && nextEdges.some((edge) => edge.id === prev) ? prev : null
      );
    },
    [editingLocked, updateDesign, session]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (editingLocked) return;
      let prunedEdges: Edge[] = [];
      updateDesign((prev) => {
        const nodes = prev.nodes.filter((node) => node.id !== nodeId);
        const edges = pruneEdges(prev.edges, nodes);
        prunedEdges = edges;
        return { ...prev, nodes, edges };
      });

      // FIX Issue #1: Clear simulation state when design changes
      session.setRun((prev) => ({
        ...prev,
        lastResult: null,
        isRunning: false,
      }));

      // FIX Issue #1: Clear design score when design changes
      session.setStepScore("design", undefined);
      session.setStepScore("simulation", undefined);

      setSelectedNodeId((prev) => (prev === nodeId ? null : prev));
      setSelectedEdgeId((prev) =>
        prev && prunedEdges.some((edge) => edge.id === prev) ? prev : null
      );
    },
    [editingLocked, updateDesign, session]
  );

  const handleUpdateReplicas = useCallback(
    (nodeId: string, replicas: number) => {
      if (editingLocked) return;
      updateDesign((prev) => ({
        ...prev,
        nodes: prev.nodes.map(node =>
          node.id === nodeId ? { ...node, replicas } : node
        ),
      }));

      // FIX Issue #1: Clear simulation state when design changes (replicas affect capacity)
      session.setRun((prev) => ({
        ...prev,
        lastResult: null,
        isRunning: false,
      }));

      // FIX Issue #1: Clear design score when design changes
      session.setStepScore("design", undefined);
      session.setStepScore("simulation", undefined);

      track("practice_design_node_replicas_changed", { slug: "url-shortener", nodeId, replicas });
    },
    [editingLocked, updateDesign, session]
  );

  const handleEdgeSelect = useCallback((edgeId: string | null) => {
    setSelectedEdgeId(edgeId);
    if (edgeId) {
      setSelectedNodeId(null);
    }
  }, []);

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId) {
      setSelectedEdgeId(null);
    }
  }, []);

  const handleNodeTouchStart = useCallback((nodeId: string) => {
    if (editingLocked) return;
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
  }, [editingLocked]);

  const handleNodeTouchEnd = useCallback(() => {
    // Touch end currently unused; reserved for future mobile gestures
  }, []);

  const handleDeleteSelection = useCallback(() => {
    if (editingLocked) return;
    if (selectedEdgeId) {
      updateDesign((prev) => ({
        ...prev,
        edges: prev.edges.filter((edge) => edge.id !== selectedEdgeId),
      }));

      // FIX Issue #1: Clear simulation state when design changes
      session.setRun((prev) => ({
        ...prev,
        lastResult: null,
        isRunning: false,
      }));

      // FIX Issue #1: Clear design score when design changes
      session.setStepScore("design", undefined);
      session.setStepScore("simulation", undefined);

      setSelectedEdgeId(null);
      return;
    }
    if (selectedNodeId) {
      let prunedEdges: Edge[] = [];
      updateDesign((prev) => {
        const nodes = prev.nodes.filter((node) => node.id !== selectedNodeId);
        const edges = pruneEdges(prev.edges, nodes);
        prunedEdges = edges;
        return { ...prev, nodes, edges };
      });

      // FIX Issue #1: Clear simulation state when design changes
      session.setRun((prev) => ({
        ...prev,
        lastResult: null,
        isRunning: false,
      }));

      // FIX Issue #1: Clear design score when design changes
      session.setStepScore("design", undefined);
      session.setStepScore("simulation", undefined);

      setSelectedNodeId(null);
      setSelectedEdgeId((prev) =>
        prev && prunedEdges.some((edge) => edge.id === prev) ? prev : null
      );
    }
  }, [editingLocked, selectedEdgeId, selectedNodeId, updateDesign, session]);

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

  const apiGatewayNode = useMemo(
    () => design.nodes.find((node) => node.spec.kind === "API Gateway"),
    [design.nodes]
  );

  const rateLimiterNode = useMemo(
    () => design.nodes.find((node) => node.spec.kind === "Rate Limiter"),
    [design.nodes]
  );

  const authNode = useMemo(
    () => design.nodes.find((node) => node.spec.kind === "Auth"),
    [design.nodes]
  );

  const designHasCache = useMemo(
    () => design.nodes.some((node) => node.spec.kind === "Cache (Redis)"),
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
  const requiresRateLimit = requirements.functional["rate-limiting"];
  const requiresAdminDelete = requirements.functional["admin-delete"];

  const analyticsReady = useMemo(() => {
    if (!requiresAnalytics) return false;
    const queues = design.nodes.filter((node) => node.spec.kind === "Message Queue (Kafka Topic)");
    const workers = design.nodes.filter((node) => node.spec.kind === "Worker Pool");
    if (!serviceNode || queues.length === 0 || workers.length === 0) return false;
    const serviceToQueue = queues.some((queue) => hasEdge(design.edges, serviceNode.id, queue.id));
    const queueToWorker = queues.some((queue) =>
      workers.some((worker) => hasEdge(design.edges, queue.id, worker.id))
    );
    return serviceToQueue && queueToWorker;
  }, [design.edges, design.nodes, requiresAnalytics, serviceNode]);

  const rateLimiterReady = useMemo(() => {
    if (!requiresRateLimit) return false;
    if (!rateLimiterNode || !serviceNode) return false;
    const limiterToService = hasEdge(design.edges, rateLimiterNode.id, serviceNode.id);
    if (!limiterToService) return false;
    if (!apiGatewayNode) return true;
    return hasEdge(design.edges, apiGatewayNode.id, rateLimiterNode.id);
  }, [apiGatewayNode, design.edges, rateLimiterNode, requiresRateLimit, serviceNode]);

  const adminFlowReady = useMemo(() => {
    if (!requiresAdminDelete) return false;
    if (!authNode || !serviceNode) return false;
    return hasEdge(design.edges, authNode.id, serviceNode.id);
  }, [authNode, design.edges, requiresAdminDelete, serviceNode]);

  const designReady =
    cacheOnPath &&
    (!requiresAnalytics || analyticsReady) &&
    (!requiresRateLimit || rateLimiterReady) &&
    (!requiresAdminDelete || adminFlowReady);

  const pathPreview = useMemo(() => {
    const path = findScenarioPath(URL_SHORTENER, design.nodes, design.edges);
    return path.nodeIds.map((id) => {
      const node = design.nodes.find((n) => n.id === id);
      return node?.spec.label ?? node?.spec.kind ?? id;
    });
  }, [design.nodes, design.edges]);

  const canContinue = !editingLocked && (designReady || designComplete);

  if (layout === "immersive") {
    return (
      <TooltipProvider>
        <div className="relative flex-1 min-h-[600px]">
          <div className="relative flex h-full w-full flex-col overflow-hidden bg-zinc-950 min-h-[600px] sm:rounded-3xl sm:border sm:border-zinc-800 sm:bg-zinc-900/70 lg:rounded-none lg:border-none lg:bg-zinc-950">
            <div className="flex-1 min-h-[560px] p-2 sm:p-6 lg:p-0">
              <div className="relative h-full w-full overflow-hidden bg-zinc-950 min-h-[520px] sm:rounded-2xl sm:border sm:border-zinc-800 sm:bg-zinc-950/40 lg:rounded-none lg:border-none lg:bg-zinc-950">
                {!editingLocked && (selectedNodeId || selectedEdgeId) ? (
                  <div className="absolute right-4 top-4 z-30 sm:left-4 sm:right-auto">
                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteSelection();
                        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                          navigator.vibrate(30);
                        }
                      }}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-rose-400/40 bg-rose-500/15 text-rose-200 shadow-lg transition hover:bg-rose-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 touch-manipulation"
                      aria-label="Delete selected"
                      title="Delete selected"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : null}

                {lockMessage ? (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm text-sm text-zinc-300">
                    {lockMessage}
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
                  onNodeTouchStart={handleNodeTouchStart}
                  onNodeTouchEnd={handleNodeTouchEnd}
                  onEdgeSelect={handleEdgeSelect}
                  onNodeSelect={handleNodeSelect}
                  miniMapBottomOffset={100}
                  className={editingLocked ? "pointer-events-none opacity-60" : ""}
                />
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
            Phase 2 · Guided design
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white sm:text-2xl">URL Shortener</h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Follow the checklist to shape a fast redirect path. The palette and coach panel flank the canvas so you can iterate with plenty of room.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-emerald-100 lg:flex-nowrap">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-emerald-100 whitespace-normal">
              Target path: {pathPreview.join(" → ")}
            </span>
            {requiresAnalytics ? (
              <span
                className={`rounded-full border px-3 py-1 whitespace-normal ${
                  analyticsReady
                    ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-100"
                    : "border-indigo-400/40 bg-transparent text-indigo-200"
                }`}
              >
                {analyticsReady ? "Analytics queue ready" : "Add analytics queue"}
              </span>
            ) : (
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-300 whitespace-normal">
                Analytics optional
              </span>
            )}
            {requiresRateLimit ? (
              <span
                className={`rounded-full border px-3 py-1 whitespace-normal ${
                  rateLimiterReady
                    ? "border-amber-400/40 bg-amber-500/15 text-amber-100"
                    : "border-amber-400/40 bg-transparent text-amber-200"
                }`}
              >
                {rateLimiterReady ? "Rate limiter inline" : "Add rate limiter"}
              </span>
            ) : null}
            {requiresAdminDelete ? (
              <span
                className={`rounded-full border px-3 py-1 whitespace-normal ${
                  adminFlowReady
                    ? "border-rose-400/40 bg-rose-500/15 text-rose-100"
                    : "border-rose-400/40 bg-transparent text-rose-200"
                }`}
              >
                {adminFlowReady ? "Auth protects admin deletes" : "Secure admin deletes"}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 text-xs sm:items-end" />
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-6">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(280px,0.9fr)_minmax(720px,1.2fr)_minmax(280px,0.9fr)] lg:items-start lg:gap-6 lg:max-w-screen-2xl lg:mx-auto">
          <aside className="order-3 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:order-2 lg:order-1 lg:sticky lg:top-28 lg:h-[640px] lg:flex lg:flex-col lg:min-h-[640px] lg:overflow-hidden">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Component palette</h3>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
              Pick the blocks you need. Tap to drop components on mobile, or drag and drop on desktop to place them exactly where you want.
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

          <div className="order-2 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-3 sm:order-1 lg:order-2 lg:px-6 lg:py-6 sm:p-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-2 lg:p-6">
              <div className="relative h-[65vh] min-h-[420px] max-h-[640px] sm:h-[70vh] lg:h-[640px] lg:max-h-none rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/50">
                {!editingLocked && (selectedNodeId || selectedEdgeId) ? (
                  <div className="absolute top-3 right-3 z-30">
                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteSelection();
                        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                          navigator.vibrate(30);
                        }
                      }}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500/15 border border-red-400/40 text-red-200 hover:bg-red-500/25 transition touch-manipulation"
                      aria-label="Delete selected"
                      title="Delete selected"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : null}
                {lockMessage ? (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm text-sm text-zinc-300">
                    {lockMessage}
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
                  onNodeTouchStart={handleNodeTouchStart}
                  onNodeTouchEnd={handleNodeTouchEnd}
                  onEdgeSelect={handleEdgeSelect}
                  onNodeSelect={handleNodeSelect}
                  miniMapBottomOffset={100}
                  className={editingLocked ? "pointer-events-none opacity-60" : ""}
                />
              </div>
            </div>
          </div>

          <aside className="order-1 flex flex-col gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:order-3 lg:order-3 lg:sticky lg:top-28 lg:h-[620px] lg:min-h-[620px]">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Guided steps</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">
                  {design.guidedCompleted ? "Complete" : `${Math.min(design.guidedStepIndex + 1, stepCount)}/${stepCount}`}
                </span>
                {!design.guidedDismissed && !design.guidedCompleted ? (
                  <button
                    type="button"
                    onClick={handleSkipGuidance}
                    className="rounded-full border border-zinc-700 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-300 transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={editingLocked}
                  >
                    Skip
                  </button>
                ) : null}
              </div>
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
              <div
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                  cacheOnPath ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100" : "border-zinc-700"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
                Cache sits on redirect path
              </div>
              {requiresAnalytics ? (
                <div
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                    analyticsReady ? "border-indigo-400/40 bg-indigo-500/10 text-indigo-100" : "border-zinc-700"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-current" />
                  Analytics queue wired
                </div>
              ) : null}
              {requiresRateLimit ? (
                <div
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                    rateLimiterReady ? "border-amber-400/40 bg-amber-500/10 text-amber-100" : "border-zinc-700"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-current" />
                  Rate limiter guards the service
                </div>
              ) : null}
              {requiresAdminDelete ? (
                <div
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                    adminFlowReady ? "border-rose-400/40 bg-rose-500/10 text-rose-100" : "border-zinc-700"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-current" />
                  Auth fronts admin deletes
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

      {showFooterControls ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          {onGoBack ? (
            <button
              type="button"
              onClick={() => {
                track("practice_design_goback_clicked", { slug: "url-shortener" });
                onGoBack();
              }}
              disabled={editingLocked}
              className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 px-6 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              ← Back to Requirements
            </button>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                track("practice_design_continue_clicked", { slug: "url-shortener" });
                onContinue();
              }}
              disabled={!canContinue}
              className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-500 px-6 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-300"
            >
              Continue to Run
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
