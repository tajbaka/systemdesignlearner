import type { Scenario } from "@/lib/scenarios";
import type { PlacedNode } from "@/app/components/types";

export interface ScoreBreakdown {
  sloScore: number;
  checklistScore: number;
  costScore: number;
  totalScore: number;
  outcome: "pass" | "partial" | "fail" | "chaos_fail";
  hints?: string[];
}

export function calculateScore(
  scenario: Scenario,
  simulationResult: {
    meetsRps: boolean;
    meetsLatency: boolean;
    failedByChaos: boolean;
    acceptanceScore: number;
  },
  nodes: PlacedNode[]
): ScoreBreakdown {
  // If chaos failure, return chaos_fail immediately
  if (simulationResult.failedByChaos) {
    return {
      sloScore: 0,
      checklistScore: 0,
      costScore: 0,
      totalScore: 0,
      outcome: "chaos_fail",
    };
  }

  // SLO Score (60 points max)
  // 30 points for latency pass + 30 points for RPS pass
  const latencyPoints = simulationResult.meetsLatency ? 30 : 0;
  const rpsPoints = simulationResult.meetsRps ? 30 : 0;
  const sloScore = latencyPoints + rpsPoints;

  // Checklist Score (30 points max)
  // Based on acceptance criteria
  const checklistScore = (simulationResult.acceptanceScore / 100) * 30;

  // Cost Efficiency Score (10 points max)
  const totalCost = nodes.reduce((sum, node) => {
    const replicas = node.replicas || 1;
    return sum + node.spec.costPerHour * replicas;
  }, 0);

  // Define cost efficiency thresholds based on scenario complexity
  const costCap = getCostCap(scenario);
  const costEfficiencyRatio = Math.min(1, costCap / Math.max(totalCost, 0.01));
  const costScore = costEfficiencyRatio * 10;

  // Total Score
  const totalScore = Math.round(sloScore + checklistScore + costScore);

  // Determine outcome
  let outcome: ScoreBreakdown["outcome"];
  const meetsAllSLOs = simulationResult.meetsLatency && simulationResult.meetsRps;
  const meetsAnySLO = simulationResult.meetsLatency || simulationResult.meetsRps;

  if (meetsAllSLOs && totalScore >= 80) {
    outcome = "pass";
  } else if (meetsAnySLO || totalScore >= 40) {
    outcome = "partial";
  } else {
    outcome = "fail";
  }

  return {
    sloScore: Math.round(sloScore),
    checklistScore: Math.round(checklistScore),
    costScore: Math.round(costScore),
    totalScore,
    outcome,
  };
}

function getCostCap(scenario: Scenario): number {
  // Rough cost caps based on scenario complexity and RPS requirements
  const baseMultiplier = scenario.requiredRps / 1000; // Base on throughput

  switch (scenario.difficulty) {
    case "easy":
      return Math.max(1.0, baseMultiplier * 0.5);
    case "medium":
      return Math.max(2.0, baseMultiplier * 0.8);
    case "hard":
      return Math.max(3.0, baseMultiplier * 1.2);
    default:
      return 2.0;
  }
}
