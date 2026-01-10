import { Edge, NodeId, PlacedNode } from "./types";

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
  const fromNodes = nodes.filter((n) => {
    const match = n.id.match(/^node-([^-]+)-/);
    const nodeKind = match ? match[1] : "";
    return matchesKind(nodeKind, fromKind);
  });
  const toNodes = nodes.filter((n) => {
    const match = n.id.match(/^node-([^-]+)-/);
    const nodeKind = match ? match[1] : "";
    return matchesKind(nodeKind, toKind);
  });

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
