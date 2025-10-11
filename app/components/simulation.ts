import { Edge, NodeId, PlacedNode } from "./types";
import type { Scenario } from "@/lib/scenarios";
import { findNode } from "./utils";
import { evaluateScenario, calculateAcceptanceScore } from "@/lib/evaluate";
import { calculateScore } from "@/lib/scoring";

// Very simple simulation engine (single flow, bottleneck + latency sum)
export function simulate(
  scenario: Scenario,
  pathNodeIds: NodeId[],
  nodes: PlacedNode[],
  edges: Edge[],
  chaos: boolean,
  rng: () => number = Math.random
) {
  // Sum intrinsic latencies + link latencies along the path
  let latency = 0;
  let capacity = Infinity;
  let failedByChaos = false;

  for (let i = 0; i < pathNodeIds.length; i++) {
    const n = findNode(nodes, pathNodeIds[i]);
    if (!n) continue;
    // chaos failure
    if (chaos && rng() < n.spec.failureRate) {
      failedByChaos = true;
    }
    const replicas = Math.max(1, n.replicas ?? 1);
    const nodeCapacity = n.spec.capacityRps * replicas;

    latency += n.spec.baseLatencyMs;
    capacity = Math.min(capacity, nodeCapacity);

    // add link latency to next
    if (i < pathNodeIds.length - 1) {
      const from = pathNodeIds[i];
      const to = pathNodeIds[i + 1];
      const link = edges.find((e) => e.from === from && e.to === to);
      latency += link ? link.linkLatencyMs : 12; // default WAN-ish hop if not explicitly wired
    }
  }

  const meetsRps = scenario.requiredRps <= capacity;
  const meetsLatency = latency <= scenario.latencyBudgetMsP95;

  // very rough backlog growth if over capacity
  const backlogGrowthRps = Math.max(0, scenario.requiredRps - (isFinite(capacity) ? capacity : 0));

  // Evaluate acceptance criteria
  const acceptanceResults = evaluateScenario(scenario, pathNodeIds, nodes, edges);
  const acceptanceScore = calculateAcceptanceScore(scenario, acceptanceResults);

  // Calculate overall score
  const scoreBreakdown = calculateScore(
    scenario,
    {
      meetsRps,
      meetsLatency,
      failedByChaos,
      acceptanceScore,
    },
    nodes
  );

  return {
    latencyMsP95: Math.round(latency),
    capacityRps: isFinite(capacity) ? Math.round(capacity) : 0,
    meetsRps,
    meetsLatency,
    backlogGrowthRps,
    failedByChaos,
    acceptanceResults,
    acceptanceScore,
    scoreBreakdown,
  };
}
