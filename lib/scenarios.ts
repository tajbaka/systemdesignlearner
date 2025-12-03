// Extended Scenario schema for Content & Taxonomy (Workstream A)
export type Difficulty = "easy" | "medium" | "hard";
export type Category =
  | "Caching"
  | "Messaging"
  | "Search"
  | "Streaming"
  | "Realtime"
  | "Storage"
  | "Payments"
  | "Batch"
  | "Rate Limiting"
  | "Other";

export type FlowStep = { kind: string; optional?: boolean };

export type ScenarioChecklistItem = {
  id: string;
  text: string;
  required: boolean;
};

export type ApiEndpoint = {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  query?: string[];
  bodyShape?: string;
  responseShape?: string;
  notes?: string;
};

export type Scenario = {
  id: string;
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  requiredRps: number;
  latencyBudgetMsP95: number;
  flow: FlowStep[];
  hints?: string[];
  acceptance?: ScenarioChecklistItem[];
  api?: ApiEndpoint[];
  version?: string;
  updatedAt?: string;
  suggestedComponents?: string[];
  estimatedTime?: string;
};

export const SCENARIOS: Scenario[] = [
  {
    id: "spotify-play",
    title: "Spotify: Play a Track",
    description:
      "Serve a playback request within 200ms P95. Use CDN/cache; DB must not be on hot path.",
    category: "Streaming",
    difficulty: "hard",
    requiredRps: 2000,
    latencyBudgetMsP95: 200,
    flow: [
      { kind: "Web" },
      { kind: "CDN", optional: true },
      { kind: "API Gateway" },
      { kind: "Load Balancer", optional: true },
      { kind: "Service" },
      { kind: "Cache (Redis)", optional: true },
      { kind: "DB (Postgres)" },
      { kind: "Object Store (S3)", optional: true },
    ],
    hints: ["Add CDN for static media.", "Warm cache to avoid DB on read path."],
    acceptance: [
      { id: "cdn-before-s3", text: "CDN sits before Object Store on media path", required: true },
      {
        id: "db-not-media-hotpath",
        text: "DB not required for each streaming request",
        required: true,
      },
    ],
    api: [{ method: "GET", path: "/stream/:song_id" }],
    suggestedComponents: ["CDN", "Object Store (S3)", "Cache (Redis)"],
    version: "1.0",
    updatedAt: "2025-09-10",
  },
  {
    id: "spotify-search",
    title: "Spotify: Search Catalog",
    description: "Handle search bursts quickly. Cache and minimize DB lookups.",
    category: "Search",
    difficulty: "medium",
    requiredRps: 1500,
    latencyBudgetMsP95: 300,
    flow: [
      { kind: "Web" },
      { kind: "API Gateway" },
      { kind: "Service" },
      { kind: "Cache (Redis)", optional: true },
      { kind: "DB (Postgres)" },
    ],
    hints: ["Add Redis in front of DB.", "Consider read replicas or indexes."],
    acceptance: [
      { id: "cache-on-read", text: "Cache in front of DB for hot queries", required: true },
    ],
    api: [{ method: "GET", path: "/search", query: ["q", "limit", "offset"] }],
    suggestedComponents: ["Cache (Redis)", "DB (Postgres)"],
    version: "1.0",
    updatedAt: "2025-09-10",
  },
  {
    id: "url-shortener",
    title: "URL Shortener",
    description:
      "Design a scalable URL shortening service that converts long URLs into short, shareable links. The system should support a large number of users using the redirect service. Consider storage design, ensuring uniqueness, fault tolerance, and high-performance operation at large scale. Extra points for considering custom aliases, link expiration, and analytics.",
    category: "Caching",
    difficulty: "easy",
    requiredRps: 5000,
    latencyBudgetMsP95: 100,
    flow: [
      { kind: "Web" },
      { kind: "CDN", optional: true },
      { kind: "API Gateway" },
      { kind: "Service" },
      { kind: "Cache (Redis)", optional: true },
      { kind: "DB (Postgres)" },
    ],
    hints: ["Cache hot slugs.", "Use read‑through cache to reduce DB hits."],
    acceptance: [
      { id: "cache-present", text: "Cache present on hot slug path", required: true },
      { id: "lb-service", text: "Service behind LB/API GW", required: true },
      { id: "analytics", text: "Analytics queue for async event processing", required: false },
    ],
    api: [
      {
        method: "POST",
        path: "urls",
        bodyShape: "{ long_url: string }",
        responseShape: "{ short: string }",
      },
      { method: "GET", path: ":slug", notes: "302 to long URL" },
    ],
    suggestedComponents: ["CDN", "Cache (Redis)", "DB (Postgres)"],
    estimatedTime: "15-20 minutes",
    version: "1.0",
    updatedAt: "2025-09-10",
  },
  {
    id: "rate-limiter",
    title: "Rate Limiter",
    description: "Enforce 100 req/min per user without introducing high latency.",
    category: "Rate Limiting",
    difficulty: "easy",
    requiredRps: 2000,
    latencyBudgetMsP95: 120,
    flow: [
      { kind: "Web" },
      { kind: "API Gateway" },
      { kind: "Service" },
      { kind: "Cache (Redis)" },
    ],
    hints: ["Token bucket in Redis.", "Avoid DB writes on hot path."],
    acceptance: [
      {
        id: "limiter-on-path",
        text: "Rate limiter on request path before service",
        required: true,
      },
    ],
    api: [{ method: "GET", path: "/resource" }],
    suggestedComponents: ["Rate Limiter"],
    version: "1.0",
    updatedAt: "2025-09-10",
  },
  {
    id: "cdn-design",
    title: "CDN Design",
    description: "Serve static assets globally with P95 < 80ms at 8k RPS.",
    category: "Streaming",
    difficulty: "easy",
    requiredRps: 8000,
    latencyBudgetMsP95: 80,
    flow: [{ kind: "Web" }, { kind: "CDN" }, { kind: "Object Store (S3)" }],
    hints: ["Put CDN in front of object storage.", "Tune TTLs and cache keys."],
    acceptance: [
      { id: "cdn-before-origin", text: "CDN sits in front of object store", required: true },
      { id: "origin-shield", text: "Origin shield/proxy layer added", required: false },
    ],
    api: [],
    suggestedComponents: ["CDN", "Origin Shield (CDN Proxy)"],
    version: "1.0",
    updatedAt: "2025-09-10",
  },
  {
    id: "webhook-delivery",
    title: "Webhook Delivery",
    description: "Reliable async callbacks with retries and DLQ.",
    category: "Messaging",
    difficulty: "medium",
    requiredRps: 3000,
    latencyBudgetMsP95: 300,
    flow: [
      { kind: "Web" },
      { kind: "API Gateway" },
      { kind: "Service" },
      { kind: "Message Queue (Kafka Topic)" },
      { kind: "Worker Pool" },
    ],
    hints: [
      "Add dead-letter queue for failed deliveries.",
      "Use message queue for async processing.",
    ],
    acceptance: [
      { id: "dlq", text: "Dead-letter path exists for failed deliveries", required: true },
    ],
    api: [{ method: "POST", path: "/events", bodyShape: "{ type, payload }" }],
    suggestedComponents: ["Worker Pool", "Message Queue (Kafka Topic)"],
    version: "1.0",
    updatedAt: "2025-09-10",
  },
  {
    id: "typeahead",
    title: "Typeahead Search",
    description: "Autocomplete results < 100ms P95.",
    category: "Search",
    difficulty: "medium",
    requiredRps: 5000,
    latencyBudgetMsP95: 100,
    flow: [
      { kind: "Web" },
      { kind: "API Gateway" },
      { kind: "Service" },
      { kind: "Search Index (Elastic)" },
    ],
    hints: ["Use dedicated search index.", "Cache popular queries."],
    acceptance: [{ id: "search-index", text: "Dedicated search index in path", required: true }],
    api: [{ method: "GET", path: "/search", query: ["q", "limit", "offset"] }],
    suggestedComponents: ["Search Index (Elastic)"],
    version: "1.0",
    updatedAt: "2025-09-10",
  },
  {
    id: "leaderboard",
    title: "Leaderboard",
    description: "Top-N reads low latency; frequent score updates.",
    category: "Realtime",
    difficulty: "easy",
    requiredRps: 4000,
    latencyBudgetMsP95: 120,
    flow: [
      { kind: "Web" },
      { kind: "API Gateway" },
      { kind: "Service" },
      { kind: "Cache (Redis)" },
      { kind: "DB (Postgres)" },
    ],
    hints: ["Use Redis sorted sets for top-N queries.", "Cache leaderboard in memory."],
    acceptance: [
      { id: "redis-zset", text: "In-memory store used for top-N (e.g., Redis)", required: true },
    ],
    api: [
      { method: "GET", path: "/leaderboard", query: ["limit", "offset"] },
      { method: "POST", path: "/score", bodyShape: "{ user_id, delta }" },
    ],
    suggestedComponents: ["Cache (Redis)"],
    version: "1.0",
    updatedAt: "2025-09-10",
  },
  {
    id: "pastebin",
    title: "Pastebin",
    description: "Create/view text pastes; serve in <150ms P95.",
    category: "Storage",
    difficulty: "easy",
    requiredRps: 2000,
    latencyBudgetMsP95: 150,
    flow: [
      { kind: "Web" },
      { kind: "API Gateway" },
      { kind: "Service" },
      { kind: "Object Store (S3)" },
      { kind: "CDN", optional: true },
    ],
    hints: ["Add CDN for static content.", "Store pastes in object storage."],
    acceptance: [
      { id: "cdn-on-static", text: "CDN in front of static paste content", required: true },
    ],
    api: [
      {
        method: "POST",
        path: "/pastes",
        bodyShape: "{ text: string }",
        responseShape: "{ id: string }",
      },
      { method: "GET", path: "/pastes/:id" },
    ],
    suggestedComponents: ["CDN", "Object Store (S3)"],
    version: "1.0",
    updatedAt: "2025-09-10",
  },
];
