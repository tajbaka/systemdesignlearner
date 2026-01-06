/**
 * Practice state migration and sanitization utilities.
 *
 * These functions handle backwards compatibility with legacy state formats
 * and ensure all state objects have the correct shape with proper defaults.
 */

import type {
  PracticeApiDefinitionState,
  PracticeAuthState,
  PracticeDesignState,
  PracticeIterativeFeedback,
  PracticeProgress,
  PracticeState,
  Requirements,
} from "./types";
import {
  makeDefaultApiDefinition,
  makeDefaultDesignState,
  makeDefaultRequirements,
  makeInitialPracticeState,
} from "./defaults";
import { isLegacyPlaceholderContent } from "./apiPlaceholders";

/**
 * Legacy state format with 'locked' instead of 'completed'.
 * Used before the multi-step practice flow was introduced.
 */
type LegacyLocked = {
  brief?: boolean;
  design?: boolean;
  run?: boolean;
};

/**
 * Legacy practice state format for backwards compatibility.
 */
export type LegacyPracticeState = Partial<{
  slug: string;
  requirements:
    | Requirements
    | {
        functional: Record<string, boolean>;
        nonFunctional: Partial<Requirements["nonFunctional"]>;
      };
  design: PracticeDesignState;
  run: Partial<{
    lastResult: null;
    isRunning: boolean;
    attempts: number;
    chaosMode: boolean;
    firstPassAt: number;
  }>;
  locked: LegacyLocked;
  updatedAt: number;
}>;

/**
 * Ensure requirements have all required fields with proper defaults.
 * Handles both modern and legacy requirement formats.
 */
export const ensureRequirements = (
  value?: Requirements | LegacyPracticeState["requirements"],
  slug = "url-shortener"
): Requirements => {
  const defaults = makeDefaultRequirements(slug);
  if (!value) return defaults;

  const candidate = value as Requirements;
  const functionalSummary =
    typeof (candidate as Requirements).functionalSummary === "string"
      ? candidate.functionalSummary
      : "";

  const functional = {
    ...defaults.functional,
    ...(candidate?.functional ?? {}),
  };

  const nonFunctionalLegacy = (value as { nonFunctional?: Partial<Requirements["nonFunctional"]> })
    .nonFunctional;
  const nonFunctional = {
    ...defaults.nonFunctional,
    ...(candidate?.nonFunctional ?? {}),
    ...(nonFunctionalLegacy ?? {}),
  };

  if (typeof nonFunctional.rateLimitNotes !== "string") {
    nonFunctional.rateLimitNotes = "";
  }

  if (typeof nonFunctional.notes !== "string") {
    nonFunctional.notes = "";
  }

  return {
    functionalSummary,
    functional,
    nonFunctional,
  };
};

/**
 * Ensure API definition has proper structure with all required fields.
 * Strips legacy placeholder content and normalizes endpoint paths.
 */
export const ensureApiDefinition = (
  value?: PracticeApiDefinitionState,
  slug = "url-shortener"
): PracticeApiDefinitionState => {
  if (!value || !Array.isArray(value.endpoints)) {
    return makeDefaultApiDefinition(slug);
  }

  const endpoints = value.endpoints.map((endpoint, index) => {
    const method = endpoint.method ?? "GET";
    // Strip leading slashes - the UI displays a visual "/" prefix
    const path = (endpoint.path ?? "").replace(/^\/+/, "");
    const rawNotes = typeof endpoint.notes === "string" ? endpoint.notes : "";
    const notes = isLegacyPlaceholderContent(rawNotes, method, path) ? "" : rawNotes;

    return {
      id: endpoint.id ?? `endpoint-${index}`,
      method,
      path,
      notes,
      suggested: Boolean(endpoint.suggested),
    };
  });

  return {
    endpoints,
  };
};

/**
 * Sanitize design state by removing legacy seed layouts.
 * Earlier versions had a seed layout with just Web → API nodes.
 */
export const sanitizeDesignState = (
  value?: PracticeDesignState,
  slug = "url-shortener"
): PracticeDesignState => {
  const design = value ?? makeDefaultDesignState(slug);
  const nodeIds = new Set(design.nodes.map((node) => node.id));
  const edgeIds = new Set(design.edges.map((edge) => edge.id));
  const hasLegacySeedEdge =
    design.edges.length === 0 || (design.edges.length === 1 && edgeIds.has("seed-edge-web-api"));
  const hasLegacySeedLayout =
    nodeIds.size === 2 && nodeIds.has("seed-web") && nodeIds.has("seed-api") && hasLegacySeedEdge;

  if (!hasLegacySeedLayout) {
    return design;
  }

  return {
    ...design,
    nodes: design.nodes.filter((node) => node.id !== "seed-api"),
    edges: design.edges.filter((edge) => edge.id !== "seed-edge-web-api"),
  };
};

/**
 * Ensure auth state has proper boolean fields.
 */
export const ensureAuthState = (value?: PracticeAuthState): PracticeAuthState => ({
  isAuthed: Boolean(value?.isAuthed),
  skipped: Boolean(value?.skipped),
});

