"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SCENARIOS } from "@/lib/scenarios";
import { findScenarioPath } from "@/app/components/utils";
import { simulate } from "@/app/components/simulation";
import type { PracticeDesignState, PracticeRunState, Requirements, PracticeStepScores } from "@/lib/practice/types";
import type { PlacedNode } from "@/app/components/types";
import type { Scenario } from "@/lib/scenarios";
import { track } from "@/lib/analytics";
import { logger } from "@/lib/logger";
import {
  evaluateDesignOptimized,
  scoreSimulation,
  loadScoringConfig,
} from "@/lib/scoring/index";
import type { FeedbackResult } from "@/lib/scoring/types";

type UpdateRunFn = (updater: (prev: PracticeRunState) => PracticeRunState) => void;
type SetStepScoreFn = (step: keyof PracticeStepScores, result: FeedbackResult) => void;

type RunStageProps = {
  design: PracticeDesignState;
  run: PracticeRunState;
  requirements: Requirements;
  locked: boolean;
  readOnly?: boolean;
  updateRun: UpdateRunFn;
  setStepScore?: SetStepScoreFn;
  onContinue: () => void;
  onGoBack?: () => void;
  showFooterControls?: boolean;
  continueLabel?: string;
};

const URL_SHORTENER = SCENARIOS.find((scenario) => scenario.id === "url-shortener")!;

const outcomeBadge = (status: string | undefined) => {
  switch (status) {
    case "pass":
      return "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40";
    case "partial":
      return "bg-amber-500/20 text-amber-200 border border-amber-400/40";
    case "fail":
      return "bg-rose-500/20 text-rose-200 border border-rose-400/40";
    case "chaos_fail":
      return "bg-rose-500/30 text-rose-100 border border-rose-400/40";
    default:
      return "bg-zinc-800 text-zinc-300 border border-zinc-700";
  }
};

const deriveHints = (
  result: PracticeRunState["lastResult"] | undefined,
  requirements: Requirements,
  nodes: PlacedNode[],
  scenario: Scenario
) => {
  if (!result) return [];
  const hints: string[] = [];

  if (result.failedByChaos) {
    hints.push(
      "Chaos mode surfaced an instability. Add redundancy or disable chaos to validate baseline design."
    );
  }
  if (!result.meetsLatency) {
    hints.push(
      "Latency target missed. Ensure cache sits before Postgres and remove extra hops on the redirect path."
    );
  }
  if (!result.meetsRps) {
    const hasLoadBalancer = result.acceptanceResults?.["lb-service"];
    const totalServiceReplicas = nodes.find((n) => n.spec.kind === "Service")?.replicas || 1;
    const serviceCapacity =
      (nodes.find((n) => n.spec.kind === "Service")?.spec.capacityRps || 0) * totalServiceReplicas;
    const requiredRps = scenario.requiredRps;

    if (hasLoadBalancer && serviceCapacity >= requiredRps) {
      hints.push(
        "Throughput target missed. Check your component connections or increase other component replicas."
      );
    } else if (hasLoadBalancer) {
      hints.push("Throughput target missed. Increase service replicas to meet the load.");
    } else if (totalServiceReplicas > 1) {
      hints.push(
        "Throughput target missed. Add a load balancer or API gateway to distribute traffic."
      );
    } else {
      hints.push(
        "Throughput target missed. Increase service replicas or add a load balancer/API gateway."
      );
    }
  }
  if (result.acceptanceResults) {
    Object.entries(result.acceptanceResults).forEach(([id, ok]) => {
      if (ok) return;
      switch (id) {
        case "cache-present":
          hints.push("Cache missing from redirect path. Add Redis between Service and DB.");
          break;
        case "lb-service":
          hints.push(
            "Place a gateway or load balancer before the service to satisfy availability requirements."
          );
          break;
        case "analytics": {
          const message =
            scenario.acceptance?.find((item) => item.id === "analytics")?.text ??
            "Add async analytics processing with a queue and worker.";
          hints.push(message);
          break;
        }
        default:
          const acceptance = scenario.acceptance?.find((item) => item.id === id);
          if (acceptance) {
            hints.push(acceptance.text);
          } else {
            hints.push("Scenario acceptance criteria unmet. Revisit the guided steps.");
          }
      }
    });
  }
  if (requirements.functional["basic-analytics"]) {
    const hasQueue = result.acceptanceResults?.analytics ?? false;
    if (!hasQueue) {
      hints.push("Send analytics events to a queue so writes stay async.");
    }
  }
  return Array.from(new Set(hints));
};

