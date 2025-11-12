import type {
  ComponentKind,
  PlacedNode,
  Edge,
} from "@/app/components/types";
import { COMPONENT_LIBRARY } from "@/app/components/data";
import type {
  HighLevelChoice,
  LowLevel,
  PracticeState,
  PracticeDesignState,
  PracticeRunState,
  Requirements,
  PracticeApiDefinitionState,
} from "./types";

export const FUNCTIONAL_TOGGLES = [
  {
    id: "create-short-url",
    label: "Create short URL",
    description: "Generate short links via API/UI",
    default: true,
  },
  {
    id: "redirect-by-slug",
    label: "Redirect by slug",
    description: "Resolve slug to destination",
    default: true,
  },
  {
    id: "custom-alias",
    label: "Custom alias",
    description: "Allow requester to choose slug",
    default: false,
  },
  {
    id: "basic-analytics",
    label: "Basic click analytics",
    description: "Track total clicks and last seen",
    default: false,
  },
  {
    id: "rate-limiting",
    label: "Rate limiting",
    description: "Throttle abusive clients",
    default: false,
  },
  {
    id: "admin-delete",
    label: "Admin delete",
    description: "Admin can revoke short links",
    default: false,
  },
] as const;

export const makeDefaultRequirements = (): Requirements => ({
  functionalSummary: "",
  functional: FUNCTIONAL_TOGGLES.reduce<Requirements["functional"]>((acc, toggle) => {
    acc[toggle.id] = toggle.default;
    return acc;
  }, {}),
  nonFunctional: {
    readRps: 0,
    writeRps: 0,
    p95RedirectMs: 0,
    rateLimitNotes: "",
    availability: "99.9",
    notes: "",
  },
});

export const PRESET_CHOICES: HighLevelChoice[] = [
  {
    presetId: "db_only",
    components: ["Web", "Service", "DB (Postgres)"],
    notes: ["Fast to ship but DB handles every redirect.", "Add read replicas later if traffic climbs."],
  },
  {
    presetId: "cache_primary",
    components: ["Web", "API Gateway", "Service", "Cache (Redis)", "DB (Postgres)"],
    notes: [
      "Redirect path MUST hit cache; DB only on miss.",
      "Write-through: on create, write DB then invalidate or warm cache.",
      "Optional CDN for redirect endpoint if edge needed.",
    ],
  },
  {
    presetId: "global_edge_cache",
    components: ["Web", "Edge Worker", "Service", "Cache (Redis)", "DB (Postgres)"],
    notes: [
      "More complex; use when latency budget is extremely tight.",
      "Requires global invalidation and key propagation.",
    ],
  },
];

export const URL_SCHEMA = `{
  "$schema":"https://json-schema.org/draft/2020-12/schema",
  "title":"Url","type":"object","required":["slug","long_url","created_at"],
  "properties":{"slug":{"type":"string"},"long_url":{"type":"string","format":"uri"},"created_at":{"type":"string","format":"date-time"},"ttl":{"type":"integer","minimum":0},"owner_id":{"type":"string"}}
}`;

export const CLICK_SCHEMA = `{
  "$schema":"https://json-schema.org/draft/2020-12/schema",
  "title":"ClickEvent","type":"object","required":["slug","ts"],
  "properties":{"slug":{"type":"string"},"ts":{"type":"string","format":"date-time"},"ua":{"type":"string"},"ip_hash":{"type":"string"}}
}`;

export const makeDefaultLowLevel = (): LowLevel => ({
  schemas: {
    Url: URL_SCHEMA,
    ClickEvent: CLICK_SCHEMA,
  },
  apis: [
    {
      method: "POST",
      path: "/urls",
      notes: "Body: { long_url, custom? } → returns { short }",
    },
    {
      method: "GET",
      path: "/:slug",
      notes: "Redirect 302 to long URL; hit cache first",
    },
    {
      method: "GET",
      path: "/urls/:slug/stats",
      notes: "Optional analytics view; guard behind auth",
    },
  ],
  capacityAssumptions: {
    cacheHit: 95,
    avgWritesPerCreate: 1,
    readRps: 5000,
  },
});

const specFor = (kind: ComponentKind) => {
  const spec = COMPONENT_LIBRARY.find((component) => component.kind === kind);
  if (!spec) {
    throw new Error(`Missing component spec for ${kind}`);
  }
  return spec;
};

const SEED_NODE_BLUEPRINTS: Array<{ id: string; kind: ComponentKind; x: number; y: number }> = [
  { id: "seed-web", kind: "Web", x: -200, y: 0 },
];

const SEED_EDGE_BLUEPRINTS: Array<{ id: string; from: string; to: string; linkLatencyMs: number; sourceHandle?: string; targetHandle?: string }> = [];

const buildSeedNodes = (): PlacedNode[] =>
  SEED_NODE_BLUEPRINTS.map((blueprint) => ({
    id: blueprint.id,
    spec: specFor(blueprint.kind),
    x: blueprint.x,
    y: blueprint.y,
    replicas: 1,
  }));

const buildSeedEdges = (): Edge[] =>
  SEED_EDGE_BLUEPRINTS.map((blueprint) => ({
    id: blueprint.id,
    from: blueprint.from,
    to: blueprint.to,
    linkLatencyMs: blueprint.linkLatencyMs,
    sourceHandle: blueprint.sourceHandle,
    targetHandle: blueprint.targetHandle,
  }));

export const makeDefaultDesignState = (): PracticeDesignState => ({
  nodes: buildSeedNodes(),
  edges: buildSeedEdges(),
  guidedStepIndex: 0,
  guidedCompleted: false,
  guidedDismissed: false,
  freeModeUnlocked: false,
  redirectMode: "302",
});

export const makeDefaultRunState = (): PracticeRunState => ({
  attempts: 0,
  chaosMode: false,
  isRunning: false,
  lastResult: null,
});

export const makeDefaultApiDefinition = (): PracticeApiDefinitionState => ({
  endpoints: [
    {
      id: "post-shorten",
      method: "POST",
      path: "api/v1/urls",
      notes: "",
      suggested: true,
    },
    {
      id: "get-slug",
      method: "GET",
      path: "{slug}",
      notes: "",
      suggested: true,
    },
  ],
});

export const makeInitialPracticeState = (): PracticeState => ({
  slug: "url-shortener",
  currentStep: "functional",
  requirements: makeDefaultRequirements(),
  apiDefinition: makeDefaultApiDefinition(),
  design: makeDefaultDesignState(),
  run: makeDefaultRunState(),
  auth: {
    isAuthed: false,
    skipped: false,
  },
  completed: {
    functional: false,
    nonFunctional: false,
    api: false,
    sandbox: false,
    score: false,
  },
  iterativeFeedback: {
    functional: {
      coveredTopics: {},
      lastContent: "",
      currentQuestion: null,
      cachedResult: null,
    },
    nonFunctional: {
      coveredTopics: {},
      lastContent: "",
      currentQuestion: null,
      cachedResult: null,
    },
    api: {
      coveredTopics: {},
      lastContent: "",
      currentQuestion: null,
      cachedResult: null,
    },
    design: {
      coveredTopics: {},
      lastContent: "",
      currentQuestion: null,
      cachedResult: null,
    },
  },
  updatedAt: Date.now(),
});
