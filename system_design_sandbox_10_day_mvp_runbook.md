# System Design Sandbox — 10‑Day MVP Runbook

A copy‑paste daily plan with exact commands, files to create, code snippets, and acceptance checks.

> Assumptions
>
> - Project root: `~/system-design-sandbox` (Next.js App Router + Tailwind, npm)
> - Your main editor component lives at `app/components/SystemDesignSandbox.tsx` (as we set up)
> - Node ≥ 18

---

## Day 1 — Repo & Quality Gates

### 1) Install tooling

```bash
cd ~/system-design-sandbox
npm i -D vitest @testing-library/react @testing-library/jest-dom ts-node prettier
```

### 2) Add scripts to `package.json`

Add under the top‑level `"scripts"` key:

```jsonc
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "next lint"
  }
}
```

### 3) Prettier config

Create `.prettierrc.json`:

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### 4) Vitest setup

Create `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom";
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["__tests__/**/*.{test,spec}.ts?(x)"]
  }
});
```

### 5) Example failing test (to verify CI goes red)

Create `__tests__/sanity.test.ts`:

```ts
describe("sanity", () => {
  it("should fail (delete after verifying CI)", () => {
    expect(1 + 1).toBe(3); // ← intentional failure
  });
});
```

### 6) GitHub Actions CI

Create `.github/workflows/ci.yml`:

```yaml
name: ci
on:
  pull_request:
    branches: [ main ]
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint --if-present
      - run: npm run test
      - run: npm run build
```

### 7) Commit & PR

```bash
git checkout -b chore/ci-and-quality-gates
git add -A
git commit -m "chore: add vitest, prettier, CI; failing sanity test"
git push -u origin chore/ci-and-quality-gates
```

Open PR on GitHub — CI **must fail**.

**ACCEPTS WHEN**: A PR with the failing test turns CI **red**. Then remove the failing test and ensure CI is **green**.

---

## Day 2 — Scenario Schema & Seed Content

### 1) Create scenario types & seeds

Create `lib/scenarios.ts`:

```ts
export type FlowStep = { kind: string; optional?: boolean };
export type Scenario = {
  id: string;
  title: string;
  description: string;
  requiredRps: number;
  latencyBudgetMsP95: number;
  flow: FlowStep[];
  hints?: string[];
};

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
    hints: ["Add CDN for static media.", "Warm cache to avoid DB on read path."]
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
    hints: ["Add Redis in front of DB.", "Consider read replicas or indexes."]
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
    hints: ["Cache hot slugs.", "Use read‑through cache to reduce DB hits."]
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
    hints: ["Token bucket in Redis.", "Avoid DB writes on hot path."]
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
    hints: ["Put CDN in front of object storage.", "Tune TTLs and cache keys."]
  }
];
```

### 2) Wire the seeds into the editor

- Open `app/components/SystemDesignSandbox.tsx`
- **Remove** the inline `SCENARIOS` constant and **import** the new one:

```ts
import { SCENARIOS, type Scenario, type FlowStep } from "@/lib/scenarios";
```

> If you don’t have the `@/` alias: use `../../lib/scenarios` or enable the default Next alias in `tsconfig.json` (`"baseUrl": "."`).

### 3) Commit

```bash
git checkout -b feat/scenarios-seeds
git add lib/scenarios.ts app/components/SystemDesignSandbox.tsx tsconfig.json
git commit -m "feat: scenario schema + 5 seed scenarios"
git push -u origin feat/scenarios-seeds
```

**ACCEPTS WHEN**: The dropdown shows **5 scenarios** and clicking **Run** evaluates each without errors.

---

## Day 3 — Deterministic Chaos + Unit Tests

### 1) Seedable RNG

Create `lib/rng.ts`:

```ts
export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

### 2) Allow `simulate` to receive an RNG

In `app/components/SystemDesignSandbox.tsx`, change your Chaos usage:

```ts
import { mulberry32 } from "@/lib/rng";

// inside runSimulation
const seed = 12345; // could be Date.now() or scenario.id hash
const rng = mulberry32(seed);
const r = simulate(scenario, nodeIds, nodes, edges, chaosMode, rng);
```

Update simulate signature & call sites:

```ts
function simulate(
  scenario: Scenario,
  pathNodeIds: NodeId[],
  nodes: PlacedNode[],
  edges: Edge[],
  chaos: boolean,
  rng: () => number = Math.random
) {
  // ... inside loop
  if (chaos && rng() < n.spec.failureRate) {
    failedByChaos = true;
  }
}
```

### 3) Tests

Create `__tests__/simulate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { SCENARIOS } from "@/lib/scenarios";

