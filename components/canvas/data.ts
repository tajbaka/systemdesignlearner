import { ComponentSpec } from "./types";

/**
 * Component Library - Educational defaults for system design practice
 *
 * These values represent typical characteristics of distributed system components.
 * They are simplified for educational purposes but based on real-world patterns.
 *
 * ## Value Explanations
 *
 * ### baseLatencyMs (Intrinsic Processing Latency)
 * The time a component takes to process a single request, excluding network hops.
 * - In-memory operations (cache, ID generator): 1-2ms
 * - Simple routing/proxying (LB, shard router): 2-4ms
 * - Database queries (indexed reads): 4-6ms
 * - Service logic (parsing, validation, business rules): 8-15ms
 * - Network-bound ops (CDN edge, S3): 20-35ms
 *
 * ### capacityRps (Sustainable Throughput)
 * Requests per second a single instance can handle before degradation.
 * Based on typical cloud instance performance (e.g., 4-8 vCPU).
 * - Pure routing (LB, shard router): 50K-100K RPS (stateless forwarding)
 * - In-memory data stores (Redis, Memcached): 15K-20K RPS
 * - Stateful services with I/O: 1K-6K RPS
 * - Single-threaded DB (Postgres): ~1.2K RPS for mixed workloads
 *
 * ### failureRate (Chaos Mode Probability)
 * Probability of failure per simulation tick (0-1 scale).
 * Used for chaos engineering scenarios. Based on:
 * - Highly redundant (CDN, ID gen): 0.0005 (99.95% tick success)
 * - Managed services (cache, queue): 0.001-0.0015
 * - Application code (services): 0.002 (bugs, OOMs, deployments)
 *
 * ### costPerHour (Relative Cost Units)
 * Simplified cost model for trade-off analysis.
 * Not tied to real pricing; represents relative infrastructure cost.
 * - Client: $0 (user's device)
 * - Stateless proxies: $0.08-0.18/hr
 * - Compute services: $0.18-0.40/hr
 * - Databases/storage: $0.25-0.35/hr
 */
