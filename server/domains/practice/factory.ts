import type { Deps } from "../types";

// Import service functions
import * as problemService from "./services/problem";
import * as userProblemService from "./services/user-problem";
import * as assistanceService from "./services/assistance";

// Import evaluation services (pure functions)
import {
  functionalService,
  nonFunctionalService,
  apiService,
  highLevelDesignService,
  validateMatchedEndpoint,
} from "./services/evaluation";

// ============================================================================
// Practice Domain Factory
// ============================================================================

export function createPracticeServices(_deps: Deps) {
  return {
    // Problem queries
    problem: {
      findBySlug: (slug: string) => problemService.findBySlug(slug),
      getSteps: (problemId: string) => problemService.getSteps(problemId),
      listWithProgress: (userId?: string) => problemService.listProblemsWithProgress(userId),
    },

    // User problem state
    userProblem: {
      getOrCreate: (userId: string, problemId: string, versionId: string) =>
        userProblemService.getOrCreateUserProblem(userId, problemId, versionId),
      getOrCreateSteps: (userProblemId: string) =>
        userProblemService.getOrCreateUserProblemSteps(userProblemId),
      saveStepData: userProblemService.saveStepData,
      updateStepEvaluation: userProblemService.updateStepEvaluation,
      getStepData: userProblemService.getStepData,
      touch: userProblemService.touchUserProblem,
    },

    // Access control
    accessControl: {
      checkStepAccess: userProblemService.checkStepAccess,
    },

    // Evaluation (pure functions: validate, buildPrompt, parseResponse)
    evaluation: {
      functional: functionalService,
      nonFunctional: nonFunctionalService,
      api: apiService,
      highLevelDesign: highLevelDesignService,
      validateMatchedEndpoint,
    },

    // Assistance
    assistance: {
      isRateLimited: assistanceService.isRateLimited,
      prepareStream: assistanceService.prepareAssistanceStream,
    },

    // Score
    score: {
      calculate: userProblemService.calculateScores,
    },
  };
}

// ============================================================================
// Type Export
// ============================================================================

export type PracticeServices = ReturnType<typeof createPracticeServices>;
