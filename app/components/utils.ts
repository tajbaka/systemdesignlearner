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

// Given a scenario, try to find a path in the current graph that hits the flow kinds in order (allowing optional steps)
export function findScenarioPath(
  scenario: Scenario,
  nodes: PlacedNode[],
  edges: Edge[]
): { nodeIds: NodeId[]; missingKinds: string[] } {
  const remainingKinds = [...scenario.flow];
  const nodeIds: NodeId[] = [];
  const missingKinds: string[] = [];

  // Build index: kind -> list of node ids
  const byKind = new Map<string, NodeId[]>();
  for (const n of nodes) {
    const arr = byKind.get(n.spec.kind) || [];
    arr.push(n.id);
    byKind.set(n.spec.kind, arr);
  }

  // Try a greedy walk: pick the first available node of the next required kind reachable from the current
  let current: NodeId | null = null;
  for (const step of remainingKinds) {
    const candidates = byKind.get(step.kind) || [];
    if (candidates.length === 0) {
      if (!step.optional) missingKinds.push(step.kind);
      continue; // skip optional if absent
    }

    if (current === null) {
      // start anywhere from candidates
      const chosen = candidates[0];
      nodeIds.push(chosen);
      current = chosen;
      continue;
    }

    // from current, is there an edge reaching any candidate?
    const nbrs: Set<NodeId> = new Set(neighbors(edges, current));
    const reachable = candidates.find((cid) => nbrs.has(cid));
    if (reachable) {
      nodeIds.push(reachable);
      current = reachable;
    } else {
      if (!step.optional) missingKinds.push(step.kind);
      // keep current; try to match next step later
    }
  }

  return { nodeIds, missingKinds };
}
