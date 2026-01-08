import type { PracticeDesignState } from "./types";
import { hasConnectionBetweenKinds } from "@/components/canvas/utils";
import type { GuidanceLevel, GuidanceRule, GuidanceRuleCheck } from "@/lib/scoring/types";
import { getScoringConfigSync } from "@/lib/scoring";

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

/**
 * Evaluate the current design and return guidance for the next step.
 *
 * Uses declarative rules from scoring config JSON when available.
 * Note: The scoring config must be loaded (via loadScoringConfig) before calling this function.
 *
 * @param design - The current design state
 * @param slug - Optional scenario slug to load config from. Defaults to "url-shortener".
 */
export function evaluateDesignGuidance(
  design: PracticeDesignState,
  slug: string = "url-shortener"
): DesignGuidance | null {
  // Get scoring config from cache (must be preloaded)
  const config = getScoringConfigSync(slug);
  const rules = config?.steps?.design?.guidance?.rules;

  if (!rules || rules.length === 0) {
    // Debug logging to help diagnose the issue
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[evaluateDesignGuidance] No guidance rules found for ${slug}.`,
        `Config cached: ${!!config},`,
        `Has design step: ${!!config?.steps?.design},`,
        `Has guidance: ${!!config?.steps?.design?.guidance},`,
        `Rules count: ${rules?.length ?? 0}`
      );
    }
    return null;
  }

  return evaluateRulesFromReference(design, rules);
}
