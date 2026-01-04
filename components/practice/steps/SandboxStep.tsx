"use client";

import { useMemo } from "react";
import type { ComponentKind } from "@/app/components/types";
import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import DesignStage from "@/components/practice/stages/DesignStage";
import RunStage from "@/components/practice/stages/RunStage";
import type {
  PracticeDesignState,
  Requirements,
  PracticeApiDefinitionState,
} from "@/lib/practice/types";
import Palette from "@/app/components/Palette";
import { COMPONENT_LIBRARY } from "@/app/components/data";

const BASE_COMPONENTS: ComponentKind[] = [
  "Web",
  "API Gateway",
  "Service",
  "Cache (Redis)",
  "DB (Postgres)",
];

const analyticsComponents: ComponentKind[] = ["Message Queue (Kafka Topic)", "Worker Pool"];
const rateLimitComponents: ComponentKind[] = ["Rate Limiter"];
const adminComponents: ComponentKind[] = ["Auth"];
const searchComponents: ComponentKind[] = ["Search Index (Elastic)"];
const scalingComponents: ComponentKind[] = []; // Removed: Read Replica, Shard Router - not needed for max points
const streamingComponents: ComponentKind[] = ["Stream Processor (Flink)"];
const idComponents: ComponentKind[] = ["ID Generator (Snowflake)"];

const computeAllowedComponents = (
  requirements: Requirements,
  apiDefinition: PracticeApiDefinitionState
): ComponentKind[] => {
  const set = new Set<ComponentKind>(BASE_COMPONENTS);

  // Based on functional requirements
  if (requirements.functional["basic-analytics"]) {
    analyticsComponents.forEach((kind) => set.add(kind));
  }
  if (requirements.functional["rate-limiting"]) {
    rateLimitComponents.forEach((kind) => set.add(kind));
  }
  if (requirements.functional["admin-delete"]) {
    adminComponents.forEach((kind) => set.add(kind));
  }

  // Based on API routes - detect search/query endpoints
  const hasSearchEndpoint = apiDefinition.endpoints.some(
    (ep) =>
      ep.path.toLowerCase().includes("search") ||
      ep.path.toLowerCase().includes("query") ||
      ep.notes.toLowerCase().includes("search")
  );
  if (hasSearchEndpoint) {
    searchComponents.forEach((kind) => set.add(kind));
  }

  // Based on API routes - detect streaming/realtime endpoints
  const hasStreamingEndpoint = apiDefinition.endpoints.some(
    (ep) =>
      ep.path.toLowerCase().includes("stream") ||
      ep.path.toLowerCase().includes("websocket") ||
      ep.path.toLowerCase().includes("realtime") ||
      ep.notes.toLowerCase().includes("stream") ||
      ep.notes.toLowerCase().includes("realtime")
  );
  if (hasStreamingEndpoint) {
    streamingComponents.forEach((kind) => set.add(kind));
  }

  // Based on non-functional requirements - high read load suggests replicas
  const highReadLoad = requirements.nonFunctional.readRps > 5000;
  if (highReadLoad) {
    scalingComponents.forEach((kind) => set.add(kind));
  }

  // Based on non-functional requirements - need for unique IDs at scale
  const needsUniqueIds =
    requirements.nonFunctional.writeRps > 1000 ||
    requirements.functionalSummary.toLowerCase().includes("unique id") ||
    requirements.functionalSummary.toLowerCase().includes("distributed id");
  if (needsUniqueIds) {
    idComponents.forEach((kind) => set.add(kind));
  }

  return Array.from(set);
};

const nextSpawnPosition = (nodes: PracticeDesignState["nodes"]) => {
  if (!nodes.length) {
    return { x: -120, y: -140 };
  }
  const maxX = Math.max(...nodes.map((node) => node.x));
  const offsetY = nodes.length % 2 === 0 ? 80 : -80;
  return { x: maxX + 180, y: offsetY };
};

type SandboxStepProps = {
  mobilePaletteOpen: boolean;
  onMobilePaletteChange: (open: boolean) => void;
  runPanelOpen: boolean;
  onRunPanelChange: (open: boolean) => void;
};

