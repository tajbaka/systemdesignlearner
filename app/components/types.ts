// React Flow imports
import type { Node, Edge as ReactFlowEdge } from '@xyflow/react';

// Types
export type NodeId = string;
export type EdgeId = string;

export type ComponentKind =
  | "Web"
  | "CDN"
  | "API Gateway"
  | "Service"
  | "Cache (Redis)"
  | "DB (Postgres)"
  | "Object Store (S3)"
  | "Message Queue (Kafka Topic)"
  | "Load Balancer"
  | "Search Index (Elastic)"
  | "Read Replica"
  | "Object Cache (Memcached)"
  | "Auth"
  | "Rate Limiter"
  | "Stream Processor (Flink)"
  | "Worker Pool"
  | "ID Generator (Snowflake)"
  | "Shard Router"
  | "Tracing/Logging"
  | "Edge Function"
  | "Origin Shield (CDN Proxy)";

export interface ComponentSpec {
  kind: ComponentKind;
  label: string;
  baseLatencyMs: number; // intrinsic processing latency
  capacityRps: number; // sustainable throughput
  failureRate: number; // 0..1 chance to fail per tick in chaos mode
  costPerHour: number; // for scoring tradeoffs
}

export interface PlacedNode {
  id: NodeId;
  spec: ComponentSpec;
  x: number; // board coords
  y: number; // board coords
  replicas?: number; // number of replicas (default 1)
  customLabel?: string; // custom display name, overrides spec.label if provided
}

export interface Edge {
  id: EdgeId;
  from: NodeId;
  to: NodeId;
  linkLatencyMs: number; // network hop latency
  sourceHandle?: string;
  targetHandle?: string;
}

// React Flow compatible types
export interface SystemDesignNode extends Node {
  type: 'systemDesignNode';
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
    type: 'systemDesignNode',
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

export interface FlowStep {
  kind: string; // align with lib/scenarios schema
  optional?: boolean; // e.g. CDN might be optional
}
