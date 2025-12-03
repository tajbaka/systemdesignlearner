import type {
  HighLevelChoice,
  LowLevel,
  PracticeState,
  PracticeDesignState,
  PracticeRunState,
  Requirements,
  PracticeApiDefinitionState,
} from "./types";
import * as ScenarioConfigs from "./scenario-configs";

/**
 * Get functional toggles for a specific scenario.
 * Defaults to url-shortener if slug not provided.
 * @deprecated Use ScenarioConfigs.getFunctionalToggles(slug) instead
 */
export const getFunctionalToggles = (slug = "url-shortener") => {
  return ScenarioConfigs.getFunctionalToggles(slug);
};

// Keep legacy export for backwards compatibility
export const FUNCTIONAL_TOGGLES = getFunctionalToggles("url-shortener");

/**
 * Create default requirements for a specific scenario.
 * @param slug - The scenario slug (defaults to "url-shortener")
 */
export const makeDefaultRequirements = (slug = "url-shortener"): Requirements => {
  return ScenarioConfigs.makeDefaultRequirements(slug);
};

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
 * Create default design state for a specific scenario.
 * @param slug - The scenario slug (defaults to "url-shortener")
 */
export const makeDefaultDesignState = (slug = "url-shortener"): PracticeDesignState => {
  return ScenarioConfigs.makeDefaultDesignState(slug);
};

/**
 * Create default run state for a specific scenario.
 * @param slug - The scenario slug (defaults to "url-shortener")
 */
export const makeDefaultRunState = (slug = "url-shortener"): PracticeRunState => {
  return ScenarioConfigs.makeDefaultRunState(slug);
};

/**
 * Create default API definition for a specific scenario.
 * @param slug - The scenario slug (defaults to "url-shortener")
 */
export const makeDefaultApiDefinition = (slug = "url-shortener"): PracticeApiDefinitionState => {
  return ScenarioConfigs.makeDefaultApiDefinition(slug);
};

/**
 * Create initial practice state for a specific scenario.
 * @param slug - The scenario slug (defaults to "url-shortener")
 */
export const makeInitialPracticeState = (slug = "url-shortener"): PracticeState => ({
  slug,
  currentStep: "functional",
  requirements: makeDefaultRequirements(slug),
  apiDefinition: makeDefaultApiDefinition(slug),
  design: makeDefaultDesignState(slug),
  run: makeDefaultRunState(slug),
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
