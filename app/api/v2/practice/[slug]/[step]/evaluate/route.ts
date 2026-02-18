import { NextRequest, NextResponse } from "next/server";
import {
  db,
  problems,
  problemVersions,
  problemSteps,
  userProblems,
  userProblemSteps,
} from "@/packages/drizzle";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { getProfile } from "@/app/api/v2/auth/(services)/auth";
import { EVALUATION_STRATEGIES } from "@/app/api/v2/practice/(evaluation)/registry";
import {
  apiStrategy,
  type ExtractedApiInfo,
} from "@/app/api/v2/practice/(evaluation)/strategies/api";
import { validateMatchedEndpoint } from "@/app/api/v2/practice/(evaluation)/assertions/api";
import type { ApiDefinitionInput } from "@/app/api/v2/practice/(evaluation)/validation";
import {
  getGeminiModel,
  getGeminiModelForExtraction,
  getGeminiModelForApiEvaluation,
} from "@/lib/gemini";
import type {
  EvaluationResult,
  APIEvaluationResult,
} from "@/app/api/v2/practice/(evaluation)/types";
import type { ProblemConfig } from "@/domains/practice/back-end/types";
import { calculateMaxVisitedStep } from "@/domains/practice/utils/access-control";

// Helper to strip markdown code blocks if the LLM wraps JSON
const cleanJson = (raw: string) => raw.replace(/```json|```/g, "").trim();

export const runtime = "nodejs";

// ============================================================================
// Step Type Validation
// ============================================================================

const VALID_STEPS = ["functional", "nonFunctional", "api", "highLevelDesign"] as const;
type StepType = (typeof VALID_STEPS)[number];

function isValidStep(step: string): step is StepType {
  return VALID_STEPS.includes(step as StepType);
}

// ============================================================================
// Request Schema
// ============================================================================

// Version for extraction schema - increment when extraction format changes
const EXTRACTION_VERSION = 1;

const EvaluateRequestSchema = z.object({
  input: z.unknown(),
  // Previous extractions for LLM optimization (skip extraction for unchanged endpoints)
  previousExtractions: z
    .object({
      version: z.number(),
      data: z.record(z.string(), z.unknown()),
    })
    .optional(),
  // IDs of endpoints whose descriptions changed (need re-extraction even if cached)
  changedEndpointIds: z.array(z.string()).optional(),
});

