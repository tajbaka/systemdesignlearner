import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { track } from "@/lib/analytics";
import { STEPS } from "../constants";
import type { StepHandlers } from "../types";
import useStepStateStore from "./useStore";
import { stepStateStore, type EndpointItem } from "../store/store";
import type { PracticeDesignState } from "../high-level-design/types";
import type { HttpMethod } from "../api-design/components/MethodSelect";
import functionalActions from "../functional/actions";
import nonFunctionalActions from "../non-functional/actions";
import apiActions from "../api-design/actions";
import highLevelDesignActions from "../high-level-design/actions";
import scoreActions from "../score/actions";
import { getChangedFields, mergeEvaluationResults } from "../api-design/changeDetection";
import { shouldIgnoreClientError } from "@/lib/client-errors";

/**
 * Hook that maps steps to their handler functions
 * Each step can have its own handler logic (navigation, analytics, etc.)
 * Handlers are invoked with an action type specific to each step
 *
 * @param slug - The problem slug identifier (e.g., "url-shortener", "pastebin")
 * @returns An object mapping step types to their handler functions
 */
export function useActionHandler(slug: string): StepHandlers {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    functionalRequirements,
    setFunctionalRequirements,
    nonFunctionalRequirements,
    setNonFunctionalRequirements,
    apiDesign,
    setApiDesign,
    highLevelDesign,
    setHighLevelDesign,
    setScore,
    setModalOpen,
    setIsActionLoading,
    setActionError,
  } = useStepStateStore(slug);

  const reportActionError = useCallback(
    (step: string, error: unknown, message: string) => {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong. Please try again.";

      if (!shouldIgnoreClientError(error)) {
        console.error(message, error);
        track("practice_evaluation_error", {
          slug,
          step,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        setActionError(errorMessage);
      } else {
        setActionError(null);
      }

      setIsActionLoading(false);
    },
    [slug, setActionError, setIsActionLoading]
  );

  const handlers: StepHandlers = useMemo<StepHandlers>(
    () => ({
      [STEPS.INTRO]: (action, hasStarted) => {
        if (action === "start") {
          // Track analytics
          track("practice_intro_start", {
            slug: slug,
            hasStarted: hasStarted,
          });

          // If user has started, use continue=true to redirect to appropriate step
          // Otherwise, navigate to first step (functional)
          if (hasStarted) {
            router.push(`/practice/${slug}?continue=true`);
          } else {
            router.push(`/practice/${slug}/functional`);
          }
        }
      },
      [STEPS.FUNCTIONAL]: async (action, ...args) => {
        if (action === "back") {
          router.push(`/practice/${slug}`);
        } else if (action === "next") {
          track("practice_functional_attempted", {
            slug: slug,
          });

          try {
            // Check if results already exist
            if (functionalRequirements.submission) {
              // Results exist, just open modal
              setModalOpen(true);
              return;
            }

            // First, save the data with "submitted" status
            await functionalActions.saveFunctionalRequirements(slug, functionalRequirements);

            // Then, evaluate using AI
            setActionError(null);
            setIsActionLoading(true);

            const evaluationResponse = await functionalActions.evaluate(
              slug,
              functionalRequirements
            );
            setIsActionLoading(false);

            // Check if all requirements are complete
            const allComplete = evaluationResponse.results.every(
              (result: { complete: boolean }) => result.complete
            );
            const currentAttempts = functionalRequirements.attempts ?? 0;
            const newAttempts = allComplete ? 0 : currentAttempts + 1;

            // Save results to store
            setFunctionalRequirements({
              submission: evaluationResponse,
              attempts: newAttempts,
            });

            // Track analytics
            track("practice_functional_completed", {
              slug: slug,
              score: evaluationResponse.score,
            });

            // Open modal to show results
            setModalOpen(true);
          } catch (error) {
            reportActionError(
              "functional",
              error,
              "Failed to save/evaluate functional requirements:"
            );
          }
        } else if (action === "continue") {
          // Close modal and navigate to next step
          setModalOpen(false);
          router.push(`/practice/${slug}/non-functional`);
        } else if (action === "revise") {
          // Track revision - indicates user needs another attempt
          track("practice_step_revised", {
            slug: slug,
            step: "functional",
            attempts: functionalRequirements.attempts ?? 0,
          });
          // Just close modal so user can revise their answer
          setModalOpen(false);
        } else if (action === "changeTextBox") {
          const [value] = args as [string];
          const updatedRequirements = {
            ...functionalRequirements,
            textField: {
              ...functionalRequirements.textField,
              value,
            },
            submission: undefined, // Clear results when user modifies their answer
          };

          // Update the text field in state
          setFunctionalRequirements(updatedRequirements);
        } else if (action === "insert") {
          const [solutionText] = args as [string];
          // Track solution insertion - indicates user gave up on self-solving
          track("practice_solution_inserted", {
            slug: slug,
            step: "functional",
            attempts: functionalRequirements.attempts ?? 0,
          });
          const updatedRequirements = {
            ...functionalRequirements,
            textField: {
              ...functionalRequirements.textField,
              value: solutionText,
            },
            submission: undefined, // Clear results when user inserts solution
          };
          setFunctionalRequirements(updatedRequirements);
        } else if (action === "assistanceQuestion") {
          track("assistance_question_submitted", {
            slug,
            step: STEPS.FUNCTIONAL,
          });
        }
      },
      [STEPS.NON_FUNCTIONAL]: async (action, ...args) => {
        if (action === "back") {
          router.push(`/practice/${slug}/functional`);
        } else if (action === "next") {
          track("practice_non_functional_attempted", {
            slug: slug,
          });

          try {
            // Check if results already exist
            if (nonFunctionalRequirements.submission) {
              // Results exist, just open modal
              setModalOpen(true);
              return;
            }

            // First, save the data with "submitted" status
            await nonFunctionalActions.saveNonFunctionalRequirements(
              slug,
              nonFunctionalRequirements
            );

            // Then, evaluate using AI
            setActionError(null);
            setIsActionLoading(true);
            const evaluationResponse = await nonFunctionalActions.evaluate(
              slug,
              nonFunctionalRequirements
            );
            setIsActionLoading(false);

            // Check if all requirements are complete
            const allComplete = evaluationResponse.results.every(
              (result: { complete: boolean }) => result.complete
            );
            const currentAttempts = nonFunctionalRequirements.attempts ?? 0;
            const newAttempts = allComplete ? 0 : currentAttempts + 1;

            // Save results to store
            setNonFunctionalRequirements({
              submission: evaluationResponse,
              attempts: newAttempts,
            });

            // Track analytics
            track("practice_non_functional_completed", {
              slug: slug,
              score: evaluationResponse.score,
            });

            // Open modal to show results
            setModalOpen(true);
          } catch (error) {
            reportActionError(
              "non_functional",
              error,
              "Failed to save/evaluate non-functional requirements:"
            );
          }
        } else if (action === "continue") {
          // Close modal and navigate to next step
          setModalOpen(false);
          router.push(`/practice/${slug}/api`);
        } else if (action === "revise") {
          // Track revision - indicates user needs another attempt
          track("practice_step_revised", {
            slug: slug,
            step: "non_functional",
            attempts: nonFunctionalRequirements.attempts ?? 0,
          });
          // Just close modal so user can revise their answer
          setModalOpen(false);
        } else if (action === "changeTextBox") {
          const [value] = args as [string];
          const updatedRequirements = {
            ...nonFunctionalRequirements,
            textField: {
              ...nonFunctionalRequirements.textField,
              value,
            },
            submission: undefined, // Clear results when user modifies their answer
          };

          // Update the text field in state
          setNonFunctionalRequirements(updatedRequirements);
        } else if (action === "insert") {
          const [solutionText] = args as [string];
          // Track solution insertion - indicates user gave up on self-solving
          track("practice_solution_inserted", {
            slug: slug,
            step: "non_functional",
            attempts: nonFunctionalRequirements.attempts ?? 0,
          });
          const updatedRequirements = {
            ...nonFunctionalRequirements,
            textField: {
              ...nonFunctionalRequirements.textField,
              value: solutionText,
            },
            submission: undefined, // Clear results when user inserts solution
          };
          setNonFunctionalRequirements(updatedRequirements);
        } else if (action === "assistanceQuestion") {
          track("assistance_question_submitted", {
            slug,
            step: STEPS.NON_FUNCTIONAL,
          });
        }
      },
      [STEPS.API]: async (action, ...args) => {
        if (action === "back") {
          // If we're editing an endpoint (has endpoint query param), go back to API step list
          const endpointParam = searchParams.get("endpoint");
          if (endpointParam) {
            router.push(`/practice/${slug}/api`);
          } else {
            router.push(`/practice/${slug}/non-functional`);
          }
        } else if (action === "next") {
          track("practice_api_attempted", {
            slug: slug,
          });

          try {
            // Get FRESH state directly from store (not stale closure)
            // This ensures we always send the latest user data to the backend
            const freshState = stepStateStore.getState();
            const problemState = freshState.problems[slug];
            const currentApiDesign = problemState?.apiDesign || { endpoints: [] };

            const previousSubmission = currentApiDesign.submission;
            const currentEndpoints = currentApiDesign.endpoints || [];

            // Check what changed since last evaluation (field-level detection)
            const changedFieldsMap = getChangedFields(currentEndpoints, previousSubmission);
            const changedEndpointIds = new Set(changedFieldsMap.keys());

            // Debug logging for change detection
            console.log("[API Debug] Change detection:", {
              totalEndpoints: currentEndpoints.length,
              changedEndpointIds: Array.from(changedEndpointIds),
              endpointsToEvaluate: currentEndpoints
                .filter(
                  (ep) => !changedEndpointIds.has(ep.id) === false || changedEndpointIds.has(ep.id)
                )
                .map((e) => ({
                  id: e.id,
                  desc: e.description.value.substring(0, 50),
                })),
              previousEvaluatedInput: previousSubmission?.evaluatedInput?.endpoints?.map((e) => ({
                id: e.id,
                desc: e.description.substring(0, 50),
              })),
            });

            // If nothing changed and we have results, just show them
            // BUT: If results is empty array, that means user changed something and we cleared results
            // In that case, we should re-evaluate
            const hasValidResults =
              previousSubmission?.results && previousSubmission.results.length > 0;
            if (changedEndpointIds.size === 0 && hasValidResults) {
              setModalOpen(true);
              return;
            }

            // Phase 3 optimization: Identify endpoints that have passed and haven't changed
            // These don't need re-evaluation - we can preserve their results
            const passedUnchangedEndpointIds = new Set<string>();
            if (previousSubmission?.results) {
              for (const result of previousSubmission.results) {
                if (
                  result.complete &&
                  result.matchedEndpointId &&
                  !changedEndpointIds.has(result.matchedEndpointId)
                ) {
                  passedUnchangedEndpointIds.add(result.matchedEndpointId);
                }
              }
            }

            // Filter to only endpoints that actually need evaluation
            const endpointsToEvaluate = currentEndpoints.filter(
              (ep) => !passedUnchangedEndpointIds.has(ep.id)
            );

            // If no endpoints need evaluation (all are passed and unchanged), show cached results
            if (endpointsToEvaluate.length === 0 && previousSubmission) {
              setModalOpen(true);
              return;
            }

            // First, save the data with "submitted" status
            await apiActions.saveApiEndpoints(slug, currentEndpoints, "submitted");

            // Then, evaluate using AI (only send endpoints that need evaluation)
            // Pass cached extractions to skip LLM extraction calls for unchanged endpoints
            // Also pass changedEndpointIds so backend knows which extractions to invalidate
            setActionError(null);
            setIsActionLoading(true);
            const evaluationResponse = await apiActions.evaluate(
              slug,
              endpointsToEvaluate,
              previousSubmission?.extractions,
              Array.from(changedEndpointIds) // Tell backend which endpoints need re-extraction
            );
            setIsActionLoading(false);

            // Merge with previous results:
            // 1. Preserve passed results for endpoints we didn't re-evaluate
            // 2. Merge new evaluation results with changedEndpointIds for regression protection
            const mergedResponse = mergeEvaluationResults(
              evaluationResponse,
              previousSubmission,
              changedEndpointIds
            );

            // Merge extractions: keep old extractions + add new ones
            // CachedExtractions has { version, data } structure
            if (previousSubmission?.extractions || evaluationResponse.extractions) {
              const mergedExtractionsData = {
                ...(previousSubmission?.extractions?.data || {}),
                ...(evaluationResponse.extractions?.data || {}),
              };
              mergedResponse.extractions = {
                version:
                  evaluationResponse.extractions?.version ||
                  previousSubmission?.extractions?.version ||
                  1,
                data: mergedExtractionsData,
              };
            }

            // IMPORTANT: Fix evaluatedInput to include ALL current endpoints
            // When we filter endpoints before sending, the backend only returns evaluatedInput
            // for the endpoints we sent. We need to include all endpoints for change detection.
            mergedResponse.evaluatedInput = {
              endpoints: currentEndpoints.map((ep) => ({
                id: ep.id,
                method: ep.method.value,
                path: ep.path.value,
                description: ep.description.value,
              })),
            };

            // Check if all requirements are complete
            const allComplete = mergedResponse.results.every(
              (result: { complete: boolean }) => result.complete
            );
            const currentAttempts = currentApiDesign.attempts ?? 0;
            const newAttempts = allComplete ? 0 : currentAttempts + 1;

            // Save results to store
            setApiDesign({
              submission: mergedResponse,
              attempts: newAttempts,
            });

            // Track analytics
            track("practice_api_completed", {
              slug: slug,
              score: mergedResponse.score,
            });

            // Open modal to show results
            setModalOpen(true);
          } catch (error) {
            reportActionError("api", error, "Failed to save/evaluate API endpoints:");
          }
        } else if (action === "continue") {
          // Close modal and navigate to next step
          setModalOpen(false);
          router.push(`/practice/${slug}/high-level-design`);
        } else if (action === "revise") {
          // Track revision - indicates user needs another attempt
          track("practice_step_revised", {
            slug: slug,
            step: "api",
            attempts: apiDesign.attempts ?? 0,
          });
          // Just close modal so user can revise their answer
          setModalOpen(false);
        } else if (action === "changeInput" || action === "changeTextBox") {
          const [endpointId, field, value] = args as [string, string, string];
          const endpoints = apiDesign.endpoints || [];

          // Find and update the specific endpoint
          const updatedEndpoints = endpoints.map((endpoint) => {
            if (endpoint.id === endpointId) {
              if (field === "method") {
                return { ...endpoint, method: { ...endpoint.method, value: value as HttpMethod } };
              } else if (field === "path") {
                return { ...endpoint, path: { ...endpoint.path, value } };
              } else if (field === "description") {
                return { ...endpoint, description: { ...endpoint.description, value } };
              }
            }
            return endpoint;
          });

          // Clear results to stop highlighting, but keep evaluatedInput for change detection
          setApiDesign({
            endpoints: updatedEndpoints,
            submission: apiDesign.submission
              ? {
                  ...apiDesign.submission,
                  results: [], // Clear results to remove highlighting
                }
              : undefined,
          });
        } else if (action === "addEndpoint") {
          const [newEndpoint] = args as [EndpointItem];
          const endpoints = apiDesign.endpoints || [];

          // Clear results to stop highlighting, but keep evaluatedInput for change detection
          setApiDesign({
            endpoints: [...endpoints, newEndpoint],
            submission: apiDesign.submission
              ? {
                  ...apiDesign.submission,
                  results: [], // Clear results to remove highlighting
                }
              : undefined,
          });
        } else if (action === "deleteEndpoint") {
          const [endpointId] = args as [string];
          const endpoints = apiDesign.endpoints || [];

          // Clear results to stop highlighting, but keep evaluatedInput for change detection
          setApiDesign({
            endpoints: endpoints.filter((endpoint) => endpoint.id !== endpointId),
            submission: apiDesign.submission
              ? {
                  ...apiDesign.submission,
                  results: [], // Clear results to remove highlighting
                }
              : undefined,
          });
        } else if (action === "insert") {
          const [updatedEndpoints] = args as [EndpointItem[]];
          // Track solution insertion - indicates user gave up on self-solving
          track("practice_solution_inserted", {
            slug: slug,
            step: "api",
            attempts: apiDesign.attempts ?? 0,
          });
          setApiDesign({
            endpoints: updatedEndpoints,
            submission: undefined, // Clear results when user inserts solution
          });
        } else if (action === "assistanceQuestion") {
          track("assistance_question_submitted", {
            slug,
            step: STEPS.API,
          });
        }
      },
      [STEPS.HIGH_LEVEL_DESIGN]: async (action, ...args) => {
        if (action === "back") {
          router.push(`/practice/${slug}/api`);
        } else if (action === "next") {
          track("practice_high_level_design_attempted", {
            slug: slug,
          });

          try {
            // Check if results already exist
            if (highLevelDesign.submission) {
              // Results exist, just open modal
              setModalOpen(true);
              return;
            }

            // First, save the data
            await highLevelDesignActions.saveHighLevelDesign(slug, highLevelDesign.design);

            // Then, evaluate
            setActionError(null);
            setIsActionLoading(true);
            const evaluationResponse = await highLevelDesignActions.evaluate(
              slug,
              highLevelDesign.design
            );
            setIsActionLoading(false);

            // Check if all requirements are complete
            const allComplete = evaluationResponse.results.every(
              (result: { complete: boolean }) => result.complete
            );
            const currentAttempts = highLevelDesign.attempts ?? 0;
            const newAttempts = allComplete ? 0 : currentAttempts + 1;

            // Save results to store
            setHighLevelDesign({
              submission: evaluationResponse,
              attempts: newAttempts,
            });

            // Track analytics
            track("practice_high_level_design_completed", {
              slug: slug,
              score: evaluationResponse.score,
            });

            // Open modal to show results
            setModalOpen(true);
          } catch (error) {
            reportActionError(
              "high_level_design",
              error,
              "Failed to save/evaluate high-level design:"
            );
          }
        } else if (action === "continue") {
          // Close modal and navigate to next step
          setModalOpen(false);
          router.push(`/practice/${slug}/score`);
        } else if (action === "revise") {
          // Track revision - indicates user needs another attempt
          track("practice_step_revised", {
            slug: slug,
            step: "high_level_design",
            attempts: highLevelDesign.attempts ?? 0,
          });
          // Just close modal so user can revise their answer
          setModalOpen(false);
        } else if (action === "updateDiagram") {
          const [diagramData] = args as [PracticeDesignState];
          setHighLevelDesign({ design: diagramData, submission: undefined }); // Clear results when user modifies their answer
        } else if (action === "insert") {
          const [diagramData] = args as [PracticeDesignState];
          setHighLevelDesign({
            design: diagramData,
            submission: undefined, // Clear results when user inserts solution
          });
        } else if (action === "assistanceQuestion") {
          track("assistance_question_submitted", {
            slug,
            step: STEPS.HIGH_LEVEL_DESIGN,
          });
        }
      },
      [STEPS.SCORE]: async (action) => {
        console.log("[SCORE handler] Action:", action);
        if (action === "back") {
          router.push(`/practice/${slug}/high-level-design`);
        } else if (action === "home") {
          router.push("/practice");
        } else if (action === "getScore") {
          try {
            console.log("[SCORE handler] Fetching score for slug:", slug);
            // Call the API to get the score using the action
            const data = await scoreActions.getScore(slug);
            console.log("[SCORE handler] Score data received:", data);

            // Save the score data to store
            setScore({
              stepScores: data.stepScores,
            });

            // Calculate total score for analytics
            const totalScore = data.stepScores.reduce((sum, step) => sum + step.score, 0);

            // Check if all steps passed on first attempt (no retries needed)
            // Get fresh state to check attempts from local store
            const freshState = stepStateStore.getState();
            const problemState = freshState.problems[slug];
            const allStepsPassedFirst =
              problemState &&
              (problemState.functionalRequirements.attempts ?? 0) === 0 &&
              (problemState.nonFunctionalRequirements.attempts ?? 0) === 0 &&
              (problemState.apiDesign.attempts ?? 0) === 0 &&
              (problemState.highLevelDesign.attempts ?? 0) === 0;

            // Track analytics
            track("practice_score_fetched", {
              slug: slug,
              totalScore: totalScore,
            });

            // Track first-pass win if all steps passed without retries
            if (allStepsPassedFirst) {
              track("practice_pass_first", {
                slug: slug,
                totalScore: totalScore,
              });
            }
          } catch (error) {
            if (!shouldIgnoreClientError(error)) {
              console.error("Failed to fetch score:", error);
              track("practice_evaluation_error", {
                slug: slug,
                step: "score",
                error: error instanceof Error ? error.message : "Unknown error",
              });
              setActionError(
                error instanceof Error ? error.message : "Something went wrong. Please try again."
              );
            }
          }
        } else if (action === "assistanceQuestion") {
          track("assistance_question_submitted", {
            slug,
            step: STEPS.SCORE,
          });
        }
      },
      // Add more step handlers here as needed
    }),
    [
      slug,
      searchParams,
      router,
      functionalRequirements,
      nonFunctionalRequirements,
      apiDesign,
      highLevelDesign,
      setFunctionalRequirements,
      setNonFunctionalRequirements,
      setApiDesign,
      setHighLevelDesign,
      setScore,
      setModalOpen,
      setIsActionLoading,
      reportActionError,
      setActionError,
    ]
  );

  return handlers;
}
