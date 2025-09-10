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
      { kind: "Object Store (S3)", optional: true }
    ],
    hints: ["Add CDN for static media.", "Warm cache to avoid DB on read path."],
    acceptance: [
      { id: "cdn-before-s3", text: "CDN sits before Object Store on media path", required: true },
      { id: "db-not-media-hotpath", text: "DB not required for each streaming request", required: true }
    ],
    api: [{ method: "GET", path: "/stream/:song_id" }],
    suggestedComponents: ["CDN", "Object Store (S3)", "Cache (Redis)"],
    version: "1.0",
    updatedAt: "2025-09-10"
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
      { kind: "DB (Postgres)" }
    ],
    hints: ["Add Redis in front of DB.", "Consider read replicas or indexes."],
    acceptance: [
      { id: "cache-on-read", text: "Cache in front of DB for hot queries", required: true }
    ],
    api: [{ method: "GET", path: "/search", query: ["q", "limit", "offset"] }],
    suggestedComponents: ["Cache (Redis)", "DB (Postgres)"],
    version: "1.0",
    updatedAt: "2025-09-10"
  },
  {
    id: "url-shortener",
    title: "URL Shortener",
    description: "Redirect requests within 100ms P95 at 5k RPS.",
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
      { kind: "DB (Postgres)" }
    ],
    hints: ["Cache hot slugs.", "Use read‑through cache to reduce DB hits."],
    acceptance: [
      { id: "cache-present", text: "Cache present on hot slug path", required: true },
      { id: "lb-service", text: "Service behind LB/API GW", required: true }
    ],
    api: [
      { method: "POST", path: "/urls", bodyShape: "{ long_url: string }", responseShape: "{ short: string }" },
      { method: "GET", path: "/:slug", notes: "302 to long URL" }
    ],
    suggestedComponents: ["CDN", "Cache (Redis)", "DB (Postgres)"],
    version: "1.0",
    updatedAt: "2025-09-10"
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
      { kind: "Cache (Redis)" }
    ],
    hints: ["Token bucket in Redis.", "Avoid DB writes on hot path."],
    acceptance: [
      { id: "limiter-on-path", text: "Rate limiter on request path before service", required: true }
    ],
    api: [{ method: "GET", path: "/resource" }],
    suggestedComponents: ["Rate Limiter"],
    version: "1.0",
    updatedAt: "2025-09-10"
  },
  {
    id: "cdn-design",
    title: "CDN Design",
    description: "Serve static assets globally with P95 < 80ms at 8k RPS.",
    category: "Streaming",
    difficulty: "easy",
    requiredRps: 8000,
    latencyBudgetMsP95: 80,
    flow: [
      { kind: "Web" },
      { kind: "CDN" },
      { kind: "Object Store (S3)" }
    ],
    hints: ["Put CDN in front of object storage.", "Tune TTLs and cache keys."],
    acceptance: [
      { id: "cdn-before-origin", text: "CDN sits in front of object store", required: true },
      { id: "origin-shield", text: "Origin shield/proxy layer added", required: false }
    ],
    api: [],
    suggestedComponents: ["CDN", "Origin Shield (CDN Proxy)"],
    version: "1.0",
    updatedAt: "2025-09-10"
  },
];


