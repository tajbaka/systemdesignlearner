"use client";
import React from "react";
import { Scenario } from "./types";
import { buttonBase } from "./styles";

interface ScenarioPanelProps {
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
}

export default function ScenarioPanel({
  scenarios,
  selectedScenarioId,
  onScenarioChange,
  chaosMode,
  onChaosModeChange,
  onRunSimulation,
  simulationResult,
}: ScenarioPanelProps) {
  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId)!;

  return (
    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col gap-2">
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
          <div className="flex flex-wrap gap-3">
            <span>
              Latency P95: <b>{simulationResult.latencyMsP95}ms</b> / {selectedScenario.latencyBudgetMsP95}ms
            </span>
            <span>
              Capacity: <b>{simulationResult.capacityRps} rps</b> (need {selectedScenario.requiredRps} rps)
            </span>
          </div>
          <div className="mt-2">
            {simulationResult.failedByChaos ? (
              <div className="text-red-400">❌ Chaos failure: a component crashed.</div>
            ) : (
              <div className="text-zinc-300">
                {simulationResult.meetsLatency && simulationResult.meetsRps ? "✅ SLOs met" : "⚠️ SLOs not met"}
              </div>
            )}
          </div>
          {!simulationResult.meetsRps && (
            <div className="text-xs text-zinc-400 mt-2">
              Bottleneck suspected. Try adding a cache, sharding, or another service replica. Backlog growth ~{" "}
              {simulationResult.backlogGrowthRps} rps.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