// ============================================================================
// POST /api/v2/practice/[slug]/[step]/evaluate
// Evaluates user's step submission using AI
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; step: string }> }
) {
  try {
    // 1. Authenticate
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized - please sign in" }, { status: 401 });
    }

    // 2. Get and validate params
    const { slug, step } = await params;
    logger.info("POST /api/v2/practice/[slug]/[step]/evaluate - Request received", { slug, step });

    if (!isValidStep(step)) {
      return NextResponse.json(
        {
          error: "Invalid step type",
          details: { step, validSteps: VALID_STEPS },
        },
        { status: 400 }
      );
    }

    const stepType: StepType = step;

    // 3. Parse and validate request body
    const body = await request.json();
    const parseResult = EvaluateRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { input, previousExtractions, changedEndpointIds } = parseResult.data;

    // 4. Fetch problem with current version
    const problem = await db.query.problems.findFirst({
      where: eq(problems.slug, slug),
      with: {
        versions: {
          where: eq(problemVersions.isCurrent, true),
          limit: 1,
        },
      },
    });

    if (!problem) {
      return NextResponse.json({ error: "Problem not found", details: { slug } }, { status: 404 });
    }

    const currentVersion = problem.versions[0];
    if (!currentVersion) {
      return NextResponse.json(
        { error: "Problem version not found", details: { slug } },
        { status: 404 }
      );
    }

    // 5. Fetch all problem steps to check access control
    const allSteps = await db.query.problemSteps.findMany({
      where: eq(problemSteps.problemId, problem.id),
      orderBy: (steps, { asc }) => [asc(steps.order)],
    });

    // 6. Fetch the specific step being evaluated
    const stepRecord = allSteps.find((s) => s.stepType === stepType);

    if (!stepRecord) {
      return NextResponse.json(
        { error: "Problem step not found", details: { slug, step: stepType } },
        { status: 404 }
      );
    }

    // 7. Check if user has access to this step (access control)
    const userProblem = await db.query.userProblems.findFirst({
      where: and(eq(userProblems.userId, profile.id), eq(userProblems.problemId, problem.id)),
    });

    if (userProblem) {
      const userProblemStep = await db.query.userProblemSteps.findFirst({
        where: eq(userProblemSteps.userProblemId, userProblem.id),
      });

      if (userProblemStep) {
        const stepData = (userProblemStep.data as Record<string, unknown>) || {};

        // Calculate maxVisitedStep: find first incomplete step sequentially
        const maxVisitedStep = calculateMaxVisitedStep(allSteps, (step) => {
          const userStepData = stepData[step.stepType] as { status?: string } | undefined;
          return userStepData?.status === "completed";
        });

        // Check if user is trying to evaluate a step they don't have access to
        if (stepRecord.order > maxVisitedStep) {
          return NextResponse.json(
            {
              error: "Access denied",
              message: "You must complete previous steps before accessing this one",
              details: {
                currentStep: stepRecord.order,
                maxAllowedStep: maxVisitedStep,
              },
            },
            { status: 403 }
          );
        }
      }
    }

    // 8. Extract step data
    const stepData = (stepRecord.data as { requirements?: unknown }) || {};
    const requirements = stepData.requirements || [];

    logger.info("Step data loaded:", {
      slug,
      step: stepType,
      requirementsCount: Array.isArray(requirements) ? requirements.length : 0,
      stepData: JSON.stringify(stepData).substring(0, 200),
    });

    const problemConfig = {
      title: currentVersion.title ?? "",
      description: currentVersion.description ?? "",
      steps: {
        [stepType]: {
          requirements: requirements,
        },
      },
    } as unknown as ProblemConfig;

    // 9. Get evaluation strategy
    const strategy = EVALUATION_STRATEGIES[stepType];
    if (!strategy) {
      return NextResponse.json(
        { error: "Invalid step type for evaluation", details: { step: stepType } },
        { status: 400 }
      );
    }

    // 10. Validate input using the strategy
    let validatedInput;
    try {
      validatedInput = strategy.validate(input);
    } catch (validationError) {
      return NextResponse.json(
        { error: "Invalid input data", details: validationError },
        { status: 400 }
      );
    }

    // 11. Build prompt and call AI for evaluation (skip for highLevelDesign)
    let evaluation: EvaluationResult | APIEvaluationResult;

    if (stepType === "highLevelDesign") {
      // High-level design uses algorithmic evaluation, no AI needed
      evaluation = strategy.parseResponse("", problemConfig, validatedInput);
    } else if (stepType === "api") {
      // API step uses two-step evaluation: extraction then evaluation
      const apiInput = validatedInput as ApiDefinitionInput;
      const extractionModel = getGeminiModelForExtraction();
      const evaluationModel = getGeminiModelForApiEvaluation();

      // Check if we can use cached extractions (version must match)
      const canUseCachedExtractions =
        previousExtractions?.version === EXTRACTION_VERSION && previousExtractions?.data;

      // Determine which endpoints need fresh extraction (simplified logic)
      // Re-extract if: no cache, endpoint changed, or no cached extraction for endpoint
      const endpointsNeedingExtraction = apiInput.endpoints.filter((ep) => {
        // Always re-extract if no cache
        if (!canUseCachedExtractions) {
          logger.info(`[API] Extracting ${ep.id} - no cache available`);
          return true;
        }

        // Always re-extract if endpoint is in changedEndpointIds
        if (changedEndpointIds?.includes(ep.id)) {
          logger.info(`[API] Re-extracting ${ep.id} due to change detection`);
          return true;
        }

        // Always re-extract if no cached extraction for this endpoint
        if (!previousExtractions.data[ep.id]) {
          logger.info(`[API] Extracting ${ep.id} - no cached extraction`);
          return true;
        }

        return false;
      });

      // Detailed logging for extraction decision
      logger.info("[API Debug] Extraction decision:", {
        canUseCachedExtractions,
        changedEndpointIds,
        cachedEndpointIds: previousExtractions ? Object.keys(previousExtractions.data) : [],
        endpointsNeedingExtraction: endpointsNeedingExtraction.map((e) => e.id),
        endpointDescriptions: apiInput.endpoints.map((e) => ({
          id: e.id,
          desc: e.description.value.substring(0, 100),
        })),
      });

      // Step 1: Extract structured data from endpoints that need it IN PARALLEL
      logger.info("[API Evaluation] Starting extraction step", {
        slug,
        totalEndpoints: apiInput.endpoints.length,
        endpointsNeedingExtraction: endpointsNeedingExtraction.length,
        usingCachedExtractions: canUseCachedExtractions
          ? apiInput.endpoints.length - endpointsNeedingExtraction.length
          : 0,
      });

      const extractionPromises = endpointsNeedingExtraction.map(async (endpoint) => {
        const extractionPrompt = apiStrategy.buildExtractionPrompt(endpoint);
        try {
          const result = await extractionModel.generateContent(extractionPrompt);
          const rawText = result.response.text();
          const extracted = JSON.parse(cleanJson(rawText)) as ExtractedApiInfo;
          return { endpointId: endpoint.id, extracted, error: null };
        } catch (e) {
          logger.error("[API Evaluation] Extraction failed for endpoint", {
            endpointId: endpoint.id,
            error: e,
          });
          // Return a fallback extraction on error
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

      // Merge cached extractions with new extractions
      const extractions = new Map<string, ExtractedApiInfo>();

      // First, add all cached extractions (if using cache)
      if (canUseCachedExtractions) {
        for (const [id, extracted] of Object.entries(previousExtractions.data)) {
          extractions.set(id, extracted as ExtractedApiInfo);
        }
      }

      // Then, add/overwrite with fresh extractions
      for (const result of extractionResults) {
        extractions.set(result.endpointId, result.extracted);
      }

      // Debug logging for extractions
      logger.info("[API Evaluation] Extractions:", {
        extractions: JSON.stringify(Object.fromEntries(extractions), null, 2),
      });

      // Step 2: Evaluate with extracted data
      const evaluationPrompt = apiStrategy.buildEvaluationPromptWithExtractions(
        problemConfig,
        apiInput,
        extractions
      );

      logger.info("Built evaluation prompt with extractions", {
        slug,
        step: stepType,
        promptLength: evaluationPrompt.length,
      });

      const evalResult = await evaluationModel.generateContent(evaluationPrompt);
      const responseText = evalResult.response.text();

      logger.info("Received AI evaluation response", {
        slug,
        step: stepType,
        responseLength: responseText.length,
        response: responseText,
      });

      // 12. Parse AI response into evaluation result
      evaluation = strategy.parseResponse(responseText, problemConfig, validatedInput);

      // 12.5. Post-LLM validation: Check if matched extractions actually satisfy requirements
      // This catches cases where LLM is too lenient about "not specified" fields
      const apiEvaluation = evaluation as APIEvaluationResult;
      const apiRequirements = (stepData.requirements || []) as Array<{
        id: string;
        evaluationCriteria?: string;
        weight?: number;
      }>;

      for (const result of apiEvaluation.results) {
        // Only validate results where LLM marked as complete
        if (!result.complete) continue;

        const requirement = apiRequirements.find((r) => r.id === result.id);

        // Infer matchedEndpointId if LLM didn't provide it
        let effectiveMatchedEndpointId = result.matchedEndpointId;
        if (!effectiveMatchedEndpointId && requirement && "method" in requirement) {
          // Find endpoint that matches requirement's method and path
          const matchingEndpoint = apiInput.endpoints.find((ep) => {
            const methodMatches =
              ep.method.value.toUpperCase() ===
              (requirement as { method: string }).method.toUpperCase();
            const pathMatches =
              ep.path.value === (requirement as { correctPath?: string }).correctPath;
            return methodMatches && pathMatches;
          });
          if (matchingEndpoint) {
            effectiveMatchedEndpointId = matchingEndpoint.id;
            logger.info(`[API] Inferred matchedEndpointId for ${result.id}:`, {
              inferredId: effectiveMatchedEndpointId,
            });
          } else if (apiInput.endpoints.length === 1) {
            // Fallback: if only one endpoint exists, assume it's the match
            effectiveMatchedEndpointId = apiInput.endpoints[0].id;
            logger.info(`[API] Using single endpoint for ${result.id}:`, {
              singleEndpointId: effectiveMatchedEndpointId,
            });
          }
        }

        if (!effectiveMatchedEndpointId) continue;

        const matchedExtraction = extractions.get(effectiveMatchedEndpointId);

        // Diagnostic logging: what is being validated
        logger.info(`[API] Post-validation checking ${result.id}:`, {
          matchedEndpointId: effectiveMatchedEndpointId,
          extraction: matchedExtraction
            ? {
                requestBody: matchedExtraction.requestBody,
                responseFormat: matchedExtraction.responseFormat,
                successStatusCode: matchedExtraction.successStatusCode,
                errorCasesCount: matchedExtraction.errorCases?.length || 0,
              }
            : "none",
          criteriaPreview: requirement?.evaluationCriteria?.substring(0, 100),
        });

        if (requirement?.evaluationCriteria) {
          const validation = validateMatchedEndpoint(
            matchedExtraction,
            requirement.evaluationCriteria
          );

          // Diagnostic logging: validation result
          logger.info(`[API] Post-validation result for ${result.id}:`, {
            passed: validation.passed,
            failedReason: validation.failedReason || "none",
          });

          if (!validation.passed) {
            logger.info(`[API] Post-validation override for ${result.id}:`, {
              matchedEndpointId: effectiveMatchedEndpointId,
              reason: validation.failedReason,
            });

            // Override the result - find the matched endpoint for itemIds
            const matchedEp = apiInput.endpoints.find((ep) => ep.id === effectiveMatchedEndpointId);

            result.complete = false;
            result.correctDescription = false; // Critical: frontend uses this to calculate score
            result.feedback = `${validation.failedReason}. ${result.feedback || ""}`.trim();
            if (matchedEp) {
              result.itemIds = [matchedEp.description.id];
            }
          }
        }
      }

      // Recalculate score after post-validation overrides
      const reqWeights = new Map(apiRequirements.map((r) => [r.id, r.weight || 0]));
      apiEvaluation.score = apiEvaluation.results.reduce((acc, res) => {
        if (res.complete) {
          return acc + (reqWeights.get(res.id) || 0);
        }
        return acc;
      }, 0);

      evaluation = apiEvaluation;

      // Add extractions to response for caching on frontend
      evaluation = {
        ...evaluation,
        extractions: {
          version: EXTRACTION_VERSION,
          data: Object.fromEntries(extractions),
        },
      };
    } else {
      // Check for empty text submissions — skip LLM and return first requirement feedback
      const textInput = validatedInput as { textField?: { id: string; value: string } };
      const isEmptyText = textInput.textField && !textInput.textField.value.trim();

      if (isEmptyText) {
        const stepRequirements =
          (requirements as Array<{
            id: string;
            feedbackOnMissing?: string;
            hints?: Array<{ id: string }>;
          }>) || [];
        const firstReq = stepRequirements[0];

        evaluation = {
          feedback:
            firstReq?.feedbackOnMissing || "Try describing some requirements to get started.",
          score: 0,
          results: stepRequirements.map((req, index) => ({
            id: req.id,
            complete: false,
            ...(index === 0
              ? {
                  feedback: firstReq?.feedbackOnMissing,
                  hintId: req.hints?.[0]?.id,
                  itemIds: [textInput.textField!.id],
                }
              : {}),
          })),
        };

        logger.info("Empty text submission — skipped LLM call", {
          slug,
          step: stepType,
          requirementsCount: stepRequirements.length,
        });
      } else {
        // Other step types use single-shot evaluation
        const prompt = strategy.buildPrompt(problemConfig, validatedInput);
        logger.info("Built prompt for evaluation", {
          slug,
          step: stepType,
          promptLength: prompt.length,
        });

        const model = getGeminiModel();
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        logger.info("Received AI response", {
          slug,
          step: stepType,
          responseLength: responseText.length,
          response: responseText,
        });

        // 12. Parse AI response into evaluation result
        evaluation = strategy.parseResponse(responseText, problemConfig, validatedInput);
      }
    }

    // Round the score before checking completion
    evaluation.score = Math.round(evaluation.score ?? 0);

    // The evaluation score is already the earned points (sum of requirement weights)
    const maxScore = stepRecord.scoreWeight;
    const earnedScore = evaluation.score;

    // Check if step is completed (earned all possible points)
    const isStepCompleted = earnedScore === maxScore;

    // 13. Store evaluation result in database
    // Get or create user problem (re-fetch in case it was created during access check)
    let userProblemRecord = await db.query.userProblems.findFirst({
      where: and(eq(userProblems.userId, profile.id), eq(userProblems.problemId, problem.id)),
    });

    if (!userProblemRecord) {
      const [created] = await db
        .insert(userProblems)
        .values({
          userId: profile.id,
          problemId: problem.id,
          problemVersionId: currentVersion.id,
          status: "in_progress",
        })
        .returning();
      userProblemRecord = created;
    }

    // Update user problem step with evaluation
    const now = new Date();
    const userProblemStepRecord = await db.query.userProblemSteps.findFirst({
      where: eq(userProblemSteps.userProblemId, userProblemRecord.id),
    });

    // Prepare updated data to check for full completion
    let updatedStepData: Record<string, unknown>;
    const currentStepUpdate = {
      evaluation: evaluation,
      evaluatedAt: now.toISOString(),
      earnedScore,
      maxScore,
      status: isStepCompleted ? "completed" : "in_progress",
    };

    if (userProblemStepRecord) {
      const existingData = (userProblemStepRecord.data as Record<string, unknown>) || {};
      updatedStepData = {
        ...existingData,
        [stepType]: {
          ...((existingData[stepType] as Record<string, unknown>) || {}),
          ...currentStepUpdate,
        },
      };

      await db
        .update(userProblemSteps)
        .set({
          data: updatedStepData,
          status: isStepCompleted ? "completed" : userProblemStepRecord.status,
          completedAt: isStepCompleted ? now : userProblemStepRecord.completedAt,
          updatedAt: now,
        })
        .where(eq(userProblemSteps.id, userProblemStepRecord.id));
    } else {
      updatedStepData = {
        [stepType]: currentStepUpdate,
      };

      await db.insert(userProblemSteps).values({
        userProblemId: userProblemRecord.id,
        status: isStepCompleted ? "completed" : "in_progress",
        data: updatedStepData,
        completedAt: isStepCompleted ? now : null,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Check if ALL steps are completed
    const isProblemCompleted = allSteps.every((step) => {
      const stepData = updatedStepData[step.stepType] as { status?: string } | undefined;
      return stepData?.status === "completed";
    });

    // Update userProblem timestamp and status
    await db
      .update(userProblems)
      .set({
        updatedAt: now,
        status: isProblemCompleted ? "completed" : "in_progress",
        completedAt: isProblemCompleted ? now : null,
      })
      .where(eq(userProblems.id, userProblemRecord.id));

    // 14. Return evaluation result with rounded score
    logger.info("POST /api/v2/practice/[slug]/[step]/evaluate - Response sent", {
      data: evaluation,
    });
    return NextResponse.json({
      ...evaluation,
    });
  } catch (error) {
    logger.error("POST /api/v2/practice/[slug]/[step]/evaluate - Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
