"use client";

import { useEffect, useMemo } from "react";
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
import { getScoringConfigSync, loadScoringConfig } from "@/lib/scoring";
import { SCENARIOS } from "@/lib/scenarios";

const componentSpecFor = (kind: ComponentKind) => {
  const spec = COMPONENT_LIBRARY.find((c) => c.kind === kind);
  if (!spec) {
    throw new Error(`Component spec not found for kind: ${kind}`);
  }
  return spec;
};

/**
 * Compute allowed components based on scoring config and user requirements.
 * Uses componentRequirements from scoring config to determine which components
 * should be available based on functional requirements.
 */
const computeAllowedComponents = (
  requirements: Requirements,
  _apiDefinition: PracticeApiDefinitionState,
  slug: string
): ComponentKind[] => {
  const config = getScoringConfigSync(slug);
  const componentKinds = new Set<ComponentKind>();

  // Get components from scoring config componentRequirements
  if (config?.steps?.design?.componentRequirements) {
    config.steps.design.componentRequirements.forEach((req) => {
      // Always include the component kind
      if (req.kind) {
        componentKinds.add(req.kind as ComponentKind);
      }

      // Include alternative components
      if (req.alternativesAccepted) {
        req.alternativesAccepted.forEach((alt) => {
          componentKinds.add(alt as ComponentKind);
        });
      }

      // For optional components, check if requiredBy features are enabled
      if (req.requiredBy && req.requiredBy.length > 0) {
        const hasRequiredFeature = req.requiredBy.some(
          (featureId) => requirements.functional[featureId]
        );
        if (!hasRequiredFeature && !req.required) {
          // Optional component that requires a feature - only show if feature is enabled
          componentKinds.delete(req.kind as ComponentKind);
        }
      }
    });
  }

  // If we have components from config, return them
  if (componentKinds.size > 0) {
    return Array.from(componentKinds);
  }

  // Fall back to suggestedComponents from SCENARIOS
  const scenario = SCENARIOS.find((s) => s.id === slug);
  if (scenario?.suggestedComponents) {
    return scenario.suggestedComponents as ComponentKind[];
  }

  return [];
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

  // Preload scoring config to ensure components are available
  useEffect(() => {
    loadScoringConfig(state.slug).catch((err) => {
      console.warn(`[SandboxStep] Failed to preload scoring config for ${state.slug}:`, err);
    });
  }, [state.slug]);

  // Initialize default component based on first guidance rule if design is empty
  useEffect(() => {
    if (isReadOnly || state.design.nodes.length > 0) return;

    const initializeDefaultComponent = async () => {
      try {
        // Load scoring config
        await loadScoringConfig(state.slug);
        const config = getScoringConfigSync(state.slug);

        if (!config?.steps?.design?.guidance?.rules) return;

        // Find the first guidance rule with type "hasKind" to determine initial component
        const firstHasKindRule = config.steps.design.guidance.rules.find(
          (rule) => rule.check.type === "hasKind"
        );

        if (!firstHasKindRule || firstHasKindRule.check.type !== "hasKind") return;

        const initialKind = firstHasKindRule.check.kind as ComponentKind;

        // Check if this component is allowed for this scenario
        const allowedComponents = computeAllowedComponents(
          state.requirements,
          state.apiDefinition,
          state.slug
        );

        if (!allowedComponents.includes(initialKind)) return;

        // Place the component at default position
        const spec = componentSpecFor(initialKind);
        const uniqueId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        setDesign((prev) => ({
          ...prev,
          nodes: [
            {
              id: `node-${initialKind}-${uniqueId}`,
              spec,
              x: -120,
              y: -140,
              replicas: 1,
            },
          ],
        }));
      } catch (error) {
        console.warn(
          `[SandboxStep] Failed to initialize default component for ${state.slug}:`,
          error
        );
      }
    };

    initializeDefaultComponent();
  }, [
    state.slug,
    state.design.nodes.length,
    state.requirements,
    state.apiDefinition,
    isReadOnly,
    setDesign,
  ]);

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
