"use client";

import type { ProblemConfig } from "./types";
import type { ProblemResponse, ProblemStepWithUserStep } from "@/app/api/v2/practice/schemas";
import { useActionHandler } from "./hooks/useActionHandler";
import { useStepLoader } from "./hooks/useStepLoader";
import { useTransformData } from "./hooks/useTransformData";
import { useLoadUserData } from "./hooks/useLoadUserData";
import useStepStore from "./store/useStore";
import { SLUGS_TO_STEPS } from "./constants";

type RawProblemData = {
  problem: ProblemResponse;
  steps: ProblemStepWithUserStep[];
};

type PracticeBackendProps = {
  slug: string;
  step: string;
  data: RawProblemData;
  children?: (
    config: ProblemConfig | null,
    loading: boolean,
    error: Error | null
  ) => React.ReactNode;
};

export default function PracticeBackend({ slug, step, data, children }: PracticeBackendProps) {
  const { loading: stepStateLoading } = useStepStore(slug);
  const stepType = SLUGS_TO_STEPS[step as keyof typeof SLUGS_TO_STEPS] || step;
  const { StepComponent, error } = useStepLoader({ step: stepType });

  // Load user's saved data from database into store
  useLoadUserData(slug, data.steps);

  // Transform raw data to ProblemConfig
  const config = useTransformData(data);

  const handlers = useActionHandler(slug);

  // Loading is true if step state is still loading (from localStorage or database)
  const loading = stepStateLoading;

  // If config transformation failed, show error
  if (!config) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <div className="text-lg font-semibold text-red-400">Error</div>
          <div className="mt-2 text-sm text-zinc-400">Failed to load problem configuration</div>
        </div>
      </div>
    );
  }

  // If children is a render prop function, call it with problem config state
  if (typeof children === "function") {
    return <>{children(config, loading, error)}</>;
  }

  // Render loading state
  if (loading) {
    return null;
  }

  // Render error state
  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <div className="text-lg font-semibold text-red-400">Error</div>
          <div className="mt-2 text-sm text-zinc-400">{error.message}</div>
        </div>
      </div>
    );
  }

  // Render step component with config and handlers
  if (StepComponent && config) {
    return <StepComponent slug={slug} config={config} stepType={stepType} handlers={handlers} />;
  }

  // Fallback if no component or config
  return null;
}
