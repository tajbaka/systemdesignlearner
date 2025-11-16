import { findScenarioPath } from "@/app/components/utils";
import { SCENARIOS } from "@/lib/scenarios";
import type { PracticeState, Requirements } from "./types";

const URL_SHORTENER = SCENARIOS.find((scenario) => scenario.id === "url-shortener")!;

const functionalOrder = [
  "create-short-url",
  "redirect-by-slug",
  "custom-alias",
  "basic-analytics",
  "rate-limiting",
  "admin-delete",
] as const;

const functionalLabels: Record<string, string> = {
  "create-short-url": "Create short URLs",
  "redirect-by-slug": "Redirect by slug",
  "custom-alias": "Custom aliases",
  "basic-analytics": "Click analytics",
  "rate-limiting": "Client rate limiting",
  "admin-delete": "Admin delete",
};

const formatFunctional = (requirements: Requirements | undefined): string[] => {
  if (!requirements) {
    return ["Functional requirements pending."];
  }

  const lines: string[] = [];
  if (requirements.functionalSummary.trim()) {
    lines.push(`Summary: ${requirements.functionalSummary.trim()}`);
    lines.push("");
  }

  lines.push(
    ...functionalOrder
      .filter((key) => key in requirements.functional)
      .map(
        (key) =>
          `- ${functionalLabels[key] ?? key}: ${requirements.functional[key] ? "Enabled" : "Deferred"}`
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

const formatDesign = (state: PracticeState): string[] => {
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

  const path = findScenarioPath(URL_SHORTENER, state.design.nodes, state.design.edges);
  if (path.nodeIds.length > 0) {
    const humanPath = path.nodeIds
      .map((id) => {
        const node = state.design.nodes.find((n) => n.id === id);
        return node?.customLabel?.trim() || node?.spec.label || node?.spec.kind || id;
      })
      .join(" → ");
    lines.push("", `Primary redirect flow: ${humanPath}`);
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

const formatSimulation = (state: PracticeState): string[] => {
  const result = state.run.lastResult;
  if (!result) {
    return ["Simulation not run yet. Complete the Run step to capture metrics."];
  }

  const lines = [
    `- Outcome: ${result.scoreBreakdown?.outcome ?? (result.failedByChaos ? "chaos_fail" : "pending")}`,
    `- P95 latency: ${result.latencyMsP95} ms (target ≤ ${URL_SHORTENER.latencyBudgetMsP95} ms)`,
    `- Capacity: ${result.capacityRps.toLocaleString()} rps (target ≥ ${URL_SHORTENER.requiredRps.toLocaleString()} rps)`,
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

export const toMarkdown = (state: PracticeState): string => {
  const lines: string[] = ["# URL Shortener Review", ""];

  lines.push("## Requirements");
  lines.push(...formatFunctional(state.requirements));
  lines.push("", "### Non-functional");
  lines.push(...formatNonFunctional(state.requirements));

  lines.push("", "## Final Design");
  lines.push(...formatDesign(state));

  lines.push("", "## Simulation Outcome");
  lines.push(...formatSimulation(state));

  lines.push("", `Share snapshot generated at ${new Date(state.updatedAt).toISOString()}`);

  return lines.join("\n");
};