/**
 * Ensure progress state has all step flags as booleans.
 */
export const ensureProgress = (value?: PracticeProgress): PracticeProgress => ({
  functional: Boolean(value?.functional),
  nonFunctional: Boolean(value?.nonFunctional),
  api: Boolean(value?.api),
  highLevelDesign: Boolean(value?.highLevelDesign),
  score: Boolean(value?.score),
});

/**
 * Convert legacy 'locked' state to modern 'completed' progress state.
 * Legacy had: brief, design, run
 * Modern has: functional, nonFunctional, api, highLevelDesign, score
 */
export const migrateLegacyProgress = (locked?: LegacyLocked): PracticeProgress => ({
  functional: Boolean(locked?.brief),
  nonFunctional: Boolean(locked?.brief),
  api: false,
  highLevelDesign: Boolean(locked?.design),
  score: Boolean(locked?.run),
});

/**
 * Ensure iterative feedback state has all required fields with defaults.
 */
export const ensureIterativeFeedback = (
  value?: PracticeIterativeFeedback
): PracticeIterativeFeedback => ({
  functional: {
    coveredTopics: value?.functional?.coveredTopics ?? {},
    lastContent: value?.functional?.lastContent ?? "",
    currentQuestion: value?.functional?.currentQuestion ?? null,
    cachedResult: value?.functional?.cachedResult ?? null,
  },
  nonFunctional: {
    coveredTopics: value?.nonFunctional?.coveredTopics ?? {},
    lastContent: value?.nonFunctional?.lastContent ?? "",
    currentQuestion: value?.nonFunctional?.currentQuestion ?? null,
    cachedResult: value?.nonFunctional?.cachedResult ?? null,
  },
  api: {
    coveredTopics: value?.api?.coveredTopics ?? {},
    lastContent: value?.api?.lastContent ?? "",
    currentQuestion: value?.api?.currentQuestion ?? null,
    cachedResult: value?.api?.cachedResult ?? null,
  },
  design: {
    coveredTopics: value?.design?.coveredTopics ?? {},
    lastContent: value?.design?.lastContent ?? "",
    currentQuestion: value?.design?.currentQuestion ?? null,
    cachedResult: value?.design?.cachedResult ?? null,
  },
});

/**
 * Merge raw state (from storage or shared link) with defaults.
 * Handles both modern and legacy state formats.
 */
export const mergeState = (
  raw: PracticeState | LegacyPracticeState | null,
  slug: string
): PracticeState => {
  const defaults = makeInitialPracticeState(slug);
  if (!raw) return defaults;

  const candidate = raw as PracticeState;
  const isModern =
    typeof candidate.completed === "object" &&
    candidate.completed !== null &&
    Array.isArray((candidate as PracticeState).apiDefinition?.endpoints);

  if (isModern) {
    // Use the slug from candidate if it exists, otherwise use the provided slug
    const finalSlug = candidate.slug || slug;
    return {
      ...defaults,
      ...candidate,
      slug: finalSlug,
      // Ensure currentStep exists, default to functional if not present (for backwards compatibility)
      currentStep: candidate.currentStep ?? defaults.currentStep,
      requirements: ensureRequirements(candidate.requirements, finalSlug),
      apiDefinition: ensureApiDefinition(candidate.apiDefinition, finalSlug),
      design: sanitizeDesignState(candidate.design ?? defaults.design, finalSlug),
      run: {
        ...defaults.run,
        ...(candidate.run ?? {}),
      },
      auth: ensureAuthState(candidate.auth),
      completed: ensureProgress(candidate.completed),
      scores: candidate.scores ?? defaults.scores,
      iterativeFeedback: ensureIterativeFeedback(candidate.iterativeFeedback),
      updatedAt: candidate.updatedAt ?? Date.now(),
    };
  }

  const legacy = raw as LegacyPracticeState;
  return {
    ...defaults,
    slug,
    requirements: ensureRequirements(legacy.requirements as Requirements, slug),
    apiDefinition: ensureApiDefinition(undefined, slug),
    design: sanitizeDesignState(legacy.design ?? defaults.design, slug),
    run: {
      ...defaults.run,
      ...(legacy.run ?? {}),
    },
    auth: ensureAuthState(),
    completed: migrateLegacyProgress(legacy.locked),
    iterativeFeedback: ensureIterativeFeedback(),
    updatedAt: legacy.updatedAt ?? Date.now(),
  };
};

/**
 * Ensure auth and progress states are consistent.
 * Currently a no-op as the PracticeFlow component handles step gating.
 */
export const ensureAuthProgressConsistency = (state: PracticeState): PracticeState => {
  // If authenticated, keep all progress as-is
  if (state.auth.isAuthed) {
    return state;
  }

  // If both sandbox and score are incomplete, no need to modify
  if (!state.completed.highLevelDesign && !state.completed.score) {
    return state;
  }

  // Don't clear progress during active sessions or auth transitions
  // Only clear if the session has been abandoned (e.g., cleared auth but kept progress)
  // This prevents clearing progress when user is actively going through the auth flow
  // The PracticeFlow component will handle step gating based on auth state
  return state;
};
