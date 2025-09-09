import { describe, it, expect } from "vitest";
import { SCENARIOS } from "@/lib/scenarios";
import type { PlacedNode, Edge, ComponentSpec } from "@/app/components/types";
import { simulate } from "@/app/components/simulation";
import { mulberry32 } from "@/lib/rng";

const makeSpec = (kind: ComponentSpec["kind"], baseLatencyMs: number, capacityRps: number): ComponentSpec => ({
  kind,
  label: kind,
  baseLatencyMs,
  capacityRps,
  failureRate: 0,
  costPerHour: 0,
});

const node = (id: string, baseLatencyMs: number, cap: number) => ({
  id,
  spec: makeSpec(id as any, baseLatencyMs, cap),
  x: 0,
  y: 0,
}) as unknown as PlacedNode;

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
    ] as any;

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


