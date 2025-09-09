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
  | "Load Balancer";

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
}

export interface Edge {
  id: EdgeId;
  from: NodeId;
  to: NodeId;
  linkLatencyMs: number; // network hop latency
}

export interface FlowStep {
  kind: ComponentKind; // node kind that should appear on the path
  optional?: boolean; // e.g. CDN might be optional
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  requiredRps: number;
  latencyBudgetMsP95: number;
  flow: FlowStep[]; // ordered hints to validate a plausible path
  hints?: string[];
}
