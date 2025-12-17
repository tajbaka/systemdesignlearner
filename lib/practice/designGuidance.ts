import type { PracticeDesignState } from "./types";
import type { ComponentKind } from "@/app/components/types";
import { hasConnectionBetweenKinds } from "@/app/components/utils";
import type {
  GuidanceLevel,
  GuidanceRule,
  GuidanceRuleCheck,
} from "./reference/schema";
import { getScenarioReferenceSync } from "./loader";

export type DesignGuidance = {
  id: string;
  level: GuidanceLevel;
  summary: string;
  question: string;
};

// ============================================================================
// Helper functions for evaluating design state
// ============================================================================

const matchesKind = (nodeKind: string, targetKind: string): boolean => {
  if (nodeKind === targetKind) return true;
  const baseTarget = targetKind.split(" ")[0];
  const baseNode = nodeKind.split(" ")[0];
  return baseTarget === baseNode;
};

const hasKind = (design: PracticeDesignState, kind: string, minCount: number = 1): boolean => {
  const count = design.nodes.filter((node) => matchesKind(node.spec.kind, kind)).length;
  return count >= minCount;
};

const hasConnection = (design: PracticeDesignState, from: string, to: string): boolean =>
  hasConnectionBetweenKinds(design.nodes, design.edges, from, to);

const nodeConnectedToKind = (
  design: PracticeDesignState,
  nodeId: string,
  kind: string
): boolean => {
  const targetIds = design.nodes
    .filter((node) => matchesKind(node.spec.kind, kind))
    .map((node) => node.id);
  if (targetIds.length === 0) return false;
  return design.edges.some(
    (edge) =>
      (edge.from === nodeId && targetIds.includes(edge.to)) ||
      (edge.to === nodeId && targetIds.includes(edge.from))
  );
};

/**
 * Check if any node of `kind` is connected to `connectedTo` but NOT to `missingConnection`.
 * Returns true if NO such node exists (i.e., the check passes).
 */
const kindConnectedToFirstMissingSecond = (
  design: PracticeDesignState,
  kind: string,
  connectedTo: string,
  missingConnection: string
): boolean => {
  const kindNodes = design.nodes.filter((node) => matchesKind(node.spec.kind, kind));

  // Check if any node is connected to first but missing second
  const hasMissingConnection = kindNodes.some(
    (node) =>
      nodeConnectedToKind(design, node.id, connectedTo) &&
      !nodeConnectedToKind(design, node.id, missingConnection)
  );

  // Return true if NO node has this problem (check passes)
  return !hasMissingConnection;
};

/**
 * Check if services have unique custom labels.
 */
const servicesHaveUniqueLabels = (design: PracticeDesignState, minServices: number): boolean => {
  const serviceNodes = design.nodes.filter((node) => node.spec.kind === "Service");

  if (serviceNodes.length < minServices) {
    return false;
  }

  // Check that all services have custom labels
  const allHaveLabels = serviceNodes.every(
    (node) => typeof node.customLabel === "string" && node.customLabel.trim().length > 0
  );

  if (!allHaveLabels) {
    return false;
  }

  // Check that labels are unique
  const uniqueLabels = new Set(serviceNodes.map((node) => node.customLabel!.trim()));
  return uniqueLabels.size >= minServices;
};

// ============================================================================
// Generic Rule Evaluator
// ============================================================================

/**
 * Evaluate a single rule check against the current design state.
 * Returns true if the check passes, false if it fails.
 */
function evaluateRuleCheck(design: PracticeDesignState, check: GuidanceRuleCheck): boolean {
  switch (check.type) {
    case "hasKind":
      return hasKind(design, check.kind, check.minCount ?? 1);

    case "hasConnection":
      return hasConnection(design, check.from, check.to);

    case "kindConnectedToFirstMissingSecond":
      return kindConnectedToFirstMissingSecond(
        design,
        check.kind,
        check.connectedTo,
        check.missingConnection
      );

    case "servicesHaveUniqueLabels":
      return servicesHaveUniqueLabels(design, check.minServices);

    default:
      // Unknown check type - assume it passes
      console.warn("[evaluateRuleCheck] Unknown check type:", (check as GuidanceRuleCheck).type);
      return true;
  }
}

/**
 * Evaluate design guidance using declarative rules from JSON.
 * Rules are evaluated in order; first failing rule triggers guidance.
 */
function evaluateRulesFromReference(
  design: PracticeDesignState,
  rules: GuidanceRule[]
): DesignGuidance | null {
  for (const rule of rules) {
    const passes = evaluateRuleCheck(design, rule.check);

    if (!passes) {
      return {
        id: rule.id,
        level: rule.level,
        question: rule.question,
        summary: rule.hint,
      };
    }
  }

  // All rules pass - no guidance needed
  return null;
}

// ============================================================================
// Legacy Fallback (for scenarios without JSON rules)
// ============================================================================

