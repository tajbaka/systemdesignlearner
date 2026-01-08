import type { HighLevelChoice, LowLevel, PracticeStep } from "./types";

export const PRESET_CHOICES: HighLevelChoice[] = [
  {
    presetId: "db_only",
    components: ["Web", "Service", "DB (Postgres)"],
    notes: [
      "Fast to ship but DB handles every redirect.",
      "Add read replicas later if traffic climbs.",
    ],
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
      path: "urls",
      notes: "Body: { long_url, custom? } → returns { short }",
    },
    {
      method: "GET",
      path: ":slug",
      notes: "Redirect 302 to long URL; hit cache first",
    },
    {
      method: "GET",
      path: "urls/:slug/stats",
      notes: "Optional analytics view; guard behind auth",
    },
  ],
  capacityAssumptions: {
    cacheHit: 95,
    avgWritesPerCreate: 1,
    readRps: 5000,
  },
});

/**
 * Create initial practice state for a specific scenario.
 * @param slug - The scenario slug (defaults to "url-shortener")
 */
export const makeInitialPracticeState = (slug = "url-shortener") => ({
  slug,
  currentStep: "functional" as PracticeStep,
  requirements: {
    functionalSummary: "",
    functional: {},
    nonFunctional: {
      readRps: 0,
      writeRps: 0,
      p95RedirectMs: 0,
      rateLimitNotes: "",
      availability: "99.9" as const,
      notes: "",
    },
  },
  apiDefinition: {
    endpoints: [],
  },
  design: {
    nodes: [],
    edges: [],
    guidedStepIndex: 0,
    guidedCompleted: false,
    guidedDismissed: false,
    freeModeUnlocked: false,
    redirectMode: "302" as const,
  },
  run: {
    attempts: 0,
    chaosMode: false,
    isRunning: false,
    lastResult: null,
  },
  auth: {
    isAuthed: false,
    skipped: false,
  },
  completed: {
    functional: false,
    nonFunctional: false,
    api: false,
    highLevelDesign: false,
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
