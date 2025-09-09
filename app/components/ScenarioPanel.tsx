"use client";
import React from "react";
import { Scenario } from "./types";
import { buttonBase } from "./styles";

export interface ScenarioPanelProps {
  scenarios: Scenario[];
  selectedScenarioId: string;
  onScenarioChange: (scenarioId: string) => void;
  chaosMode: boolean;
  onChaosModeChange: (chaosMode: boolean) => void;
  onRunSimulation: () => void;
  simulationResult: {
    latencyMsP95: number;
    capacityRps: number;
    meetsRps: boolean;
    meetsLatency: boolean;
    backlogGrowthRps: number;
    failedByChaos: boolean;
  } | null;
  failAttempts: number;
}

export default function ScenarioPanel({
  scenarios,
  selectedScenarioId,
  onScenarioChange,
  chaosMode,
  onChaosModeChange,
  onRunSimulation,
  simulationResult,
  failAttempts,
}: ScenarioPanelProps) {
  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId)!;
  const outcome: "pass" | "partial" | "fail" | "chaos_fail" | null = (() => {
    if (!simulationResult) return null;
    if (simulationResult.failedByChaos) return "chaos_fail";
    const both = simulationResult.meetsLatency && simulationResult.meetsRps;
    if (both) return "pass";
    const any = simulationResult.meetsLatency || simulationResult.meetsRps;
    return any ? "partial" : "fail";
  })();

  const hints = selectedScenario.hints ?? [];
  const hintsToShow = Math.min(failAttempts, hints.length);

  return (
    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col gap-2 text-zinc-300">
      <h2 className="text-lg text-zinc-300">Scenario</h2>
      <select
        value={selectedScenarioId}
        onChange={(e) => onScenarioChange(e.target.value)}
        className="bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-zinc-300"
      >
        {scenarios.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
      </select>
      <p className="text-xs text-zinc-400 leading-relaxed">{selectedScenario.description}</p>

      <div className="flex items-center gap-2 mt-2">
        <label className="text-xs text-zinc-300 flex items-center gap-2">
          <input
            type="checkbox"
            checked={chaosMode}
            onChange={(e) => onChaosModeChange(e.target.checked)}
          />
          Chaos mode
        </label>
        <button className={`${buttonBase} text-zinc-300`} onClick={onRunSimulation}>
          Run ▶
        </button>
      </div>

      {simulationResult && (
        <div className="mt-3 text-sm rounded-xl p-3 border border-white/10 bg-white/5">
          <div className="flex flex-wrap gap-3 items-center">
            {outcome && (
              <span
                className={
                  `px-2 py-0.5 rounded-md text-[11px] font-semibold ` +
                  (outcome === "pass"
                    ? "bg-emerald-400/15 text-emerald-300 border border-emerald-300/30"
                    : outcome === "partial"
                    ? "bg-amber-400/10 text-amber-300 border border-amber-300/30"
                    : outcome === "fail"
                    ? "bg-rose-400/10 text-rose-300 border border-rose-300/30"
                    : "bg-red-500/15 text-red-300 border border-red-300/30")
                }
              >
                {outcome === "pass" && "pass"}
                {outcome === "partial" && "partial"}
                {outcome === "fail" && "fail"}
                {outcome === "chaos_fail" && "chaos_fail"}
              </span>
            )}
            <span>
              Latency P95: <b>{simulationResult.latencyMsP95}ms</b> / {selectedScenario.latencyBudgetMsP95}ms
            </span>
            <span>
              Capacity: <b>{simulationResult.capacityRps} rps</b> (need {selectedScenario.requiredRps} rps)
            </span>
          </div>
          {simulationResult.failedByChaos && (
            <div className="mt-2 text-red-400">❌ Chaos failure: a component crashed.</div>
          )}
          {!simulationResult.meetsRps && (
            <div className="text-xs text-zinc-400 mt-2">
              Bottleneck suspected. Try adding a cache, sharding, or another service replica. Backlog growth ~{" "}
              {simulationResult.backlogGrowthRps} rps.
            </div>
          )}
        </div>
      )}

      {hintsToShow > 0 && (
        <div className="mt-2 text-xs rounded-xl p-3 border border-amber-300/20 bg-amber-400/5 text-amber-200">
          <div className="font-semibold text-amber-200/90 mb-1">Hints</div>
          <ul className="list-disc ml-5 space-y-1">
            {hints.slice(0, hintsToShow).map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
