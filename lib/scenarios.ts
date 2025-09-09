import type { Scenario, FlowStep } from "@/app/components/types";
export type { Scenario, FlowStep };

export const SCENARIOS: Scenario[] = [
  {
    id: "spotify-play",
    title: "Spotify: Play a Track",
    description:
      "Serve a playback request within 200ms P95. Use CDN/cache; DB must not be on hot path.",
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
  },
  {
    id: "spotify-search",
    title: "Spotify: Search Catalog",
    description: "Handle search bursts quickly. Cache and minimize DB lookups.",
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
  },
  {
    id: "url-shortener",
    title: "URL Shortener",
    description: "Redirect requests within 100ms P95 at 5k RPS.",
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
  },
  {
    id: "rate-limiter",
    title: "Rate Limiter",
    description: "Enforce 100 req/min per user without introducing high latency.",
    requiredRps: 2000,
    latencyBudgetMsP95: 120,
    flow: [
      { kind: "Web" },
      { kind: "API Gateway" },
      { kind: "Service" },
      { kind: "Cache (Redis)" }
    ],
    hints: ["Token bucket in Redis.", "Avoid DB writes on hot path."],
  },
  {
    id: "cdn-design",
    title: "CDN Design",
    description: "Serve static assets globally with P95 < 80ms at 8k RPS.",
    requiredRps: 8000,
    latencyBudgetMsP95: 80,
    flow: [
      { kind: "Web" },
      { kind: "CDN" },
      { kind: "Object Store (S3)" }
    ],
    hints: ["Put CDN in front of object storage.", "Tune TTLs and cache keys."],
  },
];


