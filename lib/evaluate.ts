import type { Scenario } from "@/lib/scenarios";
import type { PlacedNode, Edge } from "@/lib/types/domain";

// Evaluates scenario acceptance criteria based on the current design
export function evaluateScenario(
  scenario: Scenario,
  pathIds: string[],
  nodes: PlacedNode[],
  edges: Edge[]
) {
  // Pre-build lookup maps for O(1) access
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edgeSet = new Set(edges.flatMap((e) => [`${e.from}->${e.to}`, `${e.to}->${e.from}`]));

  // Build text representation of the path for pattern matching
  const textPath = pathIds.map((id) => nodeMap.get(id)?.spec.kind || id).join(">");

  const results: Record<string, boolean> = {};

  const edgeConnects = (a: string, b: string) =>
    edgeSet.has(`${a}->${b}`) || edgeSet.has(`${b}->${a}`);

  // Evaluate each acceptance criterion
  for (const criterion of scenario.acceptance ?? []) {
    switch (criterion.id) {
      case "cdn-before-s3":
        results[criterion.id] = /CDN.*Object Store \(S3\)/.test(textPath);
        break;
      case "db-not-media-hotpath":
        // DB should not come after Object Store in streaming path
        results[criterion.id] = !/Object Store \(S3\)>.*DB \(Postgres\)/.test(textPath);
        break;
      case "cache-on-read":
        results[criterion.id] =
          textPath.includes("Cache (Redis)") || textPath.includes("Object Cache (Memcached)");
        break;
      case "cache-present":
        results[criterion.id] =
          textPath.includes("Cache (Redis)") || textPath.includes("Object Cache (Memcached)");
        break;
      case "lb-service":
        results[criterion.id] =
          textPath.includes("Load Balancer") || textPath.includes("API Gateway");
        break;
      case "limiter-on-path":
        // Rate limiter should appear before service in the path
        results[criterion.id] =
          /Rate Limiter>.*Service/.test(textPath) || textPath.includes("Rate Limiter");
        break;
      case "cdn-before-origin":
        results[criterion.id] = /CDN.*Object Store \(S3\)/.test(textPath);
        break;
      case "origin-shield":
        results[criterion.id] = textPath.includes("Origin Shield (CDN Proxy)");
        break;
      case "cdn-on-static":
        results[criterion.id] = textPath.includes("CDN");
        break;
      case "redis-zset":
        results[criterion.id] = textPath.includes("Cache (Redis)");
        break;
      case "analytics": {
        const serviceIds = nodes.filter((n) => n.spec.kind === "Service").map((n) => n.id);
        const queueIds = nodes
          .filter((n) => n.spec.kind === "Message Queue (Kafka Topic)")
          .map((n) => n.id);
        const workerIds = nodes.filter((n) => n.spec.kind === "Worker Pool").map((n) => n.id);

        if (serviceIds.length === 0 || queueIds.length === 0 || workerIds.length === 0) {
          results[criterion.id] = false;
          break;
        }

        const serviceToQueue = serviceIds.some((serviceId) =>
          queueIds.some((queueId) => edgeConnects(serviceId, queueId))
        );
        const queueToWorker = queueIds.some((queueId) =>
          workerIds.some((workerId) => edgeConnects(queueId, workerId))
        );

        results[criterion.id] = serviceToQueue && queueToWorker;
        break;
      }
      case "dlq":
        // Look for message queue + worker pool pattern
        results[criterion.id] =
          textPath.includes("Message Queue") && textPath.includes("Worker Pool");
        break;
      case "search-index":
        results[criterion.id] = textPath.includes("Search Index (Elastic)");
        break;
      case "fanout":
        results[criterion.id] =
          textPath.includes("Message Queue") || textPath.includes("Stream Processor");
        break;
      case "cache-writeback":
        results[criterion.id] = textPath.includes("Cache (Redis)");
        break;
      case "dedupe":
        results[criterion.id] =
          textPath.includes("ID Generator") || textPath.includes("Shard Router");
        break;
      default:
        // Default to false for unknown criteria
        results[criterion.id] = false;
    }
  }

  return results;
}

// Calculate score based on acceptance criteria results
export function calculateAcceptanceScore(
  scenario: Scenario,
  results: Record<string, boolean>
): number {
  if (!scenario.acceptance || scenario.acceptance.length === 0) {
    return 100; // Full score if no criteria
  }

  // const totalCriteria = scenario.acceptance.length; // Not used currently
  const requiredCriteria = scenario.acceptance.filter((c) => c.required);
  const optionalCriteria = scenario.acceptance.filter((c) => !c.required);

  // Required criteria must pass
  const requiredPassed = requiredCriteria.filter((c) => results[c.id]).length;
  const requiredTotal = requiredCriteria.length;

  // Optional criteria add bonus points
  const optionalPassed = optionalCriteria.filter((c) => results[c.id]).length;
  const optionalTotal = optionalCriteria.length;

  // Base score from required criteria (80% weight)
  const requiredScore = requiredTotal > 0 ? (requiredPassed / requiredTotal) * 80 : 80;

  // Bonus from optional criteria (20% weight)
  const optionalScore = optionalTotal > 0 ? (optionalPassed / optionalTotal) * 20 : 20;

  return Math.round(requiredScore + optionalScore);
}
