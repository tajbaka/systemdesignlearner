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
}

export interface Edge {
  id: EdgeId;
  from: NodeId;
  to: NodeId;
  linkLatencyMs: number; // network hop latency
}

export interface FlowStep {
  kind: string; // align with lib/scenarios schema
  optional?: boolean; // e.g. CDN might be optional
}
