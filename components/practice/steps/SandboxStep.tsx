"use client";

import { useMemo } from "react";
import type { ComponentKind } from "@/app/components/types";
import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import DesignStage from "@/components/practice/stages/DesignStage";
import RunStage from "@/components/practice/stages/RunStage";
import type { PracticeDesignState, Requirements } from "@/lib/practice/types";
import { Sidebar } from "@/components/practice/Sidebar";
import Palette from "@/app/components/Palette";
import { COMPONENT_LIBRARY } from "@/app/components/data";

const BASE_COMPONENTS: ComponentKind[] = [
  "Web",
  "API Gateway",
  "Load Balancer",
  "Service",
  "Cache (Redis)",
  "DB (Postgres)",
  "CDN",
  "Edge Function",
  "Object Store (S3)",
  "Tracing/Logging",
];

const analyticsComponents: ComponentKind[] = ["Message Queue (Kafka Topic)", "Worker Pool"];
const rateLimitComponents: ComponentKind[] = ["Rate Limiter"];
const adminComponents: ComponentKind[] = ["Auth"];

const computeAllowedComponents = (requirements: Requirements): ComponentKind[] => {
  const set = new Set<ComponentKind>(BASE_COMPONENTS);

  if (requirements.functional["basic-analytics"]) {
    analyticsComponents.forEach((kind) => set.add(kind));
  }
  if (requirements.functional["rate-limiting"]) {
    rateLimitComponents.forEach((kind) => set.add(kind));
  }
  if (requirements.functional["admin-delete"]) {
    adminComponents.forEach((kind) => set.add(kind));
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
  runPanelOpen: _runPanelOpen,
  onRunPanelChange,
}: SandboxStepProps) {
  const {
    state,
    setDesign,
    setRun,
    setStepScore,
    isReadOnly,
  } = usePracticeSession();

  const allowedComponents = useMemo(
    () => computeAllowedComponents(state.requirements),
    [state.requirements]
  );

  const mobilePaletteItems = useMemo(
    () => COMPONENT_LIBRARY.filter((component) => allowedComponents.includes(component.kind)),
    [allowedComponents]
  );

  return (
    <>
      <div className="relative flex h-full w-full overflow-hidden">
        <DesignStage
          design={state.design}
          requirements={state.requirements}
          locked={isReadOnly}
          readOnly={isReadOnly}
          designComplete={state.completed.sandbox}
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

      {/* Component Palette - Slides up from bottom with narrower width */}
      <Sidebar
        isOpen={mobilePaletteOpen}
        onClose={() => onMobilePaletteChange(false)}
        title="Components"
      >
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
      </Sidebar>

      {/* Keep RunStage mounted but hidden so window._runSimulation is always available */}
      <div style={{ display: 'none' }}>
        <RunStage
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
