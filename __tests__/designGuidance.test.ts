import { describe, it, expect, beforeAll } from "vitest";
import { evaluateDesignGuidance } from "@/lib/practice/designGuidance";
import { loadScenarioReference } from "@/lib/practice/loader";
import type { PracticeDesignState } from "@/lib/practice/types";
import { COMPONENT_LIBRARY } from "@/app/components/data";
import type { ComponentKind } from "@/app/components/types";

const specFor = (kind: ComponentKind) => {
  const spec = COMPONENT_LIBRARY.find((c) => c.kind === kind);
  if (!spec) throw new Error(`Unknown kind: ${kind}`);
  return spec;
};

// Helper to create a design state
const makeDesign = (
  nodeKinds: ComponentKind[],
  connections: [ComponentKind, ComponentKind][] = [],
  customLabels: Record<string, string> = {}
): PracticeDesignState => {
  const nodes = nodeKinds.map((kind, i) => ({
    id: `node-${i}-${kind}`,
    spec: specFor(kind),
    x: i * 100,
    y: 0,
    replicas: 1,
    customLabel: customLabels[kind],
  }));

  const edges = connections.map(([from, to], i) => {
    const fromNode = nodes.find((n) => n.spec.kind === from);
    const toNode = nodes.find((n) => n.spec.kind === to);
    if (!fromNode || !toNode) throw new Error(`Cannot find nodes for ${from} -> ${to}`);
    return {
      id: `edge-${i}`,
      from: fromNode.id,
      to: toNode.id,
      linkLatencyMs: 10,
    };
  });

  return {
    nodes,
    edges,
    guidedStepIndex: 0,
    guidedCompleted: false,
    guidedDismissed: false,
    freeModeUnlocked: false,
    redirectMode: "302",
  };
};

describe("evaluateDesignGuidance", () => {
  // Preload the scenario reference before tests
  beforeAll(async () => {
    await loadScenarioReference("url-shortener");
  });

  it("prompts to add Web when empty design", () => {
    const design = makeDesign([]);
    const guidance = evaluateDesignGuidance(design, "url-shortener");

    expect(guidance).not.toBeNull();
    expect(guidance?.id).toBe("add-web");
    expect(guidance?.level).toBe("core");
  });

  it("prompts to add API Gateway after Web is added", () => {
    const design = makeDesign(["Web"]);
    const guidance = evaluateDesignGuidance(design, "url-shortener");

    expect(guidance?.id).toBe("add-api-gateway");
    expect(guidance?.level).toBe("core");
  });

  it("prompts to connect Web to API Gateway", () => {
    const design = makeDesign(["Web", "API Gateway"]);
    const guidance = evaluateDesignGuidance(design, "url-shortener");

    expect(guidance?.id).toBe("connect-web-api");
    expect(guidance?.level).toBe("core");
  });

  it("prompts to add Service after Web -> API Gateway connected", () => {
    const design = makeDesign(["Web", "API Gateway"], [["Web", "API Gateway"]]);
    const guidance = evaluateDesignGuidance(design, "url-shortener");

    expect(guidance?.id).toBe("add-service");
  });

  it("prompts to connect API Gateway to Service", () => {
    const design = makeDesign(["Web", "API Gateway", "Service"], [["Web", "API Gateway"]]);
    const guidance = evaluateDesignGuidance(design, "url-shortener");

    expect(guidance?.id).toBe("connect-api-service");
  });

  it("prompts to add database after Service connected", () => {
    const design = makeDesign(
      ["Web", "API Gateway", "Service"],
      [
        ["Web", "API Gateway"],
        ["API Gateway", "Service"],
      ]
    );
    const guidance = evaluateDesignGuidance(design, "url-shortener");

    expect(guidance?.id).toBe("add-database");
  });

  it("prompts to connect Service to DB", () => {
    const design = makeDesign(
      ["Web", "API Gateway", "Service", "DB (Postgres)"],
      [
        ["Web", "API Gateway"],
        ["API Gateway", "Service"],
      ]
    );
    const guidance = evaluateDesignGuidance(design, "url-shortener");

    expect(guidance?.id).toBe("connect-service-db");
  });

  it("prompts for bonus: second service after core complete", () => {
    const design = makeDesign(
      ["Web", "API Gateway", "Service", "DB (Postgres)"],
      [
        ["Web", "API Gateway"],
        ["API Gateway", "Service"],
        ["Service", "DB (Postgres)"],
      ]
    );
    const guidance = evaluateDesignGuidance(design, "url-shortener");

    expect(guidance?.id).toBe("add-second-service");
    expect(guidance?.level).toBe("bonus");
  });

  it("prompts for cache after second service added", () => {
    // Need to manually create design with two services
    const nodes = [
      { id: "web", spec: specFor("Web"), x: 0, y: 0, replicas: 1 },
      { id: "api", spec: specFor("API Gateway"), x: 100, y: 0, replicas: 1 },
      { id: "svc1", spec: specFor("Service"), x: 200, y: 0, replicas: 1 },
      { id: "svc2", spec: specFor("Service"), x: 200, y: 100, replicas: 1 },
      { id: "db", spec: specFor("DB (Postgres)"), x: 300, y: 0, replicas: 1 },
    ];
    const edges = [
      { id: "e1", from: "web", to: "api", linkLatencyMs: 10 },
      { id: "e2", from: "api", to: "svc1", linkLatencyMs: 10 },
      { id: "e3", from: "svc1", to: "db", linkLatencyMs: 10 },
    ];
    const design: PracticeDesignState = {
      nodes,
      edges,
      guidedStepIndex: 0,
      guidedCompleted: false,
      guidedDismissed: false,
      freeModeUnlocked: false,
      redirectMode: "302",
    };

    const guidance = evaluateDesignGuidance(design, "url-shortener");
    expect(guidance?.id).toBe("add-cache");
  });

  it("returns null when all rules pass", () => {
    // Full design with all components, connections, and labels
    const nodes = [
      { id: "web", spec: specFor("Web"), x: 0, y: 0, replicas: 1 },
      { id: "api", spec: specFor("API Gateway"), x: 100, y: 0, replicas: 1 },
      { id: "svc1", spec: specFor("Service"), x: 200, y: 0, replicas: 1, customLabel: "Shorten" },
      {
        id: "svc2",
        spec: specFor("Service"),
        x: 200,
        y: 100,
        replicas: 1,
        customLabel: "Redirect",
      },
      { id: "cache", spec: specFor("Cache (Redis)"), x: 300, y: 50, replicas: 1 },
      { id: "db", spec: specFor("DB (Postgres)"), x: 400, y: 0, replicas: 1 },
    ];
    const edges = [
      { id: "e1", from: "web", to: "api", linkLatencyMs: 10 },
      { id: "e2", from: "api", to: "svc1", linkLatencyMs: 10 },
      { id: "e3", from: "svc1", to: "db", linkLatencyMs: 10 },
      { id: "e4", from: "svc2", to: "cache", linkLatencyMs: 10 },
      { id: "e5", from: "svc2", to: "db", linkLatencyMs: 10 },
    ];
    const design: PracticeDesignState = {
      nodes,
      edges,
      guidedStepIndex: 0,
      guidedCompleted: false,
      guidedDismissed: false,
      freeModeUnlocked: false,
      redirectMode: "302",
    };

    const guidance = evaluateDesignGuidance(design, "url-shortener");
    expect(guidance).toBeNull();
  });
});
