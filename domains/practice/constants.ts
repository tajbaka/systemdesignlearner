import type { ComponentKind } from "@/domains/practice/types";

export type ComponentTypeConfig = {
  kind: ComponentKind;
  ops?: string[];
};

/**
 * Map type string to ComponentKind with valid operations
 * Used when loading components from scoring config solutions
 * Note: Some configs use "object-store" while designToComponents uses "storage"
 */
export const ALLOWED_COMPONENTS_LIST: Record<string, ComponentTypeConfig> = {
  client: { kind: "Client" },
  gateway: { kind: "API Gateway" },
  service: { kind: "Service", ops: ["read", "write"] },
  cache: { kind: "Cache (Redis)", ops: ["read"] },
  db: { kind: "DB (Postgres)", ops: ["read", "write"] },
  cdn: { kind: "CDN" },
  storage: { kind: "Object Store (S3)", ops: ["read", "write"] },
  "object-store": { kind: "Object Store (S3)", ops: ["read", "write"] },
  queue: { kind: "Message Queue (Kafka Topic)", ops: ["read", "write"] },
  lb: { kind: "Load Balancer" },
  search: { kind: "Search Index (Elastic)", ops: ["read", "write"] },
  auth: { kind: "Auth" },
  "rate-limiter": { kind: "Rate Limiter" },
  processor: { kind: "Stream Processor (Flink)", ops: ["read", "write"] },
  worker: { kind: "Worker Pool", ops: ["read", "write"] },
  "id-generator": { kind: "ID Generator (Snowflake)" },
  router: { kind: "Shard Router" },
  monitoring: { kind: "Tracing/Logging", ops: ["write"] },
  "edge-function": { kind: "Edge Function" },
};

export const VALID_SLUGS = {
  URL_SHORTENER: "url-shortener",
  PASTEBIN: "pastebin",
} as const;

export const PRACTICE_IMAGE_URLS = {
  [VALID_SLUGS.URL_SHORTENER]: "/desktop-url-shortener-practice.gif",
  [VALID_SLUGS.PASTEBIN]: "/desktop-pastebin-practice.gif",
} as const;
