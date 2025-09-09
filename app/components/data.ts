import { ComponentSpec } from "./types";

// Component Library – sane-ish defaults (feel free to tune)
export const COMPONENT_LIBRARY: ComponentSpec[] = [
  { kind: "Web", label: "Web Client", baseLatencyMs: 10, capacityRps: 20000, failureRate: 0.0001, costPerHour: 0 },
  { kind: "CDN", label: "CDN", baseLatencyMs: 20, capacityRps: 50000, failureRate: 0.0005, costPerHour: 0.5 },
  { kind: "API Gateway", label: "API Gateway", baseLatencyMs: 8, capacityRps: 8000, failureRate: 0.001, costPerHour: 0.15 },
  { kind: "Load Balancer", label: "Load Balancer", baseLatencyMs: 3, capacityRps: 100000, failureRate: 0.0005, costPerHour: 0.08 },
  { kind: "Service", label: "Service", baseLatencyMs: 12, capacityRps: 3000, failureRate: 0.002, costPerHour: 0.2 },
  { kind: "Cache (Redis)", label: "Cache (Redis)", baseLatencyMs: 1, capacityRps: 15000, failureRate: 0.0015, costPerHour: 0.12 },
  { kind: "DB (Postgres)", label: "DB (Postgres)", baseLatencyMs: 4, capacityRps: 1200, failureRate: 0.001, costPerHour: 0.35 },
  { kind: "Object Store (S3)", label: "Object Store (S3)", baseLatencyMs: 35, capacityRps: 5000, failureRate: 0.0008, costPerHour: 0.25 },
  { kind: "Message Queue (Kafka Topic)", label: "Kafka Topic", baseLatencyMs: 5, capacityRps: 20000, failureRate: 0.001, costPerHour: 0.18 },
];