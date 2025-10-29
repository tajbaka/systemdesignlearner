# System Design Sandbox — Launch-Ready Plan (MVP+)

A **copy-paste** execution plan to take your existing Next.js sandbox from MVP to **“very complete & launch-ready.”**  
Includes schema changes, components to add, tutorial, API track, scoring, authoring tools, analytics, tests, perf, and deploy.

---

## Table of Contents

1. [Prerequisites](#prerequisites)

<!-- Additional sections to be added as implementation progresses -->
<!-- 
2. [Architecture Snapshot](#architecture-snapshot)
3. [Workstream A — Content & Taxonomy](#workstream-a--content--taxonomy)
4. [Workstream B — Onboarding & Tutorial](#workstream-b--onboarding--tutorial)
5. [Workstream C — Simulation Engine Upgrades](#workstream-c--simulation-engine-upgrades)
6. [Workstream D — Editor UX Polish](#workstream-d--editor-ux-polish)
7. [Workstream E — API Design Track](#workstream-e--api-design-track)
8. [Workstream F — Results Panel & Scoring](#workstream-f--results-panel--scoring)
9. [Workstream G — Authoring Tools](#workstream-g--authoring-tools)
10. [Workstream H — Analytics & Error Monitoring](#workstream-h--analytics--error-monitoring)
11. [Workstream I — SEO, A11y, Legal](#workstream-i--seo-a11y-legal)
12. [Workstream J — Testing Strategy](#workstream-j--testing-strategy)
13. [Workstream K — Performance & Deploy](#workstream-k--performance--deploy)
14. [Milestones & Definition of Done](#milestones--definition-of-done)
15. [Appendix 1 — Component Library Extensions](#appendix-1--component-library-extensions)
16. [Appendix 2 — Example Scenario Seeds (12)](#appendix-2--example-scenario-seeds-12)
17. [Appendix 3 — Utility Snippets](#appendix-3--utility-snippets)
-->

---

## Prerequisites

- Project root: `~/system-design-sandbox` (Next.js App Router + Tailwind)
- Node >= 18, npm
- Current editor component at `app/components/SystemDesignSandbox.tsx`
- You already have light/dark theme, grid fix, drag-from-node connections, share/fork (URL-hash), RNG-ready simulate, and basic scenarios.

**Command setup (if missing):**

```bash
cd ~/system-design-sandbox
npm i -D vitest @testing-library/react @testing-library/jest-dom ts-node prettier playwright @playwright/test
npx playwright install --with-deps
Architecture Snapshot
Frontend only (MVP): Next.js, Tailwind, Framer Motion

State: React state (consider Zustand if undo/redo grows)

Share/Fork: URL-hash encode design JSON (no backend). Optional v2: Supabase for slugs/gallery.

Analytics: Plausible (simple) or PostHog (advanced)

Errors: Sentry

Hosting: Vercel

Workstream A — Content & Taxonomy
A.1 Extend Scenario Schema
Create/extend lib/scenarios.ts:

ts
Copia codice
// lib/scenarios.ts
export type Difficulty = "easy" | "medium" | "hard";
export type Category =
  | "Caching" | "Messaging" | "Search" | "Streaming" | "Realtime"
  | "Storage" | "Payments" | "Batch" | "Rate Limiting" | "Other";

export type FlowStep = { kind: string; optional?: boolean };

export type ScenarioChecklistItem = {
  id: string;
  text: string;        // shown to user (evaluable)
  required: boolean;   // required for pass
};

export type ApiEndpoint = {
  method: "GET"|"POST"|"PUT"|"DELETE"|"PATCH";
  path: string;              // e.g., /search
  query?: string[];          // e.g., ["q", "limit", "offset"]
  bodyShape?: string;        // brief JSON shape or zod string
  responseShape?: string;    // brief JSON shape
  notes?: string;            // quick hint
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
  api?: ApiEndpoint[];       // optional API-design track

  version?: string;
  updatedAt?: string;
  suggestedComponents?: string[];
};
Accepts when: You can import Scenario and SCENARIOS from this file, and the UI displays category and difficulty chips in the scenario selector.

A.2 Tag Scenarios with Difficulty & Category
Start with 18 seeds (6 per tier). See Appendix 2 for examples/stubs.

Ensure each scenario has: category, difficulty, acceptance checklist, optional api.

Accepts when: Dropdown shows title + [category] [difficulty]; selecting scenario updates description and acceptance panel (even if empty initially).

A.3 Acceptance Rubrics (Checklists)
Add 3–6 items per scenario. Examples:

“CDN is before Object Store in playback path” (required)

“Cache on read path for metadata lookups” (required)

“Service behind a load balancer” (optional)

“Read replica present for search-only reads” (optional)

Accepts when: After Run, checklist renders ✅/❌ and lists which required items failed.

Workstream B — Onboarding & Tutorial
B.1 First-Run Guided Tutorial (Coachmarks)
Persist state in localStorage("sds-tutorial-complete").

Steps for Spotify: Play Track (example):

Drag Web → CDN → API GW → Service → Redis → Postgres → S3

Connect nodes in this order (coachmark highlights ports)

Click Run

If fail, apply hint (“Add CDN or cache”); re-run to pass

Implementation sketch:

Add app/components/Tutorial.tsx to render a small overlay with step text.

Expose callbacks from the board to notify tutorial when user performs the step.

Accepts when: First visit shows 4-step tutorial and auto-advances; subsequent visits skip unless user resets tutorial in Settings.

B.2 Docs Primer
Route /docs with mini explainers (Scalability, Availability, Caching, CAP, Queues, Search) and ~10 curated links.

Link contextually from failed checks (“Learn about read-through caching → /docs/caching”).

Accepts when: From a failed result, clicking Learn more opens a doc relevant to the failing check.

Workstream C — Simulation Engine Upgrades
Keep the engine simple. Focus on clarity over perfect modeling.

C.1 Replicas
Each Service can have replicas: number (default 1).

Capacity = sum of replica capacities; latency approximated as min(instanceLatency) + LB hop.

Add a small UI to set replicas (Stepper on Selected panel).

C.2 Fan-out / Critical Path
Allow edges that create parallel branches (e.g., Service → Cache and Service → Search Index).

Latency = max of branch latencies (critical path), not sum.

Capacity = min(capacities) across serial segments; for parallel paths that must both succeed, take the bottleneck of the joining point.

C.3 Read/Write Split
A Read Replica node fulfills read capacity if connected from Service for read-only workloads.

Add a property on edges or nodes to mark read path checks (heuristic; for MVP, infer by name: “Read Replica”).

C.4 Backlog Math
If requiredRps > capacityRps: compute backlogGrowthRps = requiredRps - capacityRps.

Show time to drain once capacity meets requirement: backlogSeconds / capacitySurplus.

Accepts when: Adding replicas improves capacity; fan-out only increases latency along the longest branch; backlog numbers appear when overloaded.

Workstream D — Editor UX Polish
Zoom/Pan: react-zoom-pan-pinch; expose +/−/reset control.

Snap to grid (24px): x = round(x/24)*24, y = round(y/24)*24.

Ports on N/E/S/W: choose nearest port to cursor start.

Undo/Redo: lightweight stack for nodes/edges snapshots; shortcuts: Cmd+Z, Shift+Cmd+Z.

Keyboard nudge: arrow keys move selected node by 24px.

Accepts when: Zoom/pan smooth, ports selectable, snapping works, undo/redo reliable across 20 actions, keyboard nudge moves nodes.

Workstream E — API Design Track
Add an API tab to each scenario with optional endpoints table and lint suggestions.

E.1 Schema
Use api?: ApiEndpoint[] from Scenario.

E.2 UI
Create app/components/ScenarioTabs.tsx:

Tabs: Flow (existing) | API

API tab renders a table: Method, Path, Query, Body, Response, Notes.

Add tiny lints:

Path should be noun-based, plural resources.

Pagination params present for list endpoints.

For Search, ensure GET /search?q&limit&offset.

Accepts when: Scenarios with api show API tab; obvious missing endpoints produce friendly lint messages.

Workstream F — Results Panel & Scoring
F.1 Scoring Formula
ini
Copia codice
score = (SLO_pass * 60) + (checklist_pass * 30) + (cost_efficiency * 10)
SLO_pass: 30 for latency pass + 30 for RPS pass.

Checklist: equally weighted required items; optional items add bonus.

Cost: compare sum of costPerHour to scenario soft cap; scale 0–10.

F.2 Render
Show a single score number with breakdown.

Show Outcome Badge: PASS / PARTIAL / FAIL / CHAOS FAIL.

Show acceptance checklist (✅/❌).

Show hints (progressive) after 1st/2nd fail.

Accepts when: Results panel displays score, badges, checklist, hints; users know what to fix.

Workstream G — Authoring Tools
G.1 Scenario Builder (internal)
Route /admin/new-scenario: form with fields matching Scenario (title, category, difficulty, SLOs, flow, acceptance, api).

On submit: produce a JSON/TS block and append to lib/scenarios.ts (or write to lib/scenarios.local.json and merge on build).

G.2 Import/Export
Export: download { nodes, edges, scenarioId, name } as JSON.

Import: upload JSON and load into editor state.

Both alongside your Share feature.

Accepts when: You can create a scenario through the UI and see it in the selector; import/export works round-trip.

Workstream H — Analytics & Error Monitoring
H.1 Analytics Events
scenario_started, run_sim, result (pass|partial|fail|chaos_fail), hint_shown, share_design, fork_design, toggle_theme, tutorial_step.

Send minimal payload (scenarioId, counts).

Example:

ts
Copia codice
// lib/analytics.ts
export const track = (name: string, props?: Record<string, any>) => {
  // @ts-ignore
  if (typeof window !== "undefined" && window.plausible) window.plausible(name, { props });
};
H.2 Sentry
Configure Sentry with DSN; capture exceptions.

Add a test button in dev: “Throw error” → verify in Sentry dashboard.

Accepts when: You can plot runs per scenario and pass rate; a forced throw shows up in Sentry.

Workstream I — SEO, A11y, Legal
SEO: per-route metadata, OG image for landing, sitemap/robots.

A11y: focus rings, ARIA labels on buttons, keyboard nudge, proper color contrast in light/dark.

Legal: Privacy & Terms pages; state analytics (no PII), cookie notice if required.

Accepts when: Lighthouse A11y ≥ 95; SEO meta present; Legal links in footer.

Workstream J — Testing Strategy
J.1 Unit
Engine: replicas math, critical path, backlog.

Checklist evaluator: each rule returns correct boolean.

API lints: basic path/pagination checks.

J.2 Integration (React Testing Library)
Place nodes → connect → run → result shows pass/fail and checklist.

J.3 E2E (Playwright)
Flow: open /play → spawn components → connect → run → ensure score > 0 & badge shown → share → open shared link (read-only) → fork → editable.

Scripts:

jsonc
Copia codice
// package.json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:unit": "vitest run",
    "test": "vitest run && playwright test"
  }
}
Accepts when: CI runs unit + e2e, and a failing e2e turns CI red.

Workstream K — Performance & Deploy
Code split editor on /play: dynamic(() => import(...), { ssr: false }).

Lazy-load zoom/pan lib.

Keep initial JS < ~200KB.

Deploy to Vercel with envs for analytics/Sentry.

Accepts when: Lighthouse Perf ≥ 90, TTI < 2.5s on 4G, no console errors.

Milestones & Definition of Done
Milestone 1 (Content & Tutorial):

Schema with category/difficulty/acceptance/api ✅

12+ scenarios seeded, tagged E/M/H ✅

Tutorial for Spotify Play ✅

Milestone 2 (Engine & UX):

Replicas, fan-out, backlog ✅

Ports N/E/S/W, snap, zoom/pan, undo/redo ✅

Milestone 3 (API & Results):

API tab + lints ✅

Score + checklist + hints ✅

Milestone 4 (Polish & Launch):

Authoring builder + import/export ✅

Analytics events + Sentry ✅

SEO/A11y/Legal ✅

Tests (unit + e2e) green on CI ✅

Deployed to Vercel ✅

Go/No-Go: 3 external testers complete tutorial and pass 2 scenarios without guidance; analytics shows events; no P0 bugs.

Appendix 1 — Component Library Extensions
Add these to your palette with sane defaults (tune later):

Kind Label baseLatencyMs capacityRps failureRate costPerHour
Search Index (Elastic) Search Index 15 6000 0.0015 0.30
Read Replica Read Replica 6 1500 0.001 0.25
Object Cache (Memcached) Memcached 1 20000 0.0015 0.12
Auth Auth Service 10 4000 0.002 0.20
Rate Limiter Rate Limiter 2 15000 0.001 0.15
Stream Processor (Flink) Stream Processor 25 5000 0.002 0.40
Worker Pool Worker 12 3000 0.002 0.20
ID Generator (Snowflake) ID Generator 1 50000 0.0005 0.15
Shard Router Shard Router 2 100000 0.0005 0.08
Tracing/Logging Telemetry 3 40000 0.0008 0.10
Edge Function Edge Function 8 8000 0.002 0.18
Origin Shield (CDN Proxy) CDN Origin Shield 4 50000 0.0008 0.18

Add to your constants:

ts
Copia codice
// lib/components.ts
export const COMPONENT_LIBRARY = [
  // existing…
  { kind: "Search Index (Elastic)", label: "Search Index", baseLatencyMs: 15, capacityRps: 6000, failureRate: 0.0015, costPerHour: 0.30 },
  { kind: "Read Replica", label: "Read Replica", baseLatencyMs: 6, capacityRps: 1500, failureRate: 0.001, costPerHour: 0.25 },
  { kind: "Object Cache (Memcached)", label: "Memcached", baseLatencyMs: 1, capacityRps: 20000, failureRate: 0.0015, costPerHour: 0.12 },
  { kind: "Auth", label: "Auth Service", baseLatencyMs: 10, capacityRps: 4000, failureRate: 0.002, costPerHour: 0.20 },
  { kind: "Rate Limiter", label: "Rate Limiter", baseLatencyMs: 2, capacityRps: 15000, failureRate: 0.001, costPerHour: 0.15 },
  { kind: "Stream Processor (Flink)", label: "Stream Processor", baseLatencyMs: 25, capacityRps: 5000, failureRate: 0.002, costPerHour: 0.40 },
  { kind: "Worker Pool", label: "Worker", baseLatencyMs: 12, capacityRps: 3000, failureRate: 0.002, costPerHour: 0.20 },
  { kind: "ID Generator (Snowflake)", label: "ID Generator", baseLatencyMs: 1, capacityRps: 50000, failureRate: 0.0005, costPerHour: 0.15 },
  { kind: "Shard Router", label: "Shard Router", baseLatencyMs: 2, capacityRps: 100000, failureRate: 0.0005, costPerHour: 0.08 },
  { kind: "Tracing/Logging", label: "Telemetry", baseLatencyMs: 3, capacityRps: 40000, failureRate: 0.0008, costPerHour: 0.10 },
  { kind: "Edge Function", label: "Edge Function", baseLatencyMs: 8, capacityRps: 8000, failureRate: 0.002, costPerHour: 0.18 },
  { kind: "Origin Shield (CDN Proxy)", label: "CDN Origin Shield", baseLatencyMs: 4, capacityRps: 50000, failureRate: 0.0008, costPerHour: 0.18 },
] as const;
Appendix 2 — Example Scenario Seeds (12)
Tip: Use these as stubs; tune SLOs to your engine.

ts
Copia codice
// lib/scenarios.ts (append to SCENARIOS array)
{
  id: "url-shortener",
  title: "URL Shortener",
  description: "Redirect within 100ms P95 at 5k RPS.",
  category: "Caching",
  difficulty: "easy",
  requiredRps: 5000,
  latencyBudgetMsP95: 100,
  flow: [
    { kind: "Web" }, { kind: "CDN", optional: true }, { kind: "API Gateway" },
    { kind: "Service" }, { kind: "Cache (Redis)", optional: true }, { kind: "DB (Postgres)" }
  ],
  acceptance: [
    { id: "cache-present", text: "Cache present on hot slug path", required: true },
    { id: "lb-service", text: "Service behind LB/API GW", required: true },
  ],
  api: [
    { method: "POST", path: "/urls", bodyShape: "{ long_url: string }", responseShape: "{ short: string }" },
    { method: "GET", path: "/:slug", notes: "302 to long URL" }
  ],
  suggestedComponents: ["CDN","Cache (Redis)","DB (Postgres)"], version: "1.0", updatedAt: "2025-09-10"
},
{
  id: "rate-limiter",
  title: "Rate Limiter",
  description: "Enforce 100 req/min per user; keep latency low.",
  category: "Rate Limiting",
  difficulty: "easy",
  requiredRps: 2000,
  latencyBudgetMsP95: 120,
  flow: [
    { kind: "Web" }, { kind: "API Gateway" }, { kind: "Rate Limiter" }, { kind: "Service" }
  ],
  acceptance: [
    { id: "limiter-on-path", text: "Rate limiter on request path before service", required: true }
  ],
  api: [
    { method: "GET", path: "/resource", notes: "Protected by rate limiter" }
  ],
  suggestedComponents: ["Rate Limiter"], version: "1.0", updatedAt: "2025-09-10"
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
    { kind: "Web" }, { kind: "API Gateway" }, { kind: "Service" },
    { kind: "Object Store (S3)" }, { kind: "CDN", optional: true }
  ],
  acceptance: [
    { id: "cdn-on-static", text: "CDN in front of static paste content", required: true },
  ],
  api: [
    { method: "POST", path: "/pastes", bodyShape: "{ text: string }", responseShape: "{ id: string }" },
    { method: "GET", path: "/pastes/:id" }
  ],
  suggestedComponents: ["CDN","Object Store (S3)"], version: "1.0", updatedAt: "2025-09-10"
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
    { kind: "Web" }, { kind: "API Gateway" }, { kind: "Service" }, { kind: "Cache (Redis)" }, { kind: "DB (Postgres)" }
  ],
  acceptance: [
    { id: "redis-zset", text: "In-memory store used for top-N (e.g., Redis)", required: true }
  ],
  api: [
    { method: "GET", path: "/leaderboard?limit&offset" },
    { method: "POST", path: "/score", bodyShape: "{ user_id, delta }" }
  ],
  suggestedComponents: ["Cache (Redis)"], version: "1.0", updatedAt: "2025-09-10"
},
{
  id: "cdn-design",
  title: "CDN Design",
  description: "Serve static globally with P95 < 80ms at 8k RPS.",
  category: "Streaming",
  difficulty: "easy",
  requiredRps: 8000,
  latencyBudgetMsP95: 80,
  flow: [{ kind: "Web" }, { kind: "CDN" }, { kind: "Object Store (S3)" }],
  acceptance: [
    { id: "cdn-before-origin", text: "CDN sits in front of object store", required: true },
    { id: "origin-shield", text: "Origin shield/proxy layer added", required: false }
  ],
  api: [],
  suggestedComponents: ["CDN","Origin Shield (CDN Proxy)"], version: "1.0", updatedAt: "2025-09-10"
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
    { kind: "Web" }, { kind: "API Gateway" }, { kind: "Service" },
    { kind: "Message Queue (Kafka Topic)" }, { kind: "Worker Pool" }
  ],
  acceptance: [
    { id: "dlq", text: "Dead-letter path exists for failed deliveries", required: true }
  ],
  api: [
    { method: "POST", path: "/events", bodyShape: "{ type, payload }" }
  ],
  suggestedComponents: ["Worker Pool","Message Queue (Kafka Topic)"], version: "1.0", updatedAt: "2025-09-10"
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
    { kind: "Web" }, { kind: "API Gateway" }, { kind: "Service" }, { kind: "Search Index (Elastic)" }
  ],
  acceptance: [
    { id: "search-index", text: "Dedicated search index in path", required: true }
  ],
  api: [
    { method: "GET", path: "/search?q&limit&offset" }
  ],
  suggestedComponents: ["Search Index (Elastic)"], version: "1.0", updatedAt: "2025-09-10"
},
{
  id: "realtime-notifications",
  title: "Realtime Notifications",
  description: "Fan-out to online users with low latency.",
  category: "Realtime",
  difficulty: "medium",
  requiredRps: 4000,
  latencyBudgetMsP95: 150,
  flow: [
    { kind: "Web" }, { kind: "API Gateway" }, { kind: "Service" },
    { kind: "Message Queue (Kafka Topic)" }, { kind: "Stream Processor (Flink)" }
  ],
  acceptance: [
    { id: "fanout", text: "Fan-out via MQ/stream processor", required: true }
  ],
  api: [],
  suggestedComponents: ["Message Queue (Kafka Topic)","Stream Processor (Flink)"], version: "1.0", updatedAt: "2025-09-10"
},
{
  id: "ecommerce-cart",
  title: "E-commerce Cart",
  description: "Low latency reads/writes, prevent lost updates.",
  category: "Storage",
  difficulty: "medium",
  requiredRps: 3000,
  latencyBudgetMsP95: 120,
  flow: [
    { kind: "Web" }, { kind: "API Gateway" }, { kind: "Service" }, { kind: "Cache (Redis)" }, { kind: "DB (Postgres)" }
  ],
  acceptance: [
    { id: "cache-writeback", text: "Cache strategy avoids stale carts", required: false }
  ],
  api: [
    { method: "GET", path: "/cart?user_id" },
    { method: "POST", path: "/cart/add", bodyShape: "{ sku, qty }" }
  ],
  suggestedComponents: ["Cache (Redis)","DB (Postgres)"], version: "1.0", updatedAt: "2025-09-10"
},
{
  id: "spotify-search",
  title: "Spotify: Search Catalog",
  description: "Handle search bursts quickly; minimize DB hits.",
  category: "Search",
  difficulty: "medium",
  requiredRps: 1500,
  latencyBudgetMsP95: 300,
  flow: [
    { kind: "Web" }, { kind: "API Gateway" }, { kind: "Service" },
    { kind: "Cache (Redis)", optional: true }, { kind: "DB (Postgres)" }
  ],
  acceptance: [
    { id: "cache-on-read", text: "Cache in front of DB for hot queries", required: true }
  ],
  api: [{ method: "GET", path: "/search?q&limit&offset" }],
  suggestedComponents: ["Cache (Redis)","DB (Postgres)"], version: "1.0", updatedAt: "2025-09-10"
},
{
  id: "spotify-play",
  title: "Spotify: Play a Track",
  description: "Serve playback within 200ms P95; DB not bottleneck.",
  category: "Streaming",
  difficulty: "hard",
  requiredRps: 2000,
  latencyBudgetMsP95: 200,
  flow: [
    { kind: "Web" }, { kind: "CDN", optional: true }, { kind: "API Gateway" },
    { kind: "Load Balancer", optional: true }, { kind: "Service" },
    { kind: "Cache (Redis)", optional: true }, { kind: "DB (Postgres)" },
    { kind: "Object Store (S3)", optional: true }
  ],
  acceptance: [
    { id: "cdn-before-s3", text: "CDN sits before Object Store on media path", required: true },
    { id: "db-not-media-hotpath", text: "DB not required for streaming every request", required: true }
  ],
  api: [{ method: "GET", path: "/stream/:song_id" }],
  suggestedComponents: ["CDN","Object Store (S3)","Cache (Redis)"], version: "1.0", updatedAt: "2025-09-10"
},
{
  id: "distributed-crawler",
  title: "Distributed Crawler",
  description: "High throughput fetching with politeness and dedupe.",
  category: "Batch",
  difficulty: "hard",
  requiredRps: 5000,
  latencyBudgetMsP95: 500,
  flow: [
    { kind: "Web" }, { kind: "API Gateway" }, { kind: "Service" },
    { kind: "Message Queue (Kafka Topic)" }, { kind: "Worker Pool" }, { kind: "DB (Postgres)" }
  ],
  acceptance: [
    { id: "dedupe", text: "URL dedupe present (ID generator/shard router)", required: true }
  ],
  api: [],
  suggestedComponents: ["Worker Pool","Shard Router","ID Generator (Snowflake)"], version: "1.0", updatedAt: "2025-09-10"
}
Appendix 3 — Utility Snippets
A3.1 Deterministic RNG
ts
Copia codice
// lib/rng.ts
export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
Use in simulate:

ts
Copia codice
// app/components/SystemDesignSandbox.tsx
import { mulberry32 } from "@/lib/rng";
const seed = 42; // or Date.now()
const rng = mulberry32(seed);
const r = simulate(scenario, pathNodeIds, nodes, edges, chaosMode, rng);
A3.2 Evaluate Checklist
ts
Copia codice
// lib/evaluate.ts
import type { Scenario } from "@/lib/scenarios";
import type { PlacedNode, Edge } from "@/app/components/SystemDesignSandbox";

export function evaluateScenario(s: Scenario, pathIds: string[], nodes: PlacedNode[], edges: Edge[]) {
  const textPath = pathIds.map(id => {
    const n = nodes.find(n => n.id === id);
    return n?.spec.kind || id;
  }).join(">");

  const results: Record<string, boolean> = {};

  for (const c of s.acceptance ?? []) {
    switch (c.id) {
      case "cdn-before-s3":
        results[c.id] = /CDN.*Object Store \(S3\)/.test(textPath);
        break;
      case "cache-on-read":
        results[c.id] = textPath.includes("Cache (Redis)") || textPath.includes("Memcached");
        break;
      case "db-not-media-hotpath":
        results[c.id] = !/Object Store \(S3\)>.*DB \(Postgres\)/.test(textPath);
        break;
      default:
        results[c.id] = false; // default false; extend switch with more rules
    }
  }
  return results;
}
A3.3 API Tab Lints (simple)
ts
Copia codice
// lib/apiLint.ts
import type { Scenario } from "@/lib/scenarios";

export function lintApi(s: Scenario) {
  const msgs: string[] = [];
  if (!s.api || s.api.length === 0) return msgs;

  for (const ep of s.api) {
    if (!ep.path.startsWith("/")) msgs.push(`Path "${ep.path}" should start with "/".`);
    if (ep.method === "GET" && ep.path.includes("/search") && !ep.query?.includes("q")) {
      msgs.push(`Search endpoint "${ep.path}" should include query param "q".`);
    }
    if (ep.path.endsWith("/")) msgs.push(`Avoid trailing slash in "${ep.path}".`);
  }
  return msgs;
}
A3.4 Share/Fork (URL hash)
ts
Copia codice
// lib/shareLink.ts
import { deflate, inflate } from "pako";
export function encodeDesign(obj: unknown) {
  const json = JSON.stringify(obj);
  const bytes = deflate(json);
  return btoa(String.fromCharCode(...bytes)).replace(/=+$/, "");
}
export function decodeDesign(str: string) {
  const bin = atob(str);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  const json = inflate(bytes, { to: "string" }) as string;
  return JSON.parse(json);
}
Use:

ts
Copia codice
const data = { nodes, edges, scenarioId };
const url = `${location.origin}${location.pathname}#d=${encodeDesign(data)}`;
Final Notes
Start with Milestone 1 (content + tutorial): fastest learning ROI.

Keep the engine understandable; avoid over-modeling.

The checklist + score + hints are what make this feel like a real “school.”

Once launch-ready, post in 3–5 communities and instrument funnels.

Good luck — ship it!

makefile
Copia codice
::contentReference[oaicite:0]{index=0}
