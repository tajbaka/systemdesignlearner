import { findScenarioPath } from "@/components/canvas/utils";
import type { Edge, NodeId, PlacedNode } from "@/components/canvas/types";
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
    // Generate specific message based on what's missing, in the order users would build
    // Order: Web -> API Gateway -> Service -> Cache -> Database
    const missing = pathResult.missingKinds;
    let message = "";

    // Priority 1: API Gateway (first hop from Web)
    if (missing.includes("API Gateway")) {
      message =
        "You have the Web client. What component should sit at the edge to receive and route incoming HTTP requests from users?";
    }
    // Priority 2: Service (handles business logic after API Gateway)
    else if (missing.includes("Service")) {
      message =
        "Your API Gateway needs something to route requests to. What component will handle the business logic for creating short URLs and performing redirects?";
    }
    // Priority 3: Database (persistence layer)
    else if (
      missing.includes("DB (Postgres)") ||
      missing.includes("DB (MySQL)") ||
      missing.includes("DB (MongoDB)")
    ) {
      message =
        "Your services need somewhere to store data. Where will URL mappings be permanently stored so they survive crashes?";
    }
    // Priority 4: Cache (optimization layer for reads)
    else if (missing.includes("Cache (Redis)") || missing.includes("Object Cache (Memcached)")) {
      message =
        "You have persistence, but with billions of redirect requests per day, how will you achieve sub-100ms latency? What layer can avoid hitting the database for popular URLs?";
    } else {
      message = `Missing components for simulation: ${missing.join(", ")}. Add these to complete the data flow.`;
    }

    return {
      ok: false,
      reason: "missing_components",
      missingComponents: pathResult.missingKinds,
      message,
    };
  }

  if (pathResult.nodeIds.length === 0) {
    return {
      ok: false,
      reason: "no_path",
      missingComponents: [],
      message:
        "You have all the components, but they're not connected. How should a request flow from the Web client through your system? Connect the components to form a complete path.",
    };
  }

  return {
    ok: true,
    path: pathResult.nodeIds,
  };
}
