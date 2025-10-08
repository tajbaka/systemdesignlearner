"use client";
import React from "react";
import type { Scenario } from "@/lib/scenarios";
import ScenarioTabs from "./ScenarioTabs";

export interface ScenarioPanelProps {
  scenarios: Scenario[];
  selectedScenarioId: string;
  onScenarioChange: (scenarioId: string) => void;
  chaosMode: boolean;
  onChaosModeChange: (chaosMode: boolean) => void;
  onRunSimulation: () => void;
  simulationError?: string | null;
  simulationResult: {
    latencyMsP95: number;
    capacityRps: number;
    meetsRps: boolean;
    meetsLatency: boolean;
    backlogGrowthRps: number;
    failedByChaos: boolean;
    acceptanceResults?: Record<string, boolean>;
    acceptanceScore?: number;
    scoreBreakdown?: {
      sloScore: number;
      checklistScore: number;
      costScore: number;
      totalScore: number;
      outcome: "pass" | "partial" | "fail" | "chaos_fail";
    };
  } | null;
  failAttempts: number;
  // Mobile props
  hideHeader?: boolean;
  simulationRunning?: boolean;
  onSimulationRunningChange?: (running: boolean) => void;
}

export default function ScenarioPanel({
  scenarios,
  selectedScenarioId,
  onScenarioChange,
  chaosMode,
  onChaosModeChange,
  onRunSimulation,
  simulationError,
  simulationResult,
  failAttempts,
  hideHeader = false,
  simulationRunning = false,
  onSimulationRunningChange,
}: ScenarioPanelProps) {
  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId)!;
  const outcome: "pass" | "partial" | "fail" | "chaos_fail" | null = (() => {
    if (!simulationResult) return null;
    if (simulationResult.scoreBreakdown) {
      return simulationResult.scoreBreakdown.outcome;
    }
    // Fallback to old logic if scoreBreakdown not available
    if (simulationResult.failedByChaos) return "chaos_fail";
    const both = simulationResult.meetsLatency && simulationResult.meetsRps;
    if (both) return "pass";
    const any = simulationResult.meetsLatency || simulationResult.meetsRps;
    return any ? "partial" : "fail";
  })();

  const hints = selectedScenario.hints ?? [];
  const hintsToShow = Math.min(failAttempts, hints.length);

  const runFeedbackTimeout = React.useRef<number | null>(null);

  const handleRun = React.useCallback(() => {
    if (simulationRunning) return;
    onSimulationRunningChange?.(true);
    onRunSimulation();
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(35);
    }
    if (runFeedbackTimeout.current) {
      window.clearTimeout(runFeedbackTimeout.current);
    }
    runFeedbackTimeout.current = window.setTimeout(() => {
      onSimulationRunningChange?.(false);
      runFeedbackTimeout.current = null;
    }, 700);
  }, [simulationRunning, onRunSimulation, onSimulationRunningChange]);

  React.useEffect(() => {
    if (!simulationRunning) return;
    return () => {
      if (runFeedbackTimeout.current) {
        window.clearTimeout(runFeedbackTimeout.current);
        runFeedbackTimeout.current = null;
      }
    };
  }, [simulationRunning]);

  React.useEffect(() => {
    if (!simulationResult) return;
    onSimulationRunningChange?.(false);
    if (runFeedbackTimeout.current) {
      window.clearTimeout(runFeedbackTimeout.current);
      runFeedbackTimeout.current = null;
    }
  }, [simulationResult, onSimulationRunningChange]);

  React.useEffect(() => {
    return () => {
      if (runFeedbackTimeout.current) {
        window.clearTimeout(runFeedbackTimeout.current);
        runFeedbackTimeout.current = null;
      }
    };
  }, []);

  const scoreBadge = React.useMemo(() => {
    if (!simulationResult) return null;

    if (simulationResult.scoreBreakdown) {
      const total = simulationResult.scoreBreakdown.totalScore;
      return (
        <span className="md:hidden inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-200">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l6.16 3.205-1.18 6.878L12 15.771l-5-2.688-1.18-6.878z" />
          </svg>
          {total}/100
        </span>
      );
    }

    if (!outcome) return null;

    const baseClasses = "md:hidden inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold";
    switch (outcome) {
      case "pass":
        return <span className={`${baseClasses} border border-emerald-400/40 bg-emerald-500/20 text-emerald-200`}>PASS</span>;
      case "partial":
        return <span className={`${baseClasses} border border-amber-400/40 bg-amber-500/15 text-amber-200`}>PARTIAL</span>;
      case "fail":
        return <span className={`${baseClasses} border border-rose-400/40 bg-rose-500/15 text-rose-200`}>FAIL</span>;
      case "chaos_fail":
        return <span className={`${baseClasses} border border-rose-400/40 bg-rose-500/20 text-rose-100`}>CHAOS</span>;
      default:
        return null;
    }
  }, [simulationResult, outcome]);

  const runButtonClasses = React.useMemo(() => (
    `px-3 py-1.5 rounded-lg border border-emerald-400/40 flex items-center gap-1.5 text-sm font-medium touch-manipulation transition ` +
    (simulationRunning
      ? `bg-emerald-500/30 text-emerald-100 cursor-wait animate-pulse`
      : `bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 cursor-pointer`)
  ), [simulationRunning]);

  return (
    <div className="flex min-h-0 h-full flex-1 flex-col overflow-hidden text-zinc-300">
      {!hideHeader && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-zinc-100">Simulation</h2>
            {scoreBadge}
          </div>
          <button
            type="button"
            className={runButtonClasses}
            onClick={handleRun}
            disabled={simulationRunning}
            aria-live="polite"
          >
            {simulationRunning ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" role="presentation">
                  <circle
                    className="opacity-30"
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                  />
                  <path
                    className="opacity-90"
                    fill="currentColor"
                    d="M12 3a9 9 0 00-9 9h2a7 7 0 017-7V3z"
                  />
                </svg>
                <span>Running…</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Run
              </>
            )}
          </button>
        </div>
      )}

      <div className={`flex min-h-0 flex-1 flex-col ${hideHeader ? "" : "mt-2"}`}>
        <div
          className="flex-1 overflow-y-auto pr-1 min-h-0 h-full scrollbar-hide"
          onWheel={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-2 pb-28 sm:pb-16 lg:pb-12">
            <select
              value={selectedScenarioId}
              onChange={(e) => onScenarioChange(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-800/80 px-3 py-2.5 text-sm text-zinc-200 cursor-pointer transition-all duration-200 hover:bg-zinc-700/50 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50"
            >
              {scenarios.map((s) => (
                <option
                  key={s.id}
                  value={s.id}
                  className="bg-zinc-800 text-zinc-200 py-1"
                >
                  {s.title} [{s.category}] [{s.difficulty}]
                </option>
              ))}
            </select>
            <p className="text-xs leading-relaxed text-zinc-400">{selectedScenario.description}</p>

            {simulationError && (
              <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-rose-400 text-lg">⚠️</span>
                  <div className="flex-1">
                    <div className="font-semibold text-rose-300 mb-1">Simulation Error</div>
                    <p className="text-rose-200 leading-relaxed">{simulationError}</p>
                  </div>
                </div>
              </div>
            )}

            <ScenarioTabs scenario={selectedScenario} />

            <div className="mt-1 flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={chaosMode}
                  onChange={(e) => onChaosModeChange(e.target.checked)}
                  className="h-4 w-4 cursor-pointer"
                />
                Chaos mode
              </label>
            </div>

            {simulationResult && (
              <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  {outcome && (
                    <span
                      className={
                        `rounded-md px-2 py-0.5 text-[11px] font-semibold ` +
                        (outcome === "pass"
                          ? "border border-emerald-300/30 bg-emerald-400/15 text-emerald-300"
                          : outcome === "partial"
                          ? "border border-amber-300/30 bg-amber-400/10 text-amber-300"
                          : outcome === "fail"
                          ? "border border-rose-300/30 bg-rose-400/10 text-rose-300"
                          : "border border-red-300/30 bg-red-500/15 text-red-300")
                      }
                    >
                      {outcome === "pass" && "PASS"}
                      {outcome === "partial" && "PARTIAL"}
                      {outcome === "fail" && "FAIL"}
                      {outcome === "chaos_fail" && "CHAOS FAIL"}
                    </span>
                  )}
                  {simulationResult.scoreBreakdown && (
                    <span className="font-bold text-zinc-200">
                      Score: {simulationResult.scoreBreakdown.totalScore}/100
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span>
                    Latency P95: <b>{simulationResult.latencyMsP95}ms</b> / {selectedScenario.latencyBudgetMsP95}ms
                  </span>
                  <span>
                    Capacity: <b>{simulationResult.capacityRps} rps</b> / {selectedScenario.requiredRps} rps
                  </span>
                </div>

                {simulationResult.scoreBreakdown && (
                  <div className="space-y-1 text-xs">
                    <div className="font-semibold text-zinc-300">Score Breakdown:</div>
                    <div className="grid grid-cols-3 gap-2">
                      <span>SLO: {simulationResult.scoreBreakdown.sloScore}/60</span>
                      <span>Checklist: {simulationResult.scoreBreakdown.checklistScore}/30</span>
                      <span>Cost: {simulationResult.scoreBreakdown.costScore}/10</span>
                    </div>
                  </div>
                )}

                {simulationResult.acceptanceResults && selectedScenario.acceptance && (
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-zinc-300">Acceptance Criteria:</div>
                    <div className="space-y-1">
                      {selectedScenario.acceptance.map((criterion) => {
                        const passed = simulationResult.acceptanceResults![criterion.id];
                        return (
                          <div
                            key={criterion.id}
                            className={`flex items-center gap-2 text-xs ${
                              passed ? "text-emerald-300" : "text-rose-300"
                            }`}
                          >
                            <span>{passed ? "✅" : "❌"}</span>
                            <span>{criterion.text}</span>
                            {criterion.required && (
                              <span className="text-[10px] text-zinc-400">(required)</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {simulationResult.failedByChaos && (
                  <div className="text-xs text-red-400">❌ Chaos failure: a component crashed.</div>
                )}
                {!simulationResult.meetsRps && (
                  <div className="text-xs text-zinc-400">
                    Bottleneck suspected. Try adding a cache, sharding, or another service replica. Backlog growth ~{" "}
                    {simulationResult.backlogGrowthRps} rps.
                  </div>
                )}
              </div>
            )}

            {hintsToShow > 0 && (
              <div className="mt-2 rounded-xl border border-amber-300/20 bg-amber-400/5 p-3 text-xs text-amber-200">
                <div className="mb-1 font-semibold text-amber-200/90">Hints</div>
                <ul className="ml-5 list-disc space-y-1">
                  {hints.slice(0, hintsToShow).map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
