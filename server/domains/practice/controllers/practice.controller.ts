import type { Services } from "../../factory";
import type { StepType, EvaluateParams } from "../services/user-problem";
import type { ProblemStep } from "../services/problem";
import type { AssistanceStreamParams } from "../services/assistance";
import type { ProblemConfig } from "@/domains/practice/back-end/types";
import type {
  EvaluationResult,
  APIEvaluationResult,
  ExtractedApiInfo,
} from "../services/evaluation";
import type { ApiDefinitionInput, TextRequirementInput } from "../services/evaluation/validation";
import { checkExactSolutionMatch } from "../services/evaluation/solution-matcher";
import { logger } from "@/lib/logger";
import { generateEvaluation, generateApiEvaluation, generateExtraction } from "@/lib/gemini";

// ============================================================================
// Types
// ============================================================================

type EvaluateServiceResult = (EvaluationResult | APIEvaluationResult) & {
  extractions?: { version: number; data: Record<string, unknown> };
};

// Version for extraction schema
const EXTRACTION_VERSION = 1;

// Helper to strip markdown code blocks
const cleanJson = (raw: string) => raw.replace(/```json|```/g, "").trim();

// ============================================================================
// Controller Factory
// ============================================================================

export function createPracticeController(services: Services) {
  const practice = services.practice;

  // ==========================================================================
  // Private: Evaluate text steps (functional/nonFunctional)
  // ==========================================================================
  async function evaluateTextStep(
    validatedInput: TextRequirementInput,
    problemConfig: ProblemConfig,
    stepData: Record<string, unknown>,
    service: typeof practice.evaluation.functional,
    distinctId: string | undefined,
    slug: string,
    stepType: string
  ): Promise<EvaluateServiceResult> {
    const requirements = stepData.requirements || [];

    // Check for empty text submissions — skip LLM
    const isEmptyText = !validatedInput.textField.value.trim();

    if (isEmptyText) {
      const stepRequirements =
        (requirements as Array<{
          id: string;
          feedbackOnMissing?: string;
          hints?: Array<{ id: string }>;
        }>) || [];
      const firstReq = stepRequirements[0];

      return {
        feedback: firstReq?.feedbackOnMissing || "Try describing some requirements to get started.",
        score: 0,
        results: stepRequirements.map((req, index) => ({
          id: req.id,
          complete: false,
          ...(index === 0
            ? {
                feedback: firstReq?.feedbackOnMissing,
                hintId: req.hints?.[0]?.id,
                itemIds: [validatedInput.textField.id],
              }
            : {}),
        })),
      };
    }

    // Check for exact solution matches — skip LLM if all requirements have matching solutions
    const exactMatch = checkExactSolutionMatch(
      validatedInput.textField.value,
      requirements as Array<{ id: string; weight?: number; solutions?: Array<{ text: string }> }>
    );

    if (exactMatch) {
      logger.info("All solutions matched — skipping LLM evaluation", { slug, step: stepType });
      return exactMatch;
    }

    // Single-shot evaluation
    const prompt = service.buildPrompt(problemConfig, validatedInput);
    logger.info("Built prompt for evaluation", {
      slug,
      step: stepType,
      promptLength: prompt.length,
    });

    const responseText = await generateEvaluation(prompt, distinctId);

    logger.info("Received AI response", {
      slug,
      step: stepType,
      responseLength: responseText.length,
    });

    return service.parseResponse(responseText, problemConfig, validatedInput);
  }

  // ==========================================================================
  // Private: Evaluate API step (two-phase extraction + evaluation)
  // ==========================================================================
  async function evaluateApiStep(
    apiInput: ApiDefinitionInput,
    problemConfig: ProblemConfig,
    stepData: Record<string, unknown>,
    service: typeof practice.evaluation.api,
    previousExtractions: EvaluateParams["previousExtractions"],
    changedEndpointIds: string[] | undefined,
    distinctId: string | undefined,
    slug: string
  ): Promise<EvaluateServiceResult> {
    const canUseCachedExtractions =
      previousExtractions?.version === EXTRACTION_VERSION && previousExtractions?.data;

    // Determine which endpoints need fresh extraction
    const endpointsNeedingExtraction = apiInput.endpoints.filter((ep) => {
      if (!canUseCachedExtractions) return true;
      if (changedEndpointIds?.includes(ep.id)) return true;
      if (!previousExtractions!.data[ep.id]) return true;
      return false;
    });

    logger.info("[API Evaluation] Starting extraction step", {
      slug,
      totalEndpoints: apiInput.endpoints.length,
      endpointsNeedingExtraction: endpointsNeedingExtraction.length,
      usingCachedExtractions: canUseCachedExtractions
        ? apiInput.endpoints.length - endpointsNeedingExtraction.length
        : 0,
    });

    // Step 1: Extract structured data from endpoints in parallel
    const extractionPromises = endpointsNeedingExtraction.map(async (endpoint) => {
      const extractionPrompt = service.buildExtractionPrompt(endpoint);
      try {
        const rawText = await generateExtraction(extractionPrompt, distinctId);
        const extracted = JSON.parse(cleanJson(rawText)) as ExtractedApiInfo;
        return { endpointId: endpoint.id, extracted, error: null };
      } catch (e) {
        logger.error("[API Evaluation] Extraction failed for endpoint", {
          endpointId: endpoint.id,
          error: e,
        });
        return {
          endpointId: endpoint.id,
          extracted: {
            mainAction: "extraction failed",
            requestBody: "not specified",
            responseFormat: "not specified",
            successStatusCode: "not specified",
            errorCases: [],
          } as ExtractedApiInfo,
          error: e,
        };
      }
    });

    const extractionResults = await Promise.all(extractionPromises);

    // Merge cached + fresh extractions
    const extractions = new Map<string, ExtractedApiInfo>();

    if (canUseCachedExtractions) {
      for (const [id, extracted] of Object.entries(previousExtractions!.data)) {
        extractions.set(id, extracted as ExtractedApiInfo);
      }
    }

    for (const result of extractionResults) {
      extractions.set(result.endpointId, result.extracted);
    }

    // Step 2: Evaluate with extracted data
    const evaluationPrompt = service.buildEvaluationPromptWithExtractions(
      problemConfig,
      apiInput,
      extractions
    );

    const responseText = await generateApiEvaluation(evaluationPrompt, distinctId);

    logger.info("Received AI evaluation response", {
      slug,
      step: "api",
      responseLength: responseText.length,
    });

    // Parse AI response
    const evaluation = service.parseResponse(
      responseText,
      problemConfig,
      apiInput
    ) as APIEvaluationResult;

    // Post-LLM validation
    const requirements = stepData.requirements || [];
    const apiRequirements =
      (requirements as Array<{
        id: string;
        evaluationCriteria?: string;
        weight?: number;
        method?: string;
        correctPath?: string;
      }>) || [];

    for (const result of evaluation.results) {
      if (!result.complete) continue;

      const requirement = apiRequirements.find((r) => r.id === result.id);

      // Infer matchedEndpointId if LLM didn't provide it
      let effectiveMatchedEndpointId = result.matchedEndpointId;
      if (!effectiveMatchedEndpointId && requirement && "method" in requirement) {
        const matchingEndpoint = apiInput.endpoints.find((ep) => {
          const methodMatches = ep.method.value.toUpperCase() === requirement.method!.toUpperCase();
          const pathMatches = ep.path.value === requirement.correctPath;
          return methodMatches && pathMatches;
        });
        if (matchingEndpoint) {
          effectiveMatchedEndpointId = matchingEndpoint.id;
        } else if (apiInput.endpoints.length === 1) {
          effectiveMatchedEndpointId = apiInput.endpoints[0].id;
        }
      }

      if (!effectiveMatchedEndpointId) continue;

      const matchedExtraction = extractions.get(effectiveMatchedEndpointId);

      if (requirement?.evaluationCriteria) {
        const validation = practice.evaluation.validateMatchedEndpoint(
          matchedExtraction,
          requirement.evaluationCriteria
        );

        if (!validation.passed) {
          logger.info(`[API] Post-validation override for ${result.id}:`, {
            matchedEndpointId: effectiveMatchedEndpointId,
            reason: validation.failedReason,
          });

          const matchedEp = apiInput.endpoints.find((ep) => ep.id === effectiveMatchedEndpointId);

          result.complete = false;
          result.correctDescription = false;
          result.feedback = `${validation.failedReason}. ${result.feedback || ""}`.trim();
          if (matchedEp) {
            result.itemIds = [matchedEp.description.id];
          }
        }
      }
    }

    // Recalculate score after post-validation overrides
    const reqWeights = new Map(apiRequirements.map((r) => [r.id, r.weight || 0]));
    evaluation.score = evaluation.results.reduce((acc, res) => {
      if (res.complete) {
        return acc + (reqWeights.get(res.id) || 0);
      }
      return acc;
    }, 0);

    // Add extractions to response for frontend caching
    return {
      ...evaluation,
      extractions: {
        version: EXTRACTION_VERSION,
        data: Object.fromEntries(extractions),
      },
    };
  }

  // ==========================================================================
  // Private: Main evaluate orchestrator
  // ==========================================================================
  async function evaluateStepInternal(
    params: EvaluateParams,
    stepRecord: ProblemStep,
    currentVersionTitle: string,
    currentVersionDescription: string
  ): Promise<EvaluateServiceResult> {
    const { stepType, input, previousExtractions, changedEndpointIds, userEmail } = params;

    // Build problem config for the service
    const stepData = (stepRecord.data as { requirements?: unknown }) || {};
    const requirements = stepData.requirements || [];

    const problemConfig = {
      title: currentVersionTitle,
      description: currentVersionDescription,
      steps: {
        [stepType]: {
          requirements,
        },
      },
    } as unknown as ProblemConfig;

    // Dispatch based on step type with proper typing
    let evaluation: EvaluateServiceResult;

    if (stepType === "highLevelDesign") {
      const service = practice.evaluation.highLevelDesign;
      const validatedInput = service.validate(input);
      evaluation = service.parseResponse("", problemConfig, validatedInput);
    } else if (stepType === "api") {
      const service = practice.evaluation.api;
      const validatedInput = service.validate(input);
      evaluation = await evaluateApiStep(
        validatedInput,
        problemConfig,
        stepData,
        service,
        previousExtractions,
        changedEndpointIds,
        userEmail,
        params.slug
      );
    } else if (stepType === "functional") {
      const service = practice.evaluation.functional;
      const validatedInput = service.validate(input);
      evaluation = await evaluateTextStep(
        validatedInput,
        problemConfig,
        stepData,
        service,
        userEmail,
        params.slug,
        stepType
      );
    } else if (stepType === "nonFunctional") {
      const service = practice.evaluation.nonFunctional;
      const validatedInput = service.validate(input);
      evaluation = await evaluateTextStep(
        validatedInput,
        problemConfig,
        stepData,
        service,
        userEmail,
        params.slug,
        stepType
      );
    } else {
      throw new Error(`Invalid step type for evaluation: ${stepType}`);
    }

    // Round the score
    evaluation.score = Math.round(evaluation.score ?? 0);

    return evaluation;
  }

  // ==========================================================================
  // Public API
  // ==========================================================================
  return {
    // ========================================================================
    // List Problems
    // ========================================================================
    async listProblems(userId?: string) {
      return practice.problem.listWithProgress(userId);
    },

    // ========================================================================
    // Get Problem Detail
    // ========================================================================
    async getProblemDetail(slug: string, userId?: string) {
      const problem = await practice.problem.findBySlug(slug);
      if (!problem) return null;

      const currentVersion = problem.versions[0];
      if (!currentVersion) return null;

      const [steps, userStepData] = await Promise.all([
        practice.problem.getSteps(problem.id),
        userId ? practice.userProblem.getStepData(userId, problem.id, currentVersion.id) : null,
      ]);

      return {
        problem,
        currentVersion,
        steps,
        userStepData,
      };
    },

    // ========================================================================
    // Save Step Data
    // ========================================================================
    async saveStepData(
      userId: string,
      slug: string,
      stepType: StepType,
      data: Record<string, unknown>
    ) {
      return practice.userProblem.save({ userId, slug, stepType, data });
    },

    // ========================================================================
    // Evaluate Step
    // ========================================================================
    async evaluateStep(
      userId: string | null,
      userEmail: string | undefined,
      slug: string,
      stepType: StepType,
      input: unknown,
      previousExtractions?: EvaluateParams["previousExtractions"],
      changedEndpointIds?: string[]
    ) {
      // Fetch problem and steps in parallel
      const problem = await practice.problem.findBySlug(slug);
      if (!problem) return { error: "PROBLEM_NOT_FOUND" as const };

      const currentVersion = problem.versions[0];
      if (!currentVersion) return { error: "VERSION_NOT_FOUND" as const };

      const allSteps = await practice.problem.getSteps(problem.id);
      const stepRecord = allSteps.find((s) => s.stepType === stepType);
      if (!stepRecord) return { error: "STEP_NOT_FOUND" as const };

      // Access control (skip for anonymous users - they can access any step)
      if (userId !== null) {
        const accessResult = await practice.accessControl.checkStepAccess(
          userId,
          problem.id,
          currentVersion.id,
          stepRecord.order
        );

        if (!accessResult.allowed) {
          return {
            error: "ACCESS_DENIED" as const,
            details: {
              currentStep: accessResult.targetStepOrder,
              maxAllowedStep: accessResult.maxVisitedStep,
            },
          };
        }

        // Save input data first - this creates userProblem/userProblemSteps if needed
        await practice.userProblem.save({
          userId,
          slug,
          stepType,
          data: input as Record<string, unknown>,
        });
      }

      // Evaluate using internal orchestrator
      const evaluation = await evaluateStepInternal(
        {
          userId: userId ?? "",
          userEmail,
          slug,
          stepType,
          input,
          previousExtractions,
          changedEndpointIds,
        },
        stepRecord,
        currentVersion.title ?? "",
        currentVersion.description ?? ""
      );

      // Persist evaluation results (skip for anonymous users)
      if (userId !== null) {
        const earnedScore = evaluation.score ?? 0;
        const maxScore = stepRecord.scoreWeight;

        await practice.userProblem.updateStepEvaluation({
          userId,
          problemId: problem.id,
          versionId: currentVersion.id,
          stepType,
          evaluation,
          earnedScore,
          maxScore,
          allSteps,
        });
      }

      return { data: evaluation };
    },

    // ========================================================================
    // Sync All Steps (bulk save cached evaluations after login)
    // ========================================================================
    async syncAllSteps(
      userId: string,
      slug: string,
      stepEvaluations: Array<{
        stepType: StepType;
        evaluation: EvaluationResult | APIEvaluationResult;
        inputData?: Record<string, unknown>;
      }>
    ) {
      const problem = await practice.problem.findBySlug(slug);
      if (!problem) return { error: "PROBLEM_NOT_FOUND" as const };

      const currentVersion = problem.versions[0];
      if (!currentVersion) return { error: "VERSION_NOT_FOUND" as const };

      const allSteps = await practice.problem.getSteps(problem.id);

      // Build step data with scores
      const steps = stepEvaluations
        .map(({ stepType, evaluation, inputData }) => {
          const stepRecord = allSteps.find((s) => s.stepType === stepType);
          if (!stepRecord) return null;

          return {
            stepType,
            evaluation,
            earnedScore: evaluation.score ?? 0,
            maxScore: stepRecord.scoreWeight,
            inputData,
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);

      if (steps.length === 0) {
        return { data: { success: true, synced: 0 } };
      }

      await practice.userProblem.syncAllStepEvaluations({
        userId,
        problemId: problem.id,
        versionId: currentVersion.id,
        steps,
        allProblemSteps: allSteps,
      });

      return { data: { success: true, synced: steps.length } };
    },

    // ========================================================================
    // Get Assistance Stream
    // ========================================================================
    async getAssistanceStream(userId: string, params: AssistanceStreamParams) {
      if (practice.assistance.isRateLimited(userId)) {
        return { error: "RATE_LIMITED" as const };
      }

      const stream = await practice.assistance.prepareStream(params);
      if (!stream) {
        return { error: "PROBLEM_NOT_FOUND" as const };
      }

      return { stream };
    },

    // ========================================================================
    // Get Scores
    // ========================================================================
    async getScores(userId: string, slug: string) {
      return practice.score.calculate(userId, slug);
    },

    // ========================================================================
    // Evaluate All Steps (batch)
    // ========================================================================
    async evaluateAllSteps(userId: string, slug: string, inputs: Record<StepType, unknown>) {
      const problem = await practice.problem.findBySlug(slug);
      if (!problem) return { error: "PROBLEM_NOT_FOUND" as const };

      const currentVersion = problem.versions[0];
      if (!currentVersion) return { error: "VERSION_NOT_FOUND" as const };

      const allSteps = await practice.problem.getSteps(problem.id);

      // Evaluate steps in parallel where possible
      const evaluationPromises = Object.entries(inputs).map(async ([stepType, input]) => {
        const stepRecord = allSteps.find((s) => s.stepType === stepType);
        if (!stepRecord) return { stepType, error: "STEP_NOT_FOUND" };

        try {
          const evaluation = await evaluateStepInternal(
            {
              userId,
              slug,
              stepType: stepType as StepType,
              input,
            },
            stepRecord,
            currentVersion.title ?? "",
            currentVersion.description ?? ""
          );

          const earnedScore = evaluation.score ?? 0;
          const maxScore = stepRecord.scoreWeight;

          await practice.userProblem.updateStepEvaluation({
            userId,
            problemId: problem.id,
            versionId: currentVersion.id,
            stepType: stepType as StepType,
            evaluation,
            earnedScore,
            maxScore,
            allSteps,
          });

          return { stepType, data: evaluation };
        } catch {
          return { stepType, error: "EVALUATION_FAILED" };
        }
      });

      const results = await Promise.all(evaluationPromises);
      return { data: results };
    },
  };
}

// ============================================================================
// Type Export
// ============================================================================

export type PracticeController = ReturnType<typeof createPracticeController>;
