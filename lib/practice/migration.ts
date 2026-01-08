/**
 * Practice state migration and sanitization utilities.
 *
 * These functions handle backwards compatibility with legacy state formats
 * and ensure all state objects have the correct shape with proper defaults.
 */

import type {
  PracticeAuthState,
  PracticeIterativeFeedback,
  PracticeProgress,
  PracticeState,
} from "./types";
import { makeInitialPracticeState } from "./defaults";

/**
 * Ensure auth state has proper boolean fields.
 */
export const ensureAuthState = (value?: PracticeAuthState): PracticeAuthState => ({
  isAuthed: Boolean(value?.isAuthed),
  skipped: Boolean(value?.skipped),
});

/**
 * Ensure progress state has all step flags as booleans.
 * Also fixes inconsistent states where later steps are completed but earlier ones aren't.
 * (This can happen due to a bug where navigation happened before state was saved.)
 */
export const ensureProgress = (value?: PracticeProgress): PracticeProgress => {
  const raw = {
    functional: Boolean(value?.functional),
    nonFunctional: Boolean(value?.nonFunctional),
    api: Boolean(value?.api),
    highLevelDesign: Boolean(value?.highLevelDesign),
    score: Boolean(value?.score),
  };

  // Fix inconsistent progress: if a later step is completed, all earlier steps should be too
  // Steps order: functional -> nonFunctional -> api -> highLevelDesign -> score
  if (raw.score) {
    raw.highLevelDesign = true;
    raw.api = true;
    raw.nonFunctional = true;
    raw.functional = true;
  } else if (raw.highLevelDesign) {
    raw.api = true;
    raw.nonFunctional = true;
    raw.functional = true;
  } else if (raw.api) {
    raw.nonFunctional = true;
    raw.functional = true;
  } else if (raw.nonFunctional) {
    raw.functional = true;
  }

  return raw;
};

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
export const mergeState = (raw: PracticeState | null, slug: string): PracticeState => {
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
      auth: ensureAuthState(candidate.auth),
      completed: ensureProgress(candidate.completed),
      updatedAt: candidate.updatedAt ?? Date.now(),
    };
  }

  return {
    ...defaults,
    slug,
    auth: ensureAuthState(),
    iterativeFeedback: ensureIterativeFeedback(),
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
