"use client";

import type { ProgressStep } from "@/lib/scoring/ai/progress";

type EvaluationProgressProps = {
  steps: ProgressStep[];
  className?: string;
};

export function EvaluationProgress({ steps, className = "" }: EvaluationProgressProps) {
  const overallProgress = steps.length > 0
    ? Math.round(steps.reduce((sum, step) => sum + step.progress, 0) / steps.length)
    : 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Overall progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-zinc-300">Evaluating your solution...</span>
          <span className="text-zinc-400">{overallProgress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Individual steps */}
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-3">
            {/* Status icon */}
            <div className="flex-shrink-0">
              {step.status === "complete" ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
                  <svg className="h-3 w-3 text-emerald-400" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6l3 3 5-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              ) : step.status === "running" ? (
                <div className="flex h-5 w-5 items-center justify-center">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                </div>
              ) : step.status === "error" ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/20">
                  <svg className="h-3 w-3 text-rose-400" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M3 3l6 6M9 3l-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-zinc-700" />
              )}
            </div>

            {/* Step info */}
            <div className="flex-1 min-w-0">
              <div
                className={`text-xs font-medium ${
                  step.status === "complete"
                    ? "text-emerald-300"
                    : step.status === "running"
                      ? "text-blue-300"
                      : step.status === "error"
                        ? "text-rose-300"
                        : "text-zinc-500"
                }`}
              >
                {step.label}
              </div>
              {step.message && (
                <div className="mt-0.5 text-xs text-zinc-400 truncate">{step.message}</div>
              )}
            </div>

            {/* Progress percentage for running step */}
            {step.status === "running" && step.progress > 0 && (
              <div className="text-xs text-zinc-400">{step.progress}%</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default EvaluationProgress;