export default function RunStage({
  design,
  run,
  requirements,
  locked,
  readOnly = false,
  updateRun,
  setStepScore,
  onContinue,
  onGoBack,
  showFooterControls = true,
  continueLabel = "Continue to Review",
}: RunStageProps) {
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const hints = useMemo(
    () => deriveHints(run.lastResult, requirements, design.nodes, URL_SHORTENER),
    [run.lastResult, requirements, design.nodes]
  );
  const outcome =
    run.lastResult?.scoreBreakdown?.outcome ??
    (run.lastResult?.failedByChaos ? "chaos_fail" : undefined);
  const canContinue = outcome === "pass";

  // Confetti celebration moved to ScoreShareStep (final score page)
  // Don't show confetti here during simulation

  const handleChaosToggle = useCallback(() => {
    if (locked || readOnly) return;
    updateRun((prev) => ({
      ...prev,
      chaosMode: !prev.chaosMode,
    }));
    track("practice_run_chaos_toggled", { slug: "url-shortener" });
  }, [locked, readOnly, updateRun]);

  const handleRun = useCallback(async () => {
    if (locked || readOnly || running) return;
    setRunning(true);
    setError(null);

    try {
      console.log("[RunStage] Running simulation");
      console.log("[RunStage] Nodes:", design.nodes.map(n => ({ id: n.id, kind: n.spec.kind })));
      console.log("[RunStage] Edges:", design.edges.map(e => ({ id: e.id, from: e.from, to: e.to })));

      const path = findScenarioPath(URL_SHORTENER, design.nodes, design.edges);
      console.log("[RunStage] Found path:", path);
      if (path.missingKinds.length > 0) {
        setError(`Add the missing components to run simulation: ${path.missingKinds.join(", ")}`);
        setRunning(false);
        return;
      }
      if (path.nodeIds.length === 0) {
        setError("No valid path found. Connect nodes from Web to DB before running.");
        setRunning(false);
        return;
      }

      // Evaluate design architecture (in background, non-blocking)
      if (setStepScore) {
        try {
          logger.info("Starting design evaluation...");
          const config = await loadScoringConfig("url-shortener");

          // Evaluate design with AI
          const designScore = await evaluateDesignOptimized(
            {
              nodes: design.nodes,
              edges: design.edges,
              functionalRequirements: requirements.functional,
              nfrValues: {
                readRps: requirements.nonFunctional.readRps,
                writeRps: requirements.nonFunctional.writeRps,
                p95RedirectMs: requirements.nonFunctional.p95RedirectMs,
                availability: requirements.nonFunctional.availability,
              },
            },
            config.steps.design,
            {
              useAI: true,
              explainScore: false, // Skip explanation for faster evaluation
            }
          );

          logger.info("Design evaluation complete, score:", designScore.score, "/", designScore.maxScore);
          setStepScore("design", designScore);
        } catch (err) {
          logger.error("Design scoring failed", err);
          // Set a default score so it's not undefined
          setStepScore("design", {
            score: 0,
            maxScore: 30,
            percentage: 0,
            blocking: [],
            warnings: [{
              category: "architecture",
              severity: "warning",
              message: "Design evaluation encountered an error. Your design may not have been fully scored.",
            }],
            positive: [],
            suggestions: [],
          });
        }
      }

      const result = simulate(
        URL_SHORTENER,
        path.nodeIds,
        design.nodes,
        design.edges,
        run.chaosMode,
        Math.random
      );

      // Convert simulation result to FeedbackResult and save
      if (setStepScore) {
        try {
          const config = await loadScoringConfig("url-shortener");

          const simulationScore = scoreSimulation(
            {
              meetsRps: result.meetsRps,
              meetsLatency: result.meetsLatency,
              failedByChaos: result.failedByChaos,
              actualRps: result.capacityRps,
              targetRps: URL_SHORTENER.requiredRps,
              actualLatency: result.latencyMsP95,
              targetLatency: URL_SHORTENER.latencyBudgetMsP95,
            },
            config
          );

          setStepScore("simulation", simulationScore);
        } catch (err) {
          logger.error("Simulation scoring failed", err);
        }
      }

      updateRun((prev) => {
        const attempts = prev.attempts + 1;
        const pass = result.scoreBreakdown?.outcome === "pass";
        const firstPassAt = pass && !prev.firstPassAt ? Date.now() : prev.firstPassAt;

        return {
          ...prev,
          attempts,
          lastResult: {
            ...result,
            completedAt: Date.now(),
          },
          firstPassAt,
        };
      });

      track("practice_run_completed", {
        slug: "url-shortener",
        attempts: run.attempts + 1,
        outcome:
          result.scoreBreakdown?.outcome ?? (result.failedByChaos ? "chaos_fail" : "unknown"),
        chaos: run.chaosMode,
        latency: result.latencyMsP95,
        capacity: result.capacityRps,
      });

      if (result.scoreBreakdown?.outcome === "pass" && !run.firstPassAt) {
        const attemptCount = run.attempts + 1;
        track("practice_run_first_pass", { slug: "url-shortener", attempts: attemptCount });
        track("practice_pass_first", { scenario: "url-shortener", attempts: attemptCount });
      }
    } catch (err) {
      logger.error("Simulation error", err);
      setError("Simulation failed. Adjust your graph and try again.");
    } finally {
      setRunning(false);
    }
  }, [
    design.edges,
    design.nodes,
    locked,
    readOnly,
    run.attempts,
    run.chaosMode,
    run.firstPassAt,
    running,
    updateRun,
    setStepScore,
    requirements.functional,
    requirements.nonFunctional.readRps,
    requirements.nonFunctional.writeRps,
    requirements.nonFunctional.p95RedirectMs,
    requirements.nonFunctional.availability,
  ]);

  // Expose handleRun globally so PracticeFlow can trigger it
  useEffect(() => {
    window._runSimulation = handleRun;
    return () => {
      delete window._runSimulation;
    };
  }, [handleRun]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">Run</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            We’ll simulate 5k RPS redirects against your current graph. Adjust between runs until
            latency and throughput targets pass.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-zinc-300">
            <span className="rounded-full border border-zinc-700 px-3 py-1">
              Attempts: {run.attempts}
            </span>
            {run.lastResult ? (
              <span className={`rounded-full px-3 py-1 ${outcomeBadge(outcome)}`}>
                Outcome: {outcome?.toUpperCase() ?? "—"}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-200">
            <input
              type="checkbox"
              checked={run.chaosMode}
              disabled={locked || readOnly}
              onChange={handleChaosToggle}
              className="h-4 w-4 rounded border-zinc-600 text-red-500 focus:ring-red-400"
            />
            Chaos mode
          </label>
          <span className="text-[11px] text-zinc-500">
            Chaos injects random failures to test resilience.
          </span>
        </div>
      </header>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Simulator</h3>
            <p className="text-sm text-zinc-400">
              Ensure the path includes Web → API Gateway → Service → Cache → DB to meet the rubric.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRun}
            disabled={locked || readOnly || running}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:bg-zinc-700"
          >
            {running ? (
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
                Running…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Run Simulation
              </>
            )}
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-500/15 p-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {run.lastResult ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4">
              <h4 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide">SLOs</h4>
              <dl className="mt-3 space-y-2 text-sm text-zinc-300">
                <div className="flex items-center justify-between">
                  <dt>P95 latency</dt>
                  <dd
                    className={run.lastResult.meetsLatency ? "text-emerald-300" : "text-rose-300"}
                  >
                    {run.lastResult.latencyMsP95} ms (target ≤ {URL_SHORTENER.latencyBudgetMsP95}
                     ms)
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Throughput capacity</dt>
                  <dd className={run.lastResult.meetsRps ? "text-emerald-300" : "text-rose-300"}>
                    {run.lastResult.capacityRps.toLocaleString()} rps (target ≥{" "}
                    {URL_SHORTENER.requiredRps.toLocaleString()} rps)
                  </dd>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <dt>Backlog growth</dt>
                  <dd>{run.lastResult.backlogGrowthRps.toLocaleString()} rps</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide">
                  Score
                </h4>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${outcomeBadge(outcome)}`}
                >
                  {outcome ? outcome.toUpperCase() : "PENDING"} ·{" "}
                  {run.lastResult.scoreBreakdown?.totalScore ?? 0}/100
                </span>
              </div>
              <dl className="text-sm text-zinc-300 space-y-2">
                <div className="flex items-center justify-between">
                  <dt>SLO alignment</dt>
                  <dd>{run.lastResult.scoreBreakdown?.sloScore ?? 0}/60</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Requirements</dt>
                  <dd>{run.lastResult.scoreBreakdown?.checklistScore ?? 0}/30</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Efficiency</dt>
                  <dd>{run.lastResult.scoreBreakdown?.costScore ?? 0}/10</dd>
                </div>
              </dl>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/40 p-6 text-sm text-zinc-400">
            No runs yet. Hit “Run simulation” to see latency, throughput, and rubric feedback.
          </div>
        )}

        {hints.length > 0 ? (
          <div className="mt-6 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            <h4 className="font-semibold uppercase tracking-wide text-xs text-amber-200">
              Try next
            </h4>
            <ul className="mt-2 space-y-2 leading-relaxed">
              {hints.map((hint) => (
                <li key={hint} className="flex items-start gap-2">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-300" />
                  <span>{hint}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {showFooterControls ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          {onGoBack ? (
            <button
              type="button"
              onClick={() => {
                track("practice_run_goback_clicked", { slug: "url-shortener", outcome });
                onGoBack();
              }}
              disabled={locked || readOnly}
              className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 px-6 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              ← Go Back to Design
            </button>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                track("practice_run_continue_clicked", { slug: "url-shortener", outcome });
                onContinue();
              }}
              disabled={!canContinue || locked || readOnly}
              className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-500 px-6 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-300"
            >
              {continueLabel}
            </button>
            {!canContinue ? (
              <span className="text-xs text-zinc-500">
                Get a passing run to unlock the review step. Use the hints above to iterate.
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