export const COMPONENT_LIBRARY: ComponentSpec[] = [
  // Browser/mobile client - JS parsing + render overhead, no server cost
  {
    kind: "Web",
    label: "Client",
    baseLatencyMs: 10, // DOM parsing, JS hydration
    capacityRps: 20000, // Effectively unlimited (represents aggregate users)
    failureRate: 0.0001, // Rare client-side crashes
    costPerHour: 0, // User's device
  },

  // Edge network - fast cache hits, globally distributed
  {
    kind: "CDN",
    label: "CDN",
    baseLatencyMs: 20, // Edge POP lookup + cache check
    capacityRps: 50000, // Highly parallelized edge serving
    failureRate: 0.0005, // Multi-region redundancy
    costPerHour: 0.5, // Pay-per-bandwidth model (simplified)
  },

  // Request routing - authentication, rate limiting, routing logic
  {
    kind: "API Gateway",
    label: "API Gateway",
    baseLatencyMs: 8, // JWT validation, routing rules
    capacityRps: 8000, // Stateful (auth checks), more limited than LB
    failureRate: 0.001,
    costPerHour: 0.15,
  },

  // Pure L4/L7 forwarding - minimal processing
  {
    kind: "Load Balancer",
    label: "Load Balancer",
    baseLatencyMs: 3, // Connection forwarding only
    capacityRps: 100000, // Stateless packet forwarding
    failureRate: 0.0005, // HA pairs, health checks
    costPerHour: 0.08,
  },

  // Application logic - business rules, data transformation
  {
    kind: "Service",
    label: "Service",
    baseLatencyMs: 12, // JSON parsing, validation, orchestration
    capacityRps: 3000, // Typical containerized service (4 vCPU)
    failureRate: 0.002, // Deployment errors, OOMs, bugs
    costPerHour: 0.2,
  },

  // In-memory key-value - sub-millisecond reads
  {
    kind: "Cache (Redis)",
    label: "Cache (Redis)",
    baseLatencyMs: 1, // Memory access, no disk I/O
    capacityRps: 15000, // Single-threaded event loop
    failureRate: 0.0015, // Memory pressure, evictions
    costPerHour: 0.12,
  },

  // Relational DB - ACID guarantees, disk I/O
  {
    kind: "DB (Postgres)",
    label: "DB (Postgres)",
    baseLatencyMs: 4, // Indexed read (cache hit)
    capacityRps: 1200, // Connection pool limits, MVCC overhead
    failureRate: 0.001, // Managed DB with auto-failover
    costPerHour: 0.35,
  },

  // Blob storage - network round-trip to object store
  {
    kind: "Object Store (S3)",
    label: "Object Store (S3)",
    baseLatencyMs: 35, // HTTP request + network hop
    capacityRps: 5000, // Per-prefix partitioning
    failureRate: 0.0008, // 11 nines durability, high availability
    costPerHour: 0.25,
  },

  // Event streaming - append-only log with partitioning
  {
    kind: "Message Queue (Kafka Topic)",
    label: "Kafka Topic",
    baseLatencyMs: 5, // Partition write, replication ack
    capacityRps: 20000, // Multi-partition throughput
    failureRate: 0.001, // Broker redundancy
    costPerHour: 0.18,
  },

  // Full-text search - inverted index queries
  {
    kind: "Search Index (Elastic)",
    label: "Search Index",
    baseLatencyMs: 15, // Query parsing, index scan, scoring
    capacityRps: 6000, // Shard-based parallelism
    failureRate: 0.0015, // JVM heap issues, reindexing
    costPerHour: 0.3,
  },

  // Async replica - slightly behind primary
  {
    kind: "Read Replica",
    label: "Read Replica",
    baseLatencyMs: 6, // Same as primary + replication lag buffer
    capacityRps: 1500, // Read-only, no write contention
    failureRate: 0.001,
    costPerHour: 0.25,
  },

  // Simple key-value cache - multi-threaded, no persistence
  {
    kind: "Object Cache (Memcached)",
    label: "Memcached",
    baseLatencyMs: 1, // Pure memory, simpler than Redis
    capacityRps: 20000, // Multi-threaded (vs Redis single-thread)
    failureRate: 0.0015,
    costPerHour: 0.12,
  },

  // Identity/token validation service
  {
    kind: "Auth",
    label: "Auth Service",
    baseLatencyMs: 10, // Token introspection, permission checks
    capacityRps: 4000, // Crypto operations, DB lookups
    failureRate: 0.002,
    costPerHour: 0.2,
  },

  // Token bucket / sliding window counters
  {
    kind: "Rate Limiter",
    label: "Rate Limiter",
    baseLatencyMs: 2, // Redis INCR or in-memory counter
    capacityRps: 15000, // Lightweight state check
    failureRate: 0.001,
    costPerHour: 0.15,
  },

  // Real-time data processing - windowing, aggregations
  {
    kind: "Stream Processor (Flink)",
    label: "Stream Processor",
    baseLatencyMs: 25, // Watermarks, state management, windowing
    capacityRps: 5000, // Parallelism via task slots
    failureRate: 0.002, // Checkpointing failures, backpressure
    costPerHour: 0.4,
  },

  // Background job processing - same as Service
  {
    kind: "Worker Pool",
    label: "Worker",
    baseLatencyMs: 12, // Job execution (similar to service)
    capacityRps: 3000, // Queue consumption rate
    failureRate: 0.002,
    costPerHour: 0.2,
  },

  // Distributed unique ID generation (Twitter Snowflake pattern)
  {
    kind: "ID Generator (Snowflake)",
    label: "ID Generator",
    baseLatencyMs: 1, // Timestamp + worker ID + sequence
    capacityRps: 50000, // Lock-free, in-memory
    failureRate: 0.0005, // Simple, stateless
    costPerHour: 0.15,
  },

  // Consistent hashing / partition routing
  {
    kind: "Shard Router",
    label: "Shard Router",
    baseLatencyMs: 2, // Hash computation + lookup
    capacityRps: 100000, // Stateless routing
    failureRate: 0.0005,
    costPerHour: 0.08,
  },

  // Observability sidecar - async, fire-and-forget
  {
    kind: "Tracing/Logging",
    label: "Telemetry",
    baseLatencyMs: 3, // Span creation, log buffering
    capacityRps: 40000, // Sampled, async batching
    failureRate: 0.0008,
    costPerHour: 0.1,
  },

  // Serverless at edge - cold start amortized
  {
    kind: "Edge Function",
    label: "Edge Function",
    baseLatencyMs: 8, // V8 isolate startup (warm), execution
    capacityRps: 8000, // Per-region concurrency limits
    failureRate: 0.002, // Cold starts, timeout kills
    costPerHour: 0.18,
  },

  // Mid-tier cache to protect origin
  {
    kind: "Origin Shield (CDN Proxy)",
    label: "CDN Origin Shield",
    baseLatencyMs: 4, // Central cache lookup
    capacityRps: 50000, // Aggregated edge requests
    failureRate: 0.0008,
    costPerHour: 0.18,
  },
];
