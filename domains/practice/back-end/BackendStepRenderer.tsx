"use client";

import { usePractice } from "./context/PracticeContext";
import { useStepLoader } from "./hooks/useStepLoader";

export function BackendStepRenderer() {
  const { config, handlers, slug, stepType, loading } = usePractice();
  const { StepComponent, error } = useStepLoader({ step: stepType ?? "" });

  if (loading) {
    return null;
  }

  if (error || !StepComponent) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <div className="text-lg font-semibold text-red-400">Error</div>
          <div className="mt-2 text-sm text-zinc-400">
            {error?.message ?? "Step component not found"}
          </div>
        </div>
      </div>
    );
  }

  return <StepComponent slug={slug} config={config} stepType={stepType} handlers={handlers} />;
}
