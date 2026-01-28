// React Flow imports
import type { Node, Edge as ReactFlowEdge } from "@xyflow/react";
import type React from "react";

// Internal generic types - no business logic dependencies
export type NodeId = string;
export type EdgeId = string;

// Internal board node type (generic)
export interface BoardNode {
  id: NodeId;
  type: string;
  name?: string; // Display name
  x: number;
  y: number;
  icon?: React.ComponentType<Record<string, unknown>>;
}

// Internal board edge type (generic)
export interface BoardEdge {
  id: EdgeId;
  from: NodeId;
  to: NodeId;
  sourceHandle?: string;
  targetHandle?: string;
}

// React Flow compatible types
export interface DesignNode extends Node {
  type: "designNode";
  data: {
    type: string;
    name?: string; // Display name
    icon?: React.ComponentType<Record<string, unknown>>;
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

// Generic conversion functions - work with any node/edge structure
export function boardNodeToReactFlowNode(node: BoardNode): DesignNode {
  return {
    id: node.id,
    type: "designNode",
    position: { x: node.x - 95, y: node.y - 45 }, // Convert center position to top-left
    data: {
      type: node.type,
      name: node.name, // Pass through name
      icon: node.icon,
    },
  };
}

export function reactFlowNodeToBoardNode(node: DesignNode): BoardNode {
  return {
    id: node.id,
    type: node.data.type,
    name: node.data.name, // Pass through name
    x: node.position.x + 95, // Convert top-left to center position
    y: node.position.y + 45,
    icon: node.data.icon,
  };
}

export function boardEdgeToReactFlowEdge(edge: BoardEdge): SystemDesignEdge {
  return {
    id: edge.id,
    source: edge.from,
    target: edge.to,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    selectable: true,
  };
}

export function reactFlowEdgeToBoardEdge(edge: SystemDesignEdge): BoardEdge {
  return {
    id: edge.id,
    from: edge.source,
    to: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
  };
}
