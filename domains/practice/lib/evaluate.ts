import type { PlacedNode, Edge } from "@/domains/practice/types";

// Evaluates design architecture patterns (replaces scenario acceptance criteria)
// Returns a simple record indicating if basic patterns are met
export function evaluateDesignArchitecture(
  pathIds: string[],
  nodes: PlacedNode[],
  edges: Edge[]
): Record<string, boolean> {
  // Pre-build lookup maps for O(1) access
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edgeSet = new Set(edges.flatMap((e) => [`${e.from}->${e.to}`, `${e.to}->${e.from}`]));

  // Build text representation of the path for pattern matching
  const textPath = pathIds
    .map((id) => {
      const node = nodeMap.get(id);
      if (!node) return id;
      const match = node.id.match(/^node-([^-]+)-/);
      return match ? match[1] : id;
    })
    .join(">");

  const results: Record<string, boolean> = {};

  const edgeConnects = (a: string, b: string) =>
    edgeSet.has(`${a}->${b}`) || edgeSet.has(`${b}->${a}`);

  // Evaluate basic architecture patterns
  // These are simplified checks that don't rely on scenario acceptance criteria

  // Check for cache presence
  results["cache-present"] =
    textPath.includes("Cache (Redis)") || textPath.includes("Object Cache (Memcached)");

  // Check for load balancer or API gateway
  results["lb-service"] = textPath.includes("Load Balancer") || textPath.includes("API Gateway");

  // Check for analytics pattern (queue + workers)
  const serviceIds = nodes
    .filter((n) => {
      const match = n.id.match(/^node-([^-]+)-/);
      return match && match[1] === "Service";
    })
    .map((n) => n.id);
  const queueIds = nodes
    .filter((n) => {
      const match = n.id.match(/^node-([^-]+)-/);
      return match && match[1] === "Message Queue (Kafka Topic)";
    })
    .map((n) => n.id);
  const workerIds = nodes
    .filter((n) => {
      const match = n.id.match(/^node-([^-]+)-/);
      return match && match[1] === "Worker Pool";
    })
    .map((n) => n.id);

  if (serviceIds.length > 0 && queueIds.length > 0 && workerIds.length > 0) {
    const serviceToQueue = serviceIds.some((serviceId) =>
      queueIds.some((queueId) => edgeConnects(serviceId, queueId))
    );
    const queueToWorker = queueIds.some((queueId) =>
      workerIds.some((workerId) => edgeConnects(queueId, workerId))
    );
    results["analytics"] = serviceToQueue && queueToWorker;
  } else {
    results["analytics"] = false;
  }

  return results;
}

// Calculate score based on architecture pattern results
// Simplified version that doesn't rely on scenario acceptance criteria
export function calculateAcceptanceScore(results: Record<string, boolean>): number {
  // Simple scoring: count how many patterns are met
  const totalPatterns = Object.keys(results).length;
  if (totalPatterns === 0) {
    return 100; // Full score if no patterns to check
  }

  const passedPatterns = Object.values(results).filter(Boolean).length;
  return Math.round((passedPatterns / totalPatterns) * 100);
}