const DB_KIND: ComponentKind = "DB (Postgres)";
const CACHE_KIND: ComponentKind = "Cache (Redis)";

/**
 * Legacy fallback: hardcoded evaluation logic for when JSON rules aren't available.
 * This maintains backwards compatibility during migration.
 */
function evaluateLegacyGuidance(design: PracticeDesignState): DesignGuidance | null {
  if (!hasKind(design, "Web")) {
    return {
      id: "add-web",
      level: "core",
      question: "Where do requests originate from in the current diagram?",
      summary: "Start with a client/Web node so requests have an entry point.",
    };
  }

  if (!hasKind(design, "API Gateway")) {
    return {
      id: "add-api-gateway",
      level: "core",
      question:
        "What component sits between users and backend services to terminate HTTP, enforce auth, and route traffic?",
      summary: "Clients need an API Gateway to handle routing, auth, and rate limiting.",
    };
  }

  if (!hasConnection(design, "Web", "API Gateway")) {
    return {
      id: "connect-web-api",
      level: "core",
      question: "How does traffic flow from the Web client into the API Gateway at the moment?",
      summary:
        "Connect the Web client to the API Gateway so requests can actually reach your backend.",
    };
  }

  if (!hasKind(design, "Service")) {
    return {
      id: "add-service",
      level: "core",
      question:
        "After the API Gateway, which component should execute the URL creation and redirect logic?",
      summary: "A Service layer is required to handle URL creation and redirect logic.",
    };
  }

  if (!hasConnection(design, "API Gateway", "Service")) {
    return {
      id: "connect-api-service",
      level: "core",
      question: "How are requests moving from the API Gateway into the Service layer right now?",
      summary: "Wire the API Gateway to your Service so requests continue through the stack.",
    };
  }

  if (!hasKind(design, DB_KIND)) {
    return {
      id: "add-database",
      level: "core",
      question: "Where will the platform persist the short-to-long URL mappings for durability?",
      summary: "URL mappings need durable storage. Add a primary database (Postgres is fine).",
    };
  }

  if (!hasConnection(design, "Service", DB_KIND)) {
    return {
      id: "connect-service-db",
      level: "core",
      question:
        "How does the Service reach the database for reads and writes in the current layout?",
      summary: "Connect the Service to the database so it can store and fetch URL records.",
    };
  }

  // Core path satisfied; bonus guidance
  if (!hasKind(design, "Service", 2)) {
    return {
      id: "add-second-service",
      level: "bonus",
      question:
        "Right now one Service handles both shortening URLs and redirecting clicks. How could adding a separate redirect Service lighten the work on the write Service?",
      summary:
        "Split read-heavy redirects from write operations so you can scale each path independently.",
    };
  }

  if (!hasKind(design, CACHE_KIND)) {
    return {
      id: "add-cache",
      level: "bonus",
      question:
        "What in-memory cache would reduce database load for hot redirects while keeping latency low?",
      summary:
        "A Redis/Memcached layer offloads hot redirects from the database and keeps p95 < 100ms.",
    };
  }

  if (!hasConnection(design, "Service", CACHE_KIND)) {
    return {
      id: "connect-service-cache",
      level: "bonus",
      question:
        "If cache is present, how does the Service reach it before falling back to the database?",
      summary:
        "Remember to connect the Service to cache first and fall back to the database on a miss.",
    };
  }

  if (!kindConnectedToFirstMissingSecond(design, "Service", CACHE_KIND, DB_KIND)) {
    return {
      id: "cache-service-db",
      level: "bonus",
      question:
        "The Service feeding cache still needs a fallback—can it also reach the database when a slug is missing?",
      summary:
        "The Service that talks to cache also needs a direct path to the database for cache misses.",
    };
  }

  if (!servicesHaveUniqueLabels(design, 2)) {
    return {
      id: "rename-services",
      level: "bonus",
      question:
        "Can you rename the Services so it's obvious which one handles shortening and which one handles redirects?",
      summary:
        "Naming each Service after its role (e.g., Shorten vs Redirect) makes the diagram clearer.",
    };
  }

  return null;
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Evaluate the current design and return guidance for the next step.
 *
 * Uses declarative rules from JSON when available, falling back to
 * hardcoded logic for scenarios without JSON rules defined.
 *
 * @param design - The current design state
 * @param slug - Optional scenario slug to load reference from. Defaults to "url-shortener".
 */
export function evaluateDesignGuidance(
  design: PracticeDesignState,
  slug: string = "url-shortener"
): DesignGuidance | null {
  // Try to get reference from cache (should be preloaded)
  const reference = getScenarioReferenceSync(slug);
  const rules = reference?.design?.guidance?.rules;

  // Use declarative rules if available
  if (rules && rules.length > 0) {
    return evaluateRulesFromReference(design, rules);
  }

  // Fall back to legacy hardcoded logic
  return evaluateLegacyGuidance(design);
}
