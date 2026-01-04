import { findScenarioPath } from "@/components/canvas/utils";
import { SCENARIOS, type Scenario } from "@/lib/scenarios";
import type { PracticeState, Requirements } from "./types";
import type { ScenarioReference } from "./reference/schema";
import { loadScenarioReference } from "./loader";

export type BriefContext = {
  scenario: Scenario;
  reference: ScenarioReference;
};

const formatFunctional = (
  requirements: Requirements | undefined,
  reference: ScenarioReference
): string[] => {
  if (!requirements) {
    return ["Functional requirements pending."];
  }

  const lines: string[] = [];
  if (requirements.functionalSummary.trim()) {
    lines.push(`Summary: ${requirements.functionalSummary.trim()}`);
    lines.push("");
  }

  // Use order and labels from reference JSON if available
  const order = reference.functional?.order ?? Object.keys(requirements.functional);
  const labels = reference.functional?.labels ?? {};

  lines.push(
    ...order
      .filter((key) => key in requirements.functional)
      .map(
        (key) => `- ${labels[key] ?? key}: ${requirements.functional[key] ? "Enabled" : "Deferred"}`
      )
  );
  return lines;
};

const formatNonFunctional = (requirements: Requirements | undefined): string[] => {
  if (!requirements?.nonFunctional) {
    return ["Non-functional constraints pending."];
  }
  const nf = requirements.nonFunctional;
  const lines = [
    `- Read throughput target: ${nf.readRps.toLocaleString()} rps`,
    `- Write throughput target: ${nf.writeRps.toLocaleString()} rps`,
    `- P95 redirect latency: ${nf.p95RedirectMs} ms`,
    `- Availability: ${nf.availability}%`,
  ];
  if (nf.rateLimitNotes.trim()) {
    lines.push(`- Rate limit notes: ${nf.rateLimitNotes.trim()}`);
  }
  if (nf.notes.trim()) {
    lines.push(`- Additional constraints: ${nf.notes.trim()}`);
  }
  return lines;
};

const formatDesign = (state: PracticeState, context: BriefContext): string[] => {
  const nodes = [...state.design.nodes].sort((a, b) => a.x - b.x);
  const lines: string[] = ["Components:"];
  if (nodes.length === 0) {
    lines.push("- (none)");
  } else {
    nodes.forEach((node) => {
      const name = node.customLabel?.trim() || node.spec.label || node.spec.kind;
      const replicas = node.replicas && node.replicas > 1 ? ` ×${node.replicas}` : "";
      lines.push(`- ${name}${replicas}`);
    });
  }

  lines.push("", "Connections:");
  if (state.design.edges.length === 0) {
    lines.push("- (none)");
  } else {
    state.design.edges.forEach((edge) => {
      const from = state.design.nodes.find((node) => node.id === edge.from);
      const to = state.design.nodes.find((node) => node.id === edge.to);
      const fromLabel = from?.customLabel?.trim() || from?.spec.label || edge.from;
      const toLabel = to?.customLabel?.trim() || to?.spec.label || edge.to;
      lines.push(`- ${fromLabel} → ${toLabel} (${edge.linkLatencyMs} ms link)`);
    });
  }

  const path = findScenarioPath(context.scenario, state.design.nodes, state.design.edges);
  if (path.nodeIds.length > 0) {
    const humanPath = path.nodeIds
      .map((id) => {
        const node = state.design.nodes.find((n) => n.id === id);
        return node?.customLabel?.trim() || node?.spec.label || node?.spec.kind || id;
      })
      .join(" → ");
    lines.push("", `Primary flow: ${humanPath}`);
  }

  if (path.missingKinds.length > 0) {
    lines.push("", `Missing required components for rubric: ${path.missingKinds.join(", ")}`);
  }

  return lines;
};