// Minimal stubs mirroring your types
import type { PlacedNode, Edge } from "@/app/components/SystemDesignSandbox"; // adjust if types are exported elsewhere

const node = (id: string, baseLatencyMs: number, cap: number) => ({
  id,
  spec: { kind: id, label: id, baseLatencyMs, capacityRps: cap, failureRate: 0, costPerHour: 0 },
  x: 0, y: 0,
}) as unknown as PlacedNode;

const path = (ids: string[]) => ids;

// NOTE: import your real findScenarioPath / simulate if exported.

describe("simulate", () => {
  it("DB is bottleneck for spotify-search", () => {
    const s = SCENARIOS.find((x) => x.id === "spotify-search")!;
    const nodes = [
      node("Web", 10, 20000),
      node("API Gateway", 8, 8000),
      node("Service", 12, 3000),
      node("DB (Postgres)", 4, 1200),
    ];
    const edges: Edge[] = [
      { id: "e1", from: "Web", to: "API Gateway", linkLatencyMs: 10 },
      { id: "e2", from: "API Gateway", to: "Service", linkLatencyMs: 10 },
      { id: "e3", from: "Service", to: "DB (Postgres)", linkLatencyMs: 10 },
    ] as any;

    // use your real findScenarioPath here if available
    const pathNodeIds = ["Web", "API Gateway", "Service", "DB (Postgres)"];

    // call your real simulate with deterministic rng
    const { simulate } = require("@/app/components/SystemDesignSandbox");
    const { mulberry32 } = require("@/lib/rng");
    const rng = mulberry32(42);
    const r = simulate(s, pathNodeIds, nodes, edges, false, rng);

    expect(r.capacityRps).toBe(1200);
    expect(r.meetsRps).toBe(false);
    expect(r.meetsLatency).toBe(true);
  });
});
```

> If `simulate`/types aren’t exported, export them from your component file or move the pure functions to `lib/sim.ts` and import from both places.

### 4) Commit

```bash
git checkout -b feat/deterministic-chaos-tests
git add -A
git commit -m "feat: seedable chaos + unit tests for simulate"
git push -u origin feat/deterministic-chaos-tests
```

**ACCEPTS WHEN**: `npm test` is green and results are identical across runs with the same seed.

---

## Day 4 — Build UX: Zoom/Pan, Snap, Better Ports, Undo/Redo

### 1) Install zoom/pan

```bash
npm i react-zoom-pan-pinch
```

Wrap your **board** content with `<TransformWrapper><TransformComponent>…</TransformComponent></TransformWrapper>` and expose controls (+/–/reset).

### 2) Snap to grid (24px)

- When dragging nodes, round `x`/`y` to nearest multiple of 24 before updating state.

```ts
const snap = (v: number) => Math.round(v / 24) * 24;
// on drag: { ...n, x: snap(x), y: snap(y) }
```

### 3) Ports on N/E/S/W

- Add 4 small port elements per node; choose the one closest to the pointer as the link source.
- Compute port world coords and use those in the ghost line.

### 4) Undo/Redo

Create `lib/undo.ts` with a tiny stack (arrays of `nodes`/`edges` snapshots). Hook into `node_move`, `node_add`, `edge_add`, `delete` actions.
Add shortcuts: `Cmd+Z` / `Shift+Cmd+Z`.

**ACCEPTS WHEN**: You can zoom, pan, snap to grid, connect from any side, and undo/redo 20 steps reliably.

---

## Day 5 — Share & Fork (No Backend)

### 1) Install compression util

```bash
npm i pako
```

### 2) Create `lib/shareLink.ts`

```ts
import { deflate, inflate } from "pako";

export function encodeDesign(obj: unknown) {
  const json = JSON.stringify(obj);
  const bytes = deflate(json);
  return btoa(String.fromCharCode(...bytes)).replace(/=+$/, "");
}

export function decodeDesign(str: string) {
  const bin = atob(str);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const json = inflate(bytes, { to: "string" }) as string;
  return JSON.parse(json);
}
```

### 3) Add Share/Fork UI

- Add **Share** button → `location.hash = "#d=" + encodeDesign({ nodes, edges, scenarioId })` and show a copied URL.
- On load, if `location.hash` contains `d=...`, parse into a **read‑only view** with a **Fork** button that restores state and switches back to edit.

**ACCEPTS WHEN**: Opening a shared link shows the exact board. Clicking **Fork** lets you edit a copy.

---

## Day 6 — Hints & Outcomes

### 1) Use `hints` from scenarios

- Show one hint after first fail, two after second, etc. Persist attempt count per `scenarioId` in `localStorage`.

### 2) Outcome states

- `pass` (both met), `partial` (one met), `fail` (none), `chaos_fail` (any node failed). Display with distinct badges/colors.

**ACCEPTS WHEN**: Failing the same scenario twice reveals more guidance; outcomes are visually distinct.

---

## Day 7 — Analytics & Errors

### 1) Analytics (Plausible – simple)

Add to `app/layout.tsx`:

```tsx
import Script from "next/script";
// inside <body> or <head>
<Script defer data-domain="YOUR_DOMAIN" src="https://plausible.io/js/script.js" />
```

Create `lib/analytics.ts`:

```ts
export const track = (name: string, props?: Record<string, any>) => {
  // @ts-ignore
  if (typeof window !== "undefined" && window.plausible) window.plausible(name, { props });
};
```

Call `track("run_sim", { scenarioId, nodeCount: nodes.length, edgeCount: edges.length })` etc.

### 2) Sentry (errors)

```bash
npm i @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Follow wizard; it will add DSN env var and wrap the app.

