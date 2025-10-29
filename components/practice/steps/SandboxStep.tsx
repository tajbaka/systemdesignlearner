"use client";

import { useMemo } from "react";
import type { ComponentKind } from "@/app/components/types";
import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import DesignStage from "@/components/practice/stages/DesignStage";
import RunStage from "@/components/practice/stages/RunStage";
import type { PracticeDesignState, Requirements } from "@/lib/practice/types";
import BottomSheet from "@/app/components/BottomSheet";
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
};

export function SandboxStep({ mobilePaletteOpen, onMobilePaletteChange }: SandboxStepProps) {
  const {
    state,
    setDesign,
    setRun,
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
      <div className="space-y-6">
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
              Step 4 · High-level design
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white sm:text-2xl">
                Build the redirect path
              </h2>
              <p className="text-sm leading-relaxed text-zinc-300">
                Use the sandbox to wire Web → API → Service → Cache → DB. Drop in extras from the palette when features demand them.
              </p>
            </div>
          </div>
        </section>

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
        />

        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
                Simulation
              </h3>
              <p className="text-xs text-zinc-500">
                Run the load test as you iterate. Passing results will unlock the finish step.
              </p>
            </div>
          </div>
          <RunStage
            design={state.design}
            run={state.run}
            requirements={state.requirements}
            locked={isReadOnly}
            readOnly={isReadOnly}
            updateRun={setRun}
            onContinue={() => {}}
            showFooterControls={false}
          />
        </section>
      </div>

      <BottomSheet
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
                    id: `mobile-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
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
      </BottomSheet>
    </>
  );
}

export default SandboxStep;