export function SandboxStep({
  mobilePaletteOpen,
  onMobilePaletteChange,
  runPanelOpen,
  onRunPanelChange,
}: SandboxStepProps) {
  const { state, setDesign, setRun, setStepScore, isReadOnly } = usePracticeSession();

  const allowedComponents = useMemo(
    () => computeAllowedComponents(state.requirements, state.apiDefinition),
    [state.requirements, state.apiDefinition]
  );

  const mobilePaletteItems = useMemo(
    () => COMPONENT_LIBRARY.filter((component) => allowedComponents.includes(component.kind)),
    [allowedComponents]
  );

  return (
    <>
      <div className="relative flex h-full w-full flex-col overflow-hidden pt-4 sm:pt-0">
        <div className="relative flex flex-1 w-full overflow-hidden">
          <DesignStage
            design={state.design}
            requirements={state.requirements}
            locked={isReadOnly}
            readOnly={isReadOnly}
            simulationLocked={state.run.isRunning}
            designComplete={state.completed.highLevelDesign}
            updateDesign={setDesign}
            onContinue={() => {}}
            allowedComponentKinds={allowedComponents}
            showFooterControls={false}
            layout="immersive"
            onOpenPalette={() => {
              if (isReadOnly) return;
              onMobilePaletteChange(true);
            }}
            onOpenSimulation={() => {
              if (isReadOnly) return;
              onRunPanelChange(true);
            }}
            showPaletteTrigger={false}
          />
        </div>
      </div>

      {/* Component Palette - Slides up from bottom with narrower width */}
      {mobilePaletteOpen && (
        <>
          {/* Invisible backdrop - pointer-events-none on palette, but handles drag/drop */}
          <div
            className="fixed inset-0 z-40 transition-opacity duration-300 pointer-events-none"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Let the drop event bubble to ReactFlowBoard
              const kind =
                e.dataTransfer.getData("application/x-sds-kind") ||
                e.dataTransfer.getData("text/plain");
              if (!kind || isReadOnly) return;

              // Close the palette
              onMobilePaletteChange(false);

              // Get the canvas element and trigger drop on it
              const canvas = document.querySelector(".react-flow");
              if (canvas) {
                const _canvasBounds = canvas.getBoundingClientRect();
                const dropEvent = new DragEvent("drop", {
                  bubbles: true,
                  cancelable: true,
                  clientX: e.clientX,
                  clientY: e.clientY,
                  dataTransfer: e.dataTransfer,
                });
                canvas.dispatchEvent(dropEvent);
              }
            }}
            aria-hidden="true"
          />

          {/* Sidebar */}
          <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl border border-zinc-800 bg-zinc-900 shadow-2xl transition-transform duration-300 ease-out lg:inset-x-auto lg:right-6 lg:w-full lg:max-w-md translate-y-0 pointer-events-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4">
              <h2 className="text-lg font-semibold text-white">Components</h2>
              <button
                type="button"
                onClick={() => onMobilePaletteChange(false)}
                className="ml-auto rounded-full p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[60vh] flex-1 overflow-y-auto lg:max-h-[70vh]">
              <Palette
                componentLibrary={mobilePaletteItems}
                onSpawn={(kind) => {
                  if (isReadOnly) return;
                  const spec = COMPONENT_LIBRARY.find((c) => c.kind === kind);
                  if (!spec) return;
                  setDesign((prev) => {
                    const position = nextSpawnPosition(prev.nodes);
                    return {
                      ...prev,
                      nodes: [
                        ...prev.nodes,
                        {
                          id: `${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
                          spec,
                          x: position.x,
                          y: position.y,
                          replicas: 1,
                        },
                      ],
                    };
                  });
                  onMobilePaletteChange(false);
                }}
                className="h-full"
                listClassName="pb-10"
              />
            </div>
          </div>
        </>
      )}

      {/* Simulation Panel - Slides up from bottom */}
      {runPanelOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
            onClick={() => onRunPanelChange(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl border border-zinc-800 bg-zinc-900 shadow-2xl transition-transform duration-300 ease-out lg:inset-x-auto lg:right-6 lg:w-full lg:max-w-md translate-y-0 pointer-events-auto max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white">Simulation</h2>
              <button
                type="button"
                onClick={() => onRunPanelChange(false)}
                className="ml-auto rounded-full p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <RunStage
                slug={state.slug}
                design={state.design}
                run={state.run}
                requirements={state.requirements}
                locked={isReadOnly}
                readOnly={isReadOnly}
                updateRun={setRun}
                setStepScore={setStepScore}
                onContinue={() => {
                  onRunPanelChange(false);
                }}
                showFooterControls={false}
              />
            </div>
          </div>
        </>
      )}

      {/* RunStage listens for simulation:run events - keep mounted for event handling */}
      <div className="hidden">
        <RunStage
          slug={state.slug}
          design={state.design}
          run={state.run}
          requirements={state.requirements}
          locked={isReadOnly}
          readOnly={isReadOnly}
          updateRun={setRun}
          setStepScore={setStepScore}
          onContinue={() => {}}
          showFooterControls={false}
        />
      </div>
    </>
  );
}

export default SandboxStep;
