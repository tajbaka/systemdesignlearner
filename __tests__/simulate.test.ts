import { describe, it, expect } from "vitest";
import { SCENARIOS } from "@/lib/scenarios";
import type { PlacedNode, Edge, ComponentSpec } from "@/app/components/types";
import { simulate } from "@/app/components/simulation";
import { mulberry32 } from "@/lib/rng";
import { snapToGrid, findScenarioPath } from "@/app/components/utils";

const makeSpec = (kind: ComponentSpec["kind"], baseLatencyMs: number, capacityRps: number): ComponentSpec => ({
  kind,
  label: kind,
  baseLatencyMs,
  capacityRps,
  failureRate: 0,
  costPerHour: 0,
});

const node = (kind: ComponentSpec["kind"], baseLatencyMs: number, cap: number): PlacedNode => ({
  id: kind,
  spec: makeSpec(kind, baseLatencyMs, cap),
  x: 0,
  y: 0,
});

const nodeWithId = (
  id: string,
  kind: ComponentSpec["kind"],
  baseLatencyMs: number,
  cap: number
): PlacedNode => ({
  id,
  spec: makeSpec(kind, baseLatencyMs, cap),
  x: 0,
  y: 0,
});

describe("simulate", () => {
  it("DB is bottleneck for spotify-search and results are deterministic", () => {
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
    ];

    const pathNodeIds = ["Web", "API Gateway", "Service", "DB (Postgres)"];

    const rng = mulberry32(42);
    const r1 = simulate(s, pathNodeIds, nodes, edges, false, rng);
    const rng2 = mulberry32(42);
    const r2 = simulate(s, pathNodeIds, nodes, edges, false, rng2);

    expect(r1.capacityRps).toBe(1200);
    expect(r1.meetsRps).toBe(false);
    expect(r1.meetsLatency).toBe(true);
    expect(r1).toEqual(r2);
  });
});

describe("utils", () => {
  it("snapToGrid snaps to 24px increments", () => {
    expect(snapToGrid(0)).toBe(0);
    expect(snapToGrid(11)).toBe(0);
    expect(snapToGrid(12)).toBe(24);
    expect(snapToGrid(23)).toBe(24);
    expect(snapToGrid(25)).toBe(24);
    expect(snapToGrid(36)).toBe(48);
  });

  it("findScenarioPath backtracks when an early choice dead-ends", () => {
    const scenario = SCENARIOS.find((s) => s.id === "spotify-search")!;
    const nodes: PlacedNode[] = [
      nodeWithId("web", "Web", 10, 20000),
      nodeWithId("api-dead", "API Gateway", 8, 8000),
      nodeWithId("api-good", "API Gateway", 8, 8000),
      nodeWithId("svc-dead", "Service", 12, 3000),
      nodeWithId("svc-good", "Service", 12, 3000),
      nodeWithId("db-main", "DB (Postgres)", 4, 1200),
    ];

    const edges: Edge[] = [
      { id: "e1", from: "web", to: "api-dead", linkLatencyMs: 10 },
      { id: "e2", from: "web", to: "api-good", linkLatencyMs: 10 },
      { id: "e3", from: "api-dead", to: "svc-dead", linkLatencyMs: 10 },
      { id: "e4", from: "api-good", to: "svc-good", linkLatencyMs: 10 },
      { id: "e5", from: "svc-good", to: "db-main", linkLatencyMs: 10 },
    ];

    const result = findScenarioPath(scenario, nodes, edges);
    expect(result.missingKinds).toEqual([]);
    expect(result.nodeIds).toEqual(["web", "api-good", "svc-good", "db-main"]);
  });
});
