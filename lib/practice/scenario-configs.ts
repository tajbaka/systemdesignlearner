import { SCENARIOS } from "@/lib/scenarios";
import type {
  Requirements,
  PracticeApiDefinitionState,
  PracticeDesignState,
  PracticeRunState,
} from "./types";
import type { PlacedNode, Edge, ComponentKind } from "@/app/components/types";
import { COMPONENT_LIBRARY } from "@/app/components/data";

const specFor = (kind: ComponentKind) => {
  const spec = COMPONENT_LIBRARY.find((component) => component.kind === kind);
  if (!spec) {
    throw new Error(`Missing component spec for ${kind}`);
  }
  return spec;
};

// Scenario-specific configurations
type ScenarioConfig = {
  functionalToggles: Array<{
    id: string;
    label: string;
    description: string;
    default: boolean;
  }>;
  defaultRequirements: () => Requirements;
  defaultApiDefinition: () => PracticeApiDefinitionState;
  defaultDesignState: () => PracticeDesignState;
  defaultRunState: () => PracticeRunState;
};

// URL Shortener configuration (default)
const URL_SHORTENER_CONFIG: ScenarioConfig = {
  functionalToggles: [
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
  ],
  defaultRequirements: () => ({
    functionalSummary: "",
    functional: URL_SHORTENER_CONFIG.functionalToggles.reduce<Requirements["functional"]>(
      (acc, toggle) => {
        acc[toggle.id] = toggle.default;
        return acc;
      },
      {}
    ),
    nonFunctional: {
      readRps: 0,
      writeRps: 0,
      p95RedirectMs: 0,
      rateLimitNotes: "",
      availability: "99.9",
      notes: "",
    },
  }),
  defaultApiDefinition: () => ({
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
  }),
  defaultDesignState: () => ({
    nodes: [
      {
        id: "seed-web",
        spec: specFor("Web"),
        x: -200,
        y: 0,
        replicas: 1,
      },
    ],
    edges: [],
    guidedStepIndex: 0,
    guidedCompleted: false,
    guidedDismissed: false,
    freeModeUnlocked: false,
    redirectMode: "302",
  }),
  defaultRunState: () => ({
    attempts: 0,
    chaosMode: false,
    isRunning: false,
    lastResult: null,
  }),
};

// Registry of scenario configs
const SCENARIO_CONFIGS: Record<string, ScenarioConfig> = {
  "url-shortener": URL_SHORTENER_CONFIG,
  // Add more scenario configs here as they're implemented
};

/**
 * Get configuration for a specific scenario slug.
 * Falls back to URL shortener config if slug is not found.
 */
export function getScenarioConfig(slug: string): ScenarioConfig {
  return SCENARIO_CONFIGS[slug] ?? URL_SHORTENER_CONFIG;
}

/**
 * Get the scenario metadata from SCENARIOS list
 */
export function getScenarioMetadata(slug: string) {
  return SCENARIOS.find((s) => s.id === slug);
}

/**
 * Generate default requirements for a specific scenario
 */
export function makeDefaultRequirements(slug: string): Requirements {
  const config = getScenarioConfig(slug);
  return config.defaultRequirements();
}

/**
 * Generate default API definition for a specific scenario
 */
export function makeDefaultApiDefinition(slug: string): PracticeApiDefinitionState {
  const config = getScenarioConfig(slug);
  // Use scenario API endpoints if available
  const scenario = getScenarioMetadata(slug);
  if (scenario?.api && scenario.api.length > 0) {
    return {
      endpoints: scenario.api.map((endpoint, index) => ({
        id: `endpoint-${index}`,
        method: endpoint.method,
        path: endpoint.path,
        notes: endpoint.notes || "",
        suggested: true,
      })),
    };
  }
  return config.defaultApiDefinition();
}

/**
 * Generate default design state for a specific scenario
 */
export function makeDefaultDesignState(slug: string): PracticeDesignState {
  const config = getScenarioConfig(slug);
  return config.defaultDesignState();
}

/**
 * Generate default run state for a specific scenario
 */
export function makeDefaultRunState(slug: string): PracticeRunState {
  const config = getScenarioConfig(slug);
  return config.defaultRunState();
}

/**
 * Get functional toggles for a specific scenario
 */
export function getFunctionalToggles(slug: string) {
  const config = getScenarioConfig(slug);
  return config.functionalToggles;
}
