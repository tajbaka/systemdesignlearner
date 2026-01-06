import { Edge, NodeId, PlacedNode } from "./types";
import type { Scenario } from "@/lib/scenarios";
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
  // Pre-build lookup maps for O(1) access instead of O(n) per lookup
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edgeMap = new Map(edges.map((e) => [`${e.from}->${e.to}`, e]));

  // Sum intrinsic latencies + link latencies along the path
  let latency = 0;
  let capacity = Infinity;
  let failedByChaos = false;

  for (let i = 0; i < pathNodeIds.length; i++) {
    const n = nodeMap.get(pathNodeIds[i]);
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
      const link = edgeMap.get(`${from}->${to}`);
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
