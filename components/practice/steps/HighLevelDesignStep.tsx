"use client";

import { useMemo } from "react";
import type { ComponentKind } from "@/components/canvas/types";
import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import DesignStage from "@/components/practice/stages/DesignStage";
import RunStage from "@/components/practice/stages/RunStage";
import type {
  PracticeDesignState,
  Requirements,
  PracticeApiDefinitionState,
} from "@/lib/practice/types";
import Palette from "@/components/canvas/Palette";
import { COMPONENT_LIBRARY } from "@/components/canvas/data";
import { getScenarioReferenceSync } from "@/lib/practice/loader";
import { SCENARIOS } from "@/lib/scenarios";

/** Feature-gated component categories that require specific functional requirements */
const FEATURE_GATED_CATEGORIES: Record<string, string[]> = {
  analytics: ["basic-analytics", "analytics"],
  rateLimit: ["rate-limiting", "rate-limit"],
  admin: ["admin-delete", "admin"],
  auth: ["user-accounts", "authentication"],
};

/**
 * Compute allowed components based on scenario reference JSON and user requirements.
 */
const computeAllowedComponents = (
  requirements: Requirements,
  _apiDefinition: PracticeApiDefinitionState,
  slug: string
): ComponentKind[] => {
  const reference = getScenarioReferenceSync(slug);
  const componentsByCategory = reference?.components as Record<string, ComponentKind[]> | undefined;

  // No reference JSON - use suggestedComponents from SCENARIOS
  if (!componentsByCategory) {
    const scenario = SCENARIOS.find((s) => s.id === slug);
    return (scenario?.suggestedComponents as ComponentKind[]) ?? [];
  }

  const set = new Set<ComponentKind>();

  // Add all defined categories except feature-gated ones
  const featureGatedKeys = new Set(Object.keys(FEATURE_GATED_CATEGORIES));
  for (const [category, components] of Object.entries(componentsByCategory)) {
    if (!featureGatedKeys.has(category)) {
      components.forEach((kind) => set.add(kind));
    }
  }

  // Add feature-gated categories based on functional requirements
  for (const [category, featureIds] of Object.entries(FEATURE_GATED_CATEGORIES)) {
    const hasFeature = featureIds.some((id) => requirements.functional[id]);
    if (hasFeature && componentsByCategory[category]) {
      componentsByCategory[category].forEach((kind) => set.add(kind));
    }
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

type HighLevelDesignStepProps = {
  mobilePaletteOpen: boolean;
  onMobilePaletteChange: (open: boolean) => void;
};

export function HighLevelDesignStep({
  mobilePaletteOpen,
  onMobilePaletteChange,
}: HighLevelDesignStepProps) {
  const { state, setDesign, setRun, setStepScore, isReadOnly } = usePracticeSession();

  const allowedComponents = useMemo(
    () => computeAllowedComponents(state.requirements, state.apiDefinition, state.slug),
    [state.requirements, state.apiDefinition, state.slug]
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

export default HighLevelDesignStep;
