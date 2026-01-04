// React Flow imports
import type { Node, Edge as ReactFlowEdge } from "@xyflow/react";

// Re-export core domain types from canonical location
export type {
  NodeId,
  EdgeId,
  ComponentKind,
  ComponentSpec,
  PlacedNode,
  Edge,
} from "@/lib/types/domain";

// Import for local use
import type { ComponentSpec, PlacedNode, Edge } from "@/lib/types/domain";

// React Flow compatible types
export interface SystemDesignNode extends Node {
  type: "systemDesignNode";
  data: {
    spec: ComponentSpec;
    replicas?: number;
    customLabel?: string;
    onDelete?: (id: string) => void;
    onNodeTouchStart?: (nodeId: string) => void;
    onNodeTouchEnd?: () => void;
    onRename?: (id: string, newLabel: string) => void;
    onUpdateReplicas?: (id: string, replicas: number) => void;
  };
}

export interface SystemDesignEdge extends ReactFlowEdge {
  sourceHandle?: string;
  targetHandle?: string;
  data?: {
    linkLatencyMs: number;
  };
}

// Utility functions for type conversion
export function placedNodeToReactFlowNode(node: PlacedNode): SystemDesignNode {
  return {
    id: node.id,
    type: "systemDesignNode",
    position: { x: node.x - 95, y: node.y - 45 }, // Convert center position to top-left
    data: {
      spec: node.spec,
      replicas: node.replicas || 1,
      customLabel: node.customLabel,
    },
  };
}

export function reactFlowNodeToPlacedNode(node: SystemDesignNode): PlacedNode {
  return {
    id: node.id,
    spec: node.data.spec,
    x: node.position.x + 95, // Convert top-left to center position
    y: node.position.y + 45,
    replicas: node.data.replicas || 1,
    customLabel: node.data.customLabel,
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
    data: {
      linkLatencyMs: edge.linkLatencyMs,
    },
  };
}

export function reactFlowEdgeToEdge(edge: SystemDesignEdge): Edge {
  return {
    id: edge.id,
    from: edge.source,
    to: edge.target,
    linkLatencyMs: edge.data?.linkLatencyMs || 10,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
  };
}

// FlowStep type is defined in lib/scenarios.ts - use that as the canonical source
