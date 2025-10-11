import type { Scenario } from "@/lib/scenarios";
import type { PlacedNode } from "@/app/components/types";

// Evaluates scenario acceptance criteria based on the current design
export function evaluateScenario(
  scenario: Scenario,
  pathIds: string[],
  nodes: PlacedNode[]
) {
  // Build text representation of the path for pattern matching
  const textPath = pathIds.map(id => {
    const n = nodes.find(n => n.id === id);
    return n?.spec.kind || id;
  }).join(">");

  const results: Record<string, boolean> = {};

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
        results[criterion.id] = textPath.includes("Cache (Redis)") || textPath.includes("Object Cache (Memcached)");
        break;
      case "cache-present":
        results[criterion.id] = textPath.includes("Cache (Redis)") || textPath.includes("Object Cache (Memcached)");
        break;
      case "lb-service":
        results[criterion.id] = textPath.includes("Load Balancer") || textPath.includes("API Gateway");
        break;
      case "limiter-on-path":
        // Rate limiter should appear before service in the path
        results[criterion.id] = /Rate Limiter>.*Service/.test(textPath) || textPath.includes("Rate Limiter");
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
      case "analytics":
        // Look for message queue + worker pool pattern for async analytics
        results[criterion.id] = textPath.includes("Message Queue (Kafka Topic)") && textPath.includes("Worker Pool");
        break;
      case "dlq":
        // Look for message queue + worker pool pattern
        results[criterion.id] = textPath.includes("Message Queue") && textPath.includes("Worker Pool");
        break;
      case "search-index":
        results[criterion.id] = textPath.includes("Search Index (Elastic)");
        break;
      case "fanout":
        results[criterion.id] = textPath.includes("Message Queue") || textPath.includes("Stream Processor");
        break;
      case "cache-writeback":
        results[criterion.id] = textPath.includes("Cache (Redis)");
        break;
      case "dedupe":
        results[criterion.id] = textPath.includes("ID Generator") || textPath.includes("Shard Router");
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
  const requiredCriteria = scenario.acceptance.filter(c => c.required);
  const optionalCriteria = scenario.acceptance.filter(c => !c.required);

  // Required criteria must pass
  const requiredPassed = requiredCriteria.filter(c => results[c.id]).length;
  const requiredTotal = requiredCriteria.length;

  // Optional criteria add bonus points
  const optionalPassed = optionalCriteria.filter(c => results[c.id]).length;
  const optionalTotal = optionalCriteria.length;

  // Base score from required criteria (80% weight)
  const requiredScore = requiredTotal > 0 ? (requiredPassed / requiredTotal) * 80 : 80;
  
  // Bonus from optional criteria (20% weight)
  const optionalScore = optionalTotal > 0 ? (optionalPassed / optionalTotal) * 20 : 20;

  return Math.round(requiredScore + optionalScore);
}
