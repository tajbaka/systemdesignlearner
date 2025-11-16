import { Edge, NodeId, PlacedNode } from "./types";
import type { Scenario } from "@/lib/scenarios";

// Utility helpers
export const uid = () => Math.random().toString(36).slice(2, 9);

export function linePath(x1: number, y1: number, x2: number, y2: number) {
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

// Very small graph helpers
export function findNode(nodes: PlacedNode[], id: NodeId) {
  return nodes.find((n) => n.id === id);
}

export function neighbors(edges: Edge[], from: NodeId) {
  return edges.filter((e) => e.from === from).map((e) => e.to);
}

// Grid snapping helper shared by board/editor
export function snapToGrid(value: number): number {
  return Math.round(value / 24) * 24;
}

/**
 * Build bidirectional adjacency map from edges
 * Treats all edges as bidirectional - user can draw arrows in either direction
 *
 * @param edges - Array of edges with from/to node IDs
 * @returns Map of nodeId -> Set of connected nodeIds
 */
export function buildBidirectionalAdjacency(edges: Edge[]): Map<NodeId, Set<NodeId>> {
  const adjacency = new Map<NodeId, Set<NodeId>>();

  for (const edge of edges) {
    // Add both directions since users might connect arrows in either direction
    const list1 = adjacency.get(edge.from) ?? new Set<NodeId>();
    list1.add(edge.to);
    adjacency.set(edge.from, list1);

    const list2 = adjacency.get(edge.to) ?? new Set<NodeId>();
    list2.add(edge.from);
    adjacency.set(edge.to, list2);
  }

  return adjacency;
}

/**
 * Check if there's a connection between two component kinds (bidirectional)
 * Matches any nodes of the specified kinds, not specific node instances
 *
 * @param nodes - Array of placed nodes
 * @param edges - Array of edges
 * @param fromKind - Source component kind (e.g., "Service")
 * @param toKind - Target component kind (e.g., "Cache (Redis)")
 * @returns true if any connection exists between nodes of these kinds
 */
export function hasConnectionBetweenKinds(
  nodes: PlacedNode[],
  edges: Edge[],
  fromKind: string,
  toKind: string
): boolean {
  // Helper to match component kind including alternatives
  const matchesKind = (nodeKind: string, targetKind: string): boolean => {
    if (nodeKind === targetKind) return true;

    // Check if base types match (e.g., "DB (Postgres)" matches "DB (MySQL)")
    const baseTarget = targetKind.split(" ")[0];
    const baseNode = nodeKind.split(" ")[0];

    return baseTarget === baseNode;
  };

  // Find all nodes matching each kind
  const fromNodes = nodes.filter((n) => matchesKind(n.spec.kind, fromKind));
  const toNodes = nodes.filter((n) => matchesKind(n.spec.kind, toKind));

  if (fromNodes.length === 0 || toNodes.length === 0) {
    return false;
  }

  // Check if any edge exists between any pair (bidirectional)
  for (const fromNode of fromNodes) {
    for (const toNode of toNodes) {
      const hasEdge = edges.some(
        (edge) =>
          (edge.from === fromNode.id && edge.to === toNode.id) ||
          (edge.from === toNode.id && edge.to === fromNode.id) // Bidirectional!
      );
      if (hasEdge) {
        return true;
      }
    }
  }

  return false;
}

// Given a scenario, try to find a path in the current graph that hits the flow kinds in order (allowing optional steps)
export function findScenarioPath(
  scenario: Scenario,
  nodes: PlacedNode[],
  edges: Edge[]
): { nodeIds: NodeId[]; missingKinds: string[] } {
  type State = { current: NodeId | null; path: NodeId[]; visited: Set<NodeId> };

  // Use shared bidirectional adjacency builder
  const adjacency = buildBidirectionalAdjacency(edges);

  // Index nodes by component kind so we can quickly look up candidates per flow step
  const byKind = new Map<string, NodeId[]>();
  for (const node of nodes) {
    const existing = byKind.get(node.spec.kind) ?? [];
    existing.push(node.id);
    byKind.set(node.spec.kind, existing);
  }

  const missingKinds = new Set<string>();

  let states: State[] = [{ current: null, path: [], visited: new Set() }];

  for (const step of scenario.flow) {
    const candidates = byKind.get(step.kind) ?? [];
    const nextStates: State[] = [];
    let stepAdvanced = false;

    for (const state of states) {
      if (state.current === null) {
        let progressed = false;
        for (const candidate of candidates) {
          if (state.visited.has(candidate)) continue;
          progressed = true;
          stepAdvanced = true;
          const visited = new Set(state.visited);
          visited.add(candidate);
          nextStates.push({
            current: candidate,
            path: [...state.path, candidate],
            visited,
          });
        }

        if (step.optional || !progressed) {
          nextStates.push(state);
        }
        continue;
      }

      const neighborsOfCurrent = adjacency.get(state.current) ?? new Set<NodeId>();
      const advancedStates: State[] = [];
      for (const candidate of candidates) {
        if (!neighborsOfCurrent.has(candidate)) continue;
        if (state.visited.has(candidate)) continue;
        stepAdvanced = true;
        const visited = new Set(state.visited);
        visited.add(candidate);
        advancedStates.push({
          current: candidate,
          path: [...state.path, candidate],
          visited,
        });
      }

      if (advancedStates.length > 0) {
        nextStates.push(...advancedStates);
        if (step.optional) {
          nextStates.push(state);
        }
      } else {
        nextStates.push(state);
      }
    }

    if (!step.optional && (candidates.length === 0 || !stepAdvanced)) {
      missingKinds.add(step.kind);
    }

    states = dedupeStates(nextStates);
    if (states.length === 0) {
      states = [{ current: null, path: [], visited: new Set() }];
    }
  }

  const bestState = states.reduce<State>(
    (best, state) => (state.path.length > best.path.length ? state : best),
    { current: null, path: [], visited: new Set() }
  );

  return { nodeIds: bestState.path, missingKinds: Array.from(missingKinds) };
}

function dedupeStates(
  states: Array<{ current: NodeId | null; path: NodeId[]; visited: Set<NodeId> }>
) {
  const seen = new Set<string>();
  const result: typeof states = [];
  for (const state of states) {
    const key = `${state.current ?? "null"}|${state.path.join("->")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(state);
  }
  return result;
}
