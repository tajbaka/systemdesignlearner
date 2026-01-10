// React Flow imports
import type { Node, Edge as ReactFlowEdge } from "@xyflow/react";

// Re-export core domain types from canonical location
export type { NodeId, EdgeId, PlacedNode, Edge, ComponentKind } from "@/domains/practice/types";

// Import for local use
import type { PlacedNode, Edge, ComponentKind } from "@/domains/practice/types";

// React Flow compatible types
export interface SystemDesignNode extends Node {
  type: "systemDesignNode";
  data: {
    kind: ComponentKind;
    onDelete?: (id: string) => void;
    onNodeTouchStart?: (nodeId: string) => void;
    onNodeTouchEnd?: () => void;
    onRename?: (id: string, newLabel: string) => void;
    onUpdateReplicas?: (id: string, replicas: number) => void;
  };
}

export interface SystemDesignEdge extends ReactFlowEdge {
  data?: Record<string, unknown>;
}

// Utility functions for type conversion
export function placedNodeToReactFlowNode(node: PlacedNode, kind: ComponentKind): SystemDesignNode {
  return {
    id: node.id,
    type: "systemDesignNode",
    position: { x: node.x - 95, y: node.y - 45 }, // Convert center position to top-left
    data: {
      kind,
    },
  };
}

export function reactFlowNodeToPlacedNode(node: SystemDesignNode): PlacedNode {
  return {
    id: node.id,
    x: node.position.x + 95, // Convert top-left to center position
    y: node.position.y + 45,
  };
}

export function edgeToReactFlowEdge(edge: Edge): SystemDesignEdge {
  return {
    id: edge.id,
    source: edge.from,
    target: edge.to,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    selectable: true,
  };
}

export function reactFlowEdgeToEdge(edge: SystemDesignEdge): Edge {
  return {
    id: edge.id,
    from: edge.source,
    to: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
  };
}

// FlowStep type is defined in lib/scenarios.ts - use that as the canonical source
