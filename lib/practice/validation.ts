import { findScenarioPath } from "@/app/components/utils";
import type { Edge, NodeId, PlacedNode } from "@/app/components/types";
import type { Scenario } from "@/lib/scenarios";

export type DesignValidationResult =
  | { ok: true; path: NodeId[] }
  | {
      ok: false;
      reason: "missing_components" | "no_path";
      message: string;
      missingComponents: string[];
    };

export function validateDesignForScenario(
  scenario: Scenario,
  nodes: PlacedNode[],
  edges: Edge[]
): DesignValidationResult {
  const pathResult = findScenarioPath(scenario, nodes, edges);

  if (pathResult.missingKinds.length > 0) {
    return {
      ok: false,
      reason: "missing_components",
      missingComponents: pathResult.missingKinds,
      message: `Add the missing components to run simulation: ${pathResult.missingKinds.join(", ")}`,
    };
  }

  if (pathResult.nodeIds.length === 0) {
    return {
      ok: false,
      reason: "no_path",
      missingComponents: [],
      message: "No valid path found. Connect nodes from Web to DB before running.",
    };
  }

  return {
    ok: true,
    path: pathResult.nodeIds,
  };
}