const buildRunHints = (
  result: PracticeState["run"]["lastResult"],
  requirements: Requirements
): string[] => {
  if (!result) return [];
  const hints: string[] = [];

  if (result.failedByChaos) {
    hints.push(
      "Chaos mode failed. Add redundancy (LB/API Gateway) or disable chaos to validate baseline latency."
    );
  }
  if (!result.meetsLatency) {
    hints.push("Latency target missed. Ensure Redis sits before Postgres and remove extra hops.");
  }
  if (!result.meetsRps) {
    hints.push(
      "Throughput target missed. Scale the service horizontally or front it with a load balancer."
    );
  }
  if (result.acceptanceResults) {
    Object.entries(result.acceptanceResults).forEach(([id, ok]) => {
      if (ok) return;
      switch (id) {
        case "cache-present":
          hints.push("Cache is missing from redirect path. Insert Redis between Service and DB.");
          break;
        case "lb-service":
          hints.push("Place a gateway or load balancer before the service for resiliency.");
          break;
        default:
          hints.push(`Acceptance criterion not met: ${id}`);
      }
    });
  }
  if (requirements.functional["basic-analytics"]) {
    const hasQueue = result.acceptanceResults?.analytics ?? false;
    if (!hasQueue) {
      hints.push("Route analytics events to a queue/worker so redirects stay async.");
    }
  }

  return Array.from(new Set(hints));
};

const formatSimulation = (state: PracticeState, context: BriefContext): string[] => {
  const result = state.run.lastResult;
  if (!result) {
    return ["Simulation not run yet. Complete the Run step to capture metrics."];
  }

  const lines = [
    `- Outcome: ${result.scoreBreakdown?.outcome ?? (result.failedByChaos ? "chaos_fail" : "pending")}`,
    `- P95 latency: ${result.latencyMsP95} ms (target ≤ ${context.scenario.latencyBudgetMsP95} ms)`,
    `- Capacity: ${result.capacityRps.toLocaleString()} rps (target ≥ ${context.scenario.requiredRps.toLocaleString()} rps)`,
    `- Backlog growth: ${result.backlogGrowthRps.toLocaleString()} rps`,
  ];

  if (result.scoreBreakdown) {
    lines.push(
      `- Score: ${result.scoreBreakdown.totalScore}/100 ` +
        `(SLO ${result.scoreBreakdown.sloScore}, Requirements ${result.scoreBreakdown.checklistScore}, Efficiency ${result.scoreBreakdown.costScore})`
    );
  }

  if (result.acceptanceResults) {
    lines.push(
      "",
      "Acceptance checks:",
      ...Object.entries(result.acceptanceResults).map(
        ([id, ok]) => `- ${id}: ${ok ? "pass" : "fail"}`
      )
    );
  }

  const hints = buildRunHints(result, state.requirements);
  if (hints.length > 0) {
    lines.push("", "Improvements to consider:", ...hints.map((hint) => `- ${hint}`));
  }

  return lines;
};

/**
 * Generate markdown brief for a practice session.
 * Uses dynamic data from scenario reference JSON.
 */
export async function toMarkdown(state: PracticeState): Promise<string> {
  // Load scenario and reference dynamically
  const scenario = SCENARIOS.find((s) => s.id === state.slug);
  if (!scenario) {
    throw new Error(`Scenario not found: ${state.slug}`);
  }

  const reference = await loadScenarioReference(state.slug);
  const context: BriefContext = { scenario, reference };

  // Use title from reference brief config, or fall back to scenario title
  const title = reference.brief?.title ?? `${scenario.title} Review`;

  const lines: string[] = [`# ${title}`, ""];

  lines.push("## Requirements");
  lines.push(...formatFunctional(state.requirements, reference));
  lines.push("", "### Non-functional");
  lines.push(...formatNonFunctional(state.requirements));

  lines.push("", "## Final Design");
  lines.push(...formatDesign(state, context));

  lines.push("", "## Simulation Outcome");
  lines.push(...formatSimulation(state, context));

  lines.push("", `Share snapshot generated at ${new Date(state.updatedAt).toISOString()}`);

  return lines.join("\n");
}

/**
 * Synchronous version for cases where context is already loaded.
 * Use toMarkdown() when possible for dynamic scenarios.
 */
export function toMarkdownSync(state: PracticeState, context: BriefContext): string {
  const title = context.reference.brief?.title ?? `${context.scenario.title} Review`;

  const lines: string[] = [`# ${title}`, ""];

  lines.push("## Requirements");
  lines.push(...formatFunctional(state.requirements, context.reference));
  lines.push("", "### Non-functional");
  lines.push(...formatNonFunctional(state.requirements));

  lines.push("", "## Final Design");
  lines.push(...formatDesign(state, context));

  lines.push("", "## Simulation Outcome");
  lines.push(...formatSimulation(state, context));

  lines.push("", `Share snapshot generated at ${new Date(state.updatedAt).toISOString()}`);

  return lines.join("\n");
}
