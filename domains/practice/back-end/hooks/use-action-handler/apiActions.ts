import { track } from "@/lib/analytics";
import { STEPS } from "../../constants";
import { stepStateStore } from "../../store/store";
import practiceActions from "../../actions";
import { getChangedFields, mergeEvaluationResults } from "../../api-design/changeDetection";
import { reportActionError } from "./errorHandling";
import type { HttpMethod } from "../../api-design/components/MethodSelect";
import type { ApiDeps, StepHandler, EndpointItem } from "./types";

export function createApiHandler(deps: ApiDeps): StepHandler {
  const {
    slug,
    router,
    isSignedIn: _isSignedIn,
    searchParams,
    apiDesign,
    setApiDesign,
    setModalOpen,
    setIsActionLoading,
    setActionError,
    setStepCompletion,
  } = deps;

  return async (action, ...args) => {
    if (action === "back") {
      const endpointParam = searchParams.get("endpoint");
      if (endpointParam) {
        router.push(`/practice/${slug}/api`);
      } else {
        router.push(`/practice/${slug}/non-functional`);
      }
      return;
    }

    if (action === "next") {
      track("practice_api_attempted", { slug });

      try {
        // Get fresh state directly from store (not stale closure)
        const freshState = stepStateStore.getState();
        const problemState = freshState.problems[slug];
        const currentApiDesign = problemState?.apiDesign || { endpoints: [] };

        const previousSubmission = currentApiDesign.submission;
        const currentEndpoints = currentApiDesign.endpoints || [];

        // Check what changed since last evaluation
        const changedFieldsMap = getChangedFields(currentEndpoints, previousSubmission);
        const changedEndpointIds = new Set(changedFieldsMap.keys());

        // If nothing changed and we have valid results, just show them
        const hasValidResults =
          previousSubmission?.results && previousSubmission.results.length > 0;
        if (changedEndpointIds.size === 0 && hasValidResults) {
          setModalOpen(true);
          return;
        }

        // Identify endpoints that passed and haven't changed (skip re-evaluation)
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

        const endpointsToEvaluate = currentEndpoints.filter(
          (ep) => !passedUnchangedEndpointIds.has(ep.id)
        );

        if (endpointsToEvaluate.length === 0 && previousSubmission) {
          setModalOpen(true);
          return;
        }

        setActionError(null);
        setIsActionLoading(true);

        const evaluationResponse = await practiceActions.api.evaluate(
          slug,
          endpointsToEvaluate,
          previousSubmission?.extractions,
          Array.from(changedEndpointIds)
        );
        setIsActionLoading(false);

        // Merge results
        const mergedResponse = mergeEvaluationResults(
          evaluationResponse,
          previousSubmission,
          changedEndpointIds
        );

        // Merge extractions
        if (previousSubmission?.extractions || evaluationResponse.extractions) {
          mergedResponse.extractions = {
            version:
              evaluationResponse.extractions?.version ||
              previousSubmission?.extractions?.version ||
              1,
            data: {
              ...(previousSubmission?.extractions?.data || {}),
              ...(evaluationResponse.extractions?.data || {}),
            },
          };
        }

        // Fix evaluatedInput to include ALL current endpoints
        mergedResponse.evaluatedInput = {
          endpoints: currentEndpoints.map((ep) => ({
            id: ep.id,
            method: ep.method.value,
            path: ep.path.value,
            description: ep.description.value,
          })),
        };

        const allComplete = mergedResponse.results.every(
          (result: { complete: boolean }) => result.complete
        );
        const currentAttempts = currentApiDesign.attempts ?? 0;
        const newAttempts = allComplete ? 0 : currentAttempts + 1;

        setApiDesign({
          submission: mergedResponse,
          attempts: newAttempts,
        });

        // Update step completion status for stepper
        setStepCompletion("api", allComplete);

        track("practice_api_completed", { slug, score: mergedResponse.score });
        setModalOpen(true);
      } catch (error) {
        reportActionError({
          slug,
          step: "api",
          error,
          message: "Failed to save/evaluate API endpoints:",
          setActionError,
        });
        setIsActionLoading(false);
      }
      return;
    }

    if (action === "continue") {
      setModalOpen(false);
      router.push(`/practice/${slug}/high-level-design`);
      return;
    }

    if (action === "revise") {
      track("practice_step_revised", {
        slug,
        step: "api",
        attempts: apiDesign.attempts ?? 0,
      });
      setModalOpen(false);
      return;
    }

    if (action === "changeInput" || action === "changeTextBox") {
      const [endpointId, field, value] = args as [string, string, string];
      const endpoints = apiDesign.endpoints || [];

      const updatedEndpoints = endpoints.map((endpoint) => {
        if (endpoint.id !== endpointId) return endpoint;

        if (field === "method") {
          return { ...endpoint, method: { ...endpoint.method, value: value as HttpMethod } };
        }
        if (field === "path") {
          return { ...endpoint, path: { ...endpoint.path, value } };
        }
        if (field === "description") {
          return { ...endpoint, description: { ...endpoint.description, value } };
        }
        return endpoint;
      });

      setApiDesign({
        endpoints: updatedEndpoints,
        submission: apiDesign.submission ? { ...apiDesign.submission, results: [] } : undefined,
      });
      return;
    }

    if (action === "addEndpoint") {
      const [newEndpoint] = args as [EndpointItem];
      const endpoints = apiDesign.endpoints || [];

      setApiDesign({
        endpoints: [...endpoints, newEndpoint],
        submission: apiDesign.submission ? { ...apiDesign.submission, results: [] } : undefined,
      });
      return;
    }

    if (action === "deleteEndpoint") {
      const [endpointId] = args as [string];
      const endpoints = apiDesign.endpoints || [];

      setApiDesign({
        endpoints: endpoints.filter((ep) => ep.id !== endpointId),
        submission: apiDesign.submission ? { ...apiDesign.submission, results: [] } : undefined,
      });
      return;
    }

    if (action === "insert") {
      const [updatedEndpoints] = args as [EndpointItem[]];
      track("practice_solution_inserted", {
        slug,
        step: "api",
        attempts: apiDesign.attempts ?? 0,
      });
      setApiDesign({
        endpoints: updatedEndpoints,
        submission: undefined,
      });
      return;
    }

    if (action === "assistanceQuestion") {
      track("assistance_question_submitted", { slug, step: STEPS.API });
    }
  };
}
