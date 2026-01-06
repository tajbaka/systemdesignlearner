/**
 * Core Domain Types
 *
 * These types represent the core business domain concepts for system design:
 * - Components (nodes) that make up a system architecture
 * - Connections (edges) between components
 * - Specifications for component behavior
 *
 * Note: React Flow specific types (SystemDesignNode, SystemDesignEdge) and
 * conversion functions remain in components/canvas/types.ts as they are
 * presentation-layer concerns.
 */

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
