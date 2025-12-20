import { SCENARIOS } from "@/lib/scenarios";
import type {
  Requirements,
  PracticeApiDefinitionState,
  PracticeDesignState,
  PracticeRunState,
} from "./types";
import type { ComponentKind } from "@/app/components/types";
import { COMPONENT_LIBRARY } from "@/app/components/data";
import type { ScenarioReference, FunctionalToggle } from "./reference/schema";
import { getScenarioReferenceSync } from "./loader";

const specFor = (kind: ComponentKind) => {
  const spec = COMPONENT_LIBRARY.find((component) => component.kind === kind);
  if (!spec) {
    throw new Error(`Missing component spec for ${kind}`);
  }
  return spec;
};

// Scenario-specific configurations
export type ScenarioConfig = {
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

/**
 * Default functional toggles as fallback when JSON not loaded.
 * These should match the URL shortener JSON configuration.
 */
const DEFAULT_FUNCTIONAL_TOGGLES: FunctionalToggle[] = [
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
];

/**
 * Generate a ScenarioConfig from a reference JSON.
 * Falls back to defaults if reference is not available.
 */
function buildConfigFromReference(
  reference: ScenarioReference | null,
  slug: string
): ScenarioConfig {
  // Get functional toggles from reference or use defaults
  const functionalToggles = reference?.functional?.toggles ?? DEFAULT_FUNCTIONAL_TOGGLES;

  return {
    functionalToggles,
    defaultRequirements: () => ({
      functionalSummary: "",
      functional: functionalToggles.reduce<Requirements["functional"]>((acc, toggle) => {
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
    }),
    defaultApiDefinition: () => {
      // Use API endpoints from reference if available
      const apiEndpoints = reference?.apiEndpoints ?? reference?.api?.endpoints ?? [];
      if (apiEndpoints.length > 0) {
        return {
          endpoints: apiEndpoints
            .filter((ep) => ep.required)
            .map((endpoint, index) => ({
              id: `endpoint-${index}`,
              method: endpoint.method,
              path: endpoint.path.replace(/^\//, ""), // Remove leading slash
              notes: "",
              suggested: true,
            })),
        };
      }

      // Fall back to scenario metadata
      const scenario = SCENARIOS.find((s) => s.id === slug);
      if (scenario?.api && scenario.api.length > 0) {
        return {
          endpoints: scenario.api.map((endpoint, index) => ({
            id: `endpoint-${index}`,
            method: endpoint.method,
            path: endpoint.path.replace(/^\/+/, ""), // Remove leading slashes
            notes: endpoint.notes || "",
            suggested: true,
          })),
        };
      }

      // Default API definition
      return {
        endpoints: [
          { id: "post-shorten", method: "POST", path: "api/v1/urls", notes: "", suggested: true },
          { id: "get-slug", method: "GET", path: "{slug}", notes: "", suggested: true },
        ],
      };
    },
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
}

/**
 * Get configuration for a specific scenario slug.
 * Dynamically generates config from JSON reference if available,
 * otherwise falls back to hardcoded defaults.
 */
export function getScenarioConfig(slug: string): ScenarioConfig {
  // Try to get reference from cache (should be preloaded)
  const reference = getScenarioReferenceSync(slug);
  return buildConfigFromReference(reference, slug);
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