**ACCEPTS WHEN**: You see events for `run_sim`, `pass/fail`, `share`, `fork` in analytics, and a forced throw shows up in Sentry.

---

## Day 8 — Landing & Docs

### 1) Routes

- Keep editor at `/play` (move your component into `app/play/page.tsx`).
- Build a marketing page at `/` with: Hero, “Try the Sandbox” CTA (to `/play`), “How it works”, and “Scenarios”.

### 2) Docs page `/docs`

- Short guide on how to read results + links to background reading (curate 10 crisp links).

**ACCEPTS WHEN**: A cold user understands and reaches `/play` within 10s; docs link answers “why did I fail?”.

---

## Day 9 — Deploy & Perf

### 1) Vercel

```bash
npm run build
# then push main; connect repo to vercel.com and deploy
```

Set envs (Plausible/Sentry) in Vercel dashboard.

### 2) Performance

- `dynamic(() => import("@/app/components/SystemDesignSandbox"), { ssr: false })` on `/play` to reduce TTFB.
- Lighthouse ≥ 90; JS < 200KB initial. Remove unused libs; lazy‑load zoom.

**ACCEPTS WHEN**: Live URL loads in < 2.5s on 4G; no console errors.

---

## Day 10 — Playtest & Iterate

### 1) Feedback loop

- Add a `Feedback` button linking to a short form (Tally/Google Forms) or `/feedback` route with an email mailto.
- Ask testers to design **Spotify Play** and **URL Shortener**; time to pass; where they got stuck.

### 2) Fixes & backlog

- Turn the top 5 issues into tickets for v2 (multi‑path, replicas, queueing, scenario builder, auth).

**ACCEPTS WHEN**: You have 5–10 tester sessions, a list of friction points, and a prioritized v2 backlog.

---

## Daily “Prompt to Execute” (copy this into your notes each morning)

### Day 1 Quick Tasks — Repo & Quality Gates

- Install: `vitest @testing-library/react @testing-library/jest-dom ts-node prettier`
- Add scripts (`typecheck`, `test`, `format`, `lint`)
- Add Prettier config
- Add Vitest config + failing sanity test
- Add GitHub Actions CI (typecheck, lint, test, build)
- Open PR → CI red → delete failing test → CI green

### Day 2 Quick Tasks — Scenario Schema & Seeds

- Create `lib/scenarios.ts` with types + 5 seed scenarios
- Import scenarios in editor; remove inline constant
- Verify dropdown shows 5; `Run` works for each

### Day 3 Quick Tasks — Deterministic Chaos + Tests

- Add `mulberry32` RNG; feed into `simulate`
- Export/move pure functions for testing
- Write tests for bottleneck/latency and missing components

### Day 4 Quick Tasks — UX Build

- Add zoom/pan; snap to 24px
- Ports on N/E/S/W; link snaps to nearest port
- Undo/redo stacks + keyboard shortcuts

### Day 5 Quick Tasks — Share & Fork

- Add `encodeDesign` / `decodeDesign`
- Implement `Share` (URL hash) and `Fork` (restore to editor)

### Day 6 Quick Tasks — Hints & Outcomes

- Progressive hints per scenario via attempts in localStorage
- Outcome badges: pass, partial, fail, chaos_fail

### Day 7 Quick Tasks — Analytics & Sentry

- Track core events (run, result, share, fork)
- Sentry DSN; verify an error is captured

### Day 8 Quick Tasks — Landing & Docs

- Marketing page `/` + CTA → `/play`
- Docs `/docs` with 10 curated links

### Day 9 Quick Tasks — Deploy & Perf

- Vercel deploy
- Code‑split editor; Lighthouse ≥ 90; fast cold load

### Day 10 Quick Tasks — Playtest & Iterate

- 5–10 testers; gather pain points
- Prioritize v2 backlog
