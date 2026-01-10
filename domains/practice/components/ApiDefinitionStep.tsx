"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePracticeSession } from "./PracticeSessionProvider";
import { VoiceCaptureBridge } from "./VoiceCaptureBridge";
import type { ApiEndpoint, ApiEndpointConfig } from "@/domains/practice/types";
import { getApiNotesPlaceholder } from "@/domains/practice/lib/apiPlaceholders";
import { on, emit } from "@/domains/practice/lib/events";
import { loadScoringConfig, getScoringConfigSync } from "@/domains/practice/scoring";

const METHOD_OPTIONS: Array<ApiEndpoint["method"]> = ["GET", "POST", "PATCH", "DELETE"];

const createEndpoint = (): ApiEndpoint => ({
  id: `endpoint-${crypto.randomUUID()}`,
  method: "GET",
  path: "new-endpoint",
  notes: "",
  suggested: false,
});

export function ApiDefinitionStep() {
  const { state, setApiDefinition, setStepScore, updateIterativeFeedback, isReadOnly } =
    usePracticeSession();
  const endpoints = useMemo(() => state.apiDefinition.endpoints, [state.apiDefinition.endpoints]);
  const [openId, setOpenId] = useState<string | null>(() => endpoints[0]?.id ?? null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(endpoints.map((ep) => ep.id))
  );
  const [touchedEndpoints, setTouchedEndpoints] = useState<Set<string>>(new Set());

  // Mobile editor state
  const [mobileEditingId, setMobileEditingId] = useState<string | null>(null);

  // Track if we should show highlights (persists after modal closes)
  const [showHighlights, setShowHighlights] = useState(false);

  // Check if there's a blocking feedback result
  const cachedResult = state.iterativeFeedback?.api?.cachedResult;
  const hasBlockingFeedback = cachedResult?.ui?.blocking ?? false;
  const feedbackMessage = cachedResult?.ui?.nextPrompt?.toLowerCase() ?? "";

  // Determine which endpoints should be highlighted based on feedback keywords
  // Memoized to prevent infinite loop in useEffect
  // Map of endpoint ID to field type ('path' or 'notes')
  const endpointsToHighlight = useMemo(() => {
    if (!showHighlights || !feedbackMessage) return new Map<string, "path" | "notes">();

    const highlightMap = new Map<string, "path" | "notes">();
    const redirectKeywords = ["redirect", "301", "302", "3xx", "307", "308"];
    const createKeywords = ["create", "creation", "shorten", "generate", "creating"];
    const analyticsKeywords = ["analytics", "metrics", "statistics", "stats", "tracking"];

    // Keywords that indicate path-specific feedback
    const pathKeywords = [
      "path",
      "structure",
      "url structure",
      "endpoint structure",
      "identifier",
      "slug",
      "route",
    ];
    const isPathFeedback = pathKeywords.some((kw) => feedbackMessage.includes(kw));

    // Keywords that indicate we're designing/creating a new endpoint (focus on path)
    const endpointDesignKeywords = [
      "design",
      "what endpoint",
      "which endpoint",
      "what api",
      "which api",
      "add endpoint",
      "create endpoint",
    ];
    const isEndpointDesign = endpointDesignKeywords.some((kw) => feedbackMessage.includes(kw));

    // First pass: Check for strong method+keyword matches
    let hasStrongMatch = false;

    endpoints.forEach((endpoint) => {
      const method = endpoint.method.toLowerCase();

      // Strong match: GET endpoints with analytics keywords
      if (method === "get" && analyticsKeywords.some((kw) => feedbackMessage.includes(kw))) {
        // For endpoint design or path feedback, highlight path; otherwise notes
        highlightMap.set(endpoint.id, isEndpointDesign || isPathFeedback ? "path" : "notes");
        hasStrongMatch = true;
      }
      // Strong match: GET endpoints with redirect keywords
      else if (method === "get" && redirectKeywords.some((kw) => feedbackMessage.includes(kw))) {
        // If path-specific or design feedback, highlight path; otherwise highlight notes
        highlightMap.set(endpoint.id, isEndpointDesign || isPathFeedback ? "path" : "notes");
        hasStrongMatch = true;
      }
      // Strong match: POST endpoints with creation keywords
      else if (method === "post" && createKeywords.some((kw) => feedbackMessage.includes(kw))) {
        highlightMap.set(endpoint.id, isEndpointDesign || isPathFeedback ? "path" : "notes");
        hasStrongMatch = true;
      }
    });

    // If we found strong matches, filter to prefer empty paths when asking about path structure
    if (hasStrongMatch) {
      // For path-related or design questions, prefer highlighting empty paths (they need filling)
      if ((isPathFeedback || isEndpointDesign) && highlightMap.size > 0) {
        const matchedWithEmptyPaths = Array.from(highlightMap.entries()).filter(([id, field]) => {
          const endpoint = endpoints.find((ep) => ep.id === id);
          return endpoint && field === "path" && endpoint.path.trim().length === 0;
        });

        // If we found matched endpoints with empty paths, only highlight those
        if (matchedWithEmptyPaths.length > 0) {
          const newMap = new Map<string, "path" | "notes">();
          matchedWithEmptyPaths.forEach(([id, field]) => {
            newMap.set(id, field);
          });
          return newMap;
        }
      }

      return highlightMap;
    }

    // Second pass: Only if no strong matches, check for path or specific content matches
    endpoints.forEach((endpoint) => {
      const path = endpoint.path.toLowerCase();
      const notes = endpoint.notes.toLowerCase();

      // Check if feedback specifically mentions this path (path must be meaningful length)
      if (path.length > 3 && feedbackMessage.includes(path)) {
        highlightMap.set(endpoint.id, isPathFeedback ? "path" : "notes");
      }
      // Check if endpoint notes contain very specific keywords from feedback (longer words only)
      else if (
        notes &&
        feedbackMessage.split(" ").some((word) => word.length > 8 && notes.includes(word))
      ) {
        highlightMap.set(endpoint.id, "notes");
      }
    });

    // If still no match, highlight all endpoints
    // For endpoint design questions, highlight paths; otherwise notes
    if (highlightMap.size === 0) {
      endpoints.forEach((ep) =>
        highlightMap.set(ep.id, isEndpointDesign || isPathFeedback ? "path" : "notes")
      );
    }

    return highlightMap;
  }, [showHighlights, feedbackMessage, endpoints]);

  // Update showHighlights when blocking feedback appears (including re-submissions)
  // Tracks cachedResult changes so highlights reappear even if same feedback is shown
  useEffect(() => {
    if (hasBlockingFeedback && cachedResult) {
      setShowHighlights(true);
    } else if (!cachedResult) {
      // Clear highlights when feedback is cleared
      setShowHighlights(false);
    }
  }, [hasBlockingFeedback, cachedResult]);

  // Initialize default endpoints from scoring config if empty
  useEffect(() => {
    if (isReadOnly || endpoints.length > 0) return;

    const initializeDefaultEndpoints = async () => {
      try {
        // Load scoring config
        await loadScoringConfig(state.slug);
        const config = getScoringConfigSync(state.slug);

        if (!config) {
          console.warn(`[ApiDefinitionStep] Config not found for ${state.slug}`);
          return;
        }

        // Collect endpoints from requirements[].endpoint
        const allReqs = config.steps.api.requirements || [];
        const endpointConfigs: Array<ApiEndpointConfig & { requirementId: string }> = [];

        // Collect all endpoints from requirements
        for (const req of allReqs) {
          if (req.endpoint) {
            // Add the requirement id as the endpoint id for compatibility
            endpointConfigs.push({ ...req.endpoint, id: req.id, requirementId: req.id });
          }
        }

        if (endpointConfigs.length === 0) return;

        // Create default endpoints from collected endpoint configs
        const defaultEndpoints: ApiEndpoint[] = endpointConfigs.map((ep) => {
          // Find the matching requirement
          const matchingReq = allReqs.find((req) => req.id === ep.requirementId);

          // Use solutions from requirement if available (more detailed)
          // Otherwise fall back to purpose
          let notes = ep.purpose;
          if (matchingReq?.solutions && matchingReq.solutions.length > 0) {
            const solution = matchingReq.solutions[0];
            // Format solution based on type (simple text or structured API format)
            if ("text" in solution) {
              // Simple solution format
              notes = solution.text;
            } else if ("overview" in solution && "request" in solution && "response" in solution) {
              // API solution format - format it nicely
              const apiSolution = solution as {
                overview: string;
                request: string;
                response: { statusCode: string; text: string };
                errors?: Array<{ statusCode: string; text: string }>;
              };
              const parts: string[] = [];
              parts.push(apiSolution.overview);
              parts.push(`Request: ${apiSolution.request}`);
              parts.push(
                `Response: ${apiSolution.response.statusCode} ${apiSolution.response.text}`
              );
              if (apiSolution.errors && apiSolution.errors.length > 0) {
                const errorStrings = apiSolution.errors.map(
                  (err) => `${err.statusCode}: ${err.text}`
                );
                parts.push(`Errors: ${errorStrings.join(", ")}`);
              }
              notes = parts.join("\n");
            } else {
              // Fallback (shouldn't happen)
              notes = JSON.stringify(solution);
            }
          }

          return {
            id: `endpoint-${crypto.randomUUID()}`,
            method: ep.method,
            path: ep.correctPath || "",
            notes,
            suggested: true,
          };
        });

        if (defaultEndpoints.length > 0) {
          setApiDefinition((prev) => ({
            ...prev,
            endpoints: defaultEndpoints,
          }));
          // Auto-expand all default endpoints
          setExpandedIds(new Set(defaultEndpoints.map((ep) => ep.id)));
          setOpenId(defaultEndpoints[0]?.id ?? null);
        }
      } catch (error) {
        console.warn(
          `[ApiDefinitionStep] Failed to initialize default endpoints for ${state.slug}:`,
          error
        );
      }
    };

    initializeDefaultEndpoints();
  }, [state.slug, endpoints.length, isReadOnly, setApiDefinition]);

  // Check if there are any validation issues
  const hasNoEndpoints = endpoints.length === 0;
  const validEndpoints = endpoints.filter((ep) => ep.path.trim().length > 0);
  const hasNoValidEndpoints = validEndpoints.length === 0;
  const endpointsWithIssues = validEndpoints.filter(
    (ep) => !ep.notes.trim() || ep.notes.trim().length < 10
  );
  const _hasValidationIssues =
    hasNoEndpoints || hasNoValidEndpoints || endpointsWithIssues.length > 0;

  useEffect(() => {
    if (!openId || !endpoints.some((endpoint) => endpoint.id === openId)) {
      setOpenId(endpoints[0]?.id ?? null);
    }
  }, [endpoints, openId]);

  // Auto-expand highlighted endpoints when highlights are shown
  useEffect(() => {
    if (showHighlights && endpointsToHighlight.size > 0) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        endpointsToHighlight.forEach((_, id) => next.add(id));
        return next;
      });
    }
  }, [showHighlights, endpointsToHighlight]);

  const toggleEndpoint = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const markEndpointTouched = (id: string) => {
    setTouchedEndpoints((prev) => new Set([...prev, id]));
  };

  const updateEndpoint = useCallback(
    (id: string, updater: (endpoint: ApiEndpoint) => ApiEndpoint) => {
      if (isReadOnly) return;
      setApiDefinition((prev) => ({
        ...prev,
        endpoints: prev.endpoints.map((endpoint) =>
          endpoint.id === id ? updater(endpoint) : endpoint
        ),
      }));
      // Mark as touched when user changes the endpoint
      markEndpointTouched(id);
      // Clear highlights when user starts fixing the issue
      setShowHighlights(false);
      // Clear the score when user changes their answer
      if (state.scores?.api) {
        setStepScore("api", undefined);
      }
      // Clear the cached iterative feedback result
      if (state.iterativeFeedback?.api?.cachedResult) {
        updateIterativeFeedback("api", (prev) => ({
          ...prev,
          cachedResult: null,
        }));
      }
    },
    [
      isReadOnly,
      setApiDefinition,
      setStepScore,
      state.scores?.api,
      state.iterativeFeedback?.api?.cachedResult,
      updateIterativeFeedback,
    ]
  );

  const addEndpoint = () => {
    if (isReadOnly) return;
    const next = createEndpoint();
    setApiDefinition((prev) => ({
      ...prev,
      endpoints: [...prev.endpoints, next],
    }));
    setOpenId(next.id);
    // Automatically expand the new endpoint
    setExpandedIds((prev) => new Set([...prev, next.id]));
    // Clear the score when endpoints change
    if (state.scores?.api) {
      setStepScore("api", undefined);
    }
    // Clear the cached iterative feedback result
    if (state.iterativeFeedback?.api?.cachedResult) {
      updateIterativeFeedback("api", (prev) => ({
        ...prev,
        cachedResult: null,
      }));
    }
  };

  const removeEndpoint = (id: string) => {
    if (isReadOnly) return;
    setApiDefinition((prev) => ({
      ...prev,
      endpoints: prev.endpoints.filter((endpoint) => endpoint.id !== id),
    }));
    if (openId === id) {
      const remaining = endpoints.filter((endpoint) => endpoint.id !== id);
      setOpenId(remaining[0]?.id ?? null);
    }
    // Remove from expanded set
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    // Clear the score when endpoints change
    if (state.scores?.api) {
      setStepScore("api", undefined);
    }
    // Clear the cached iterative feedback result
    if (state.iterativeFeedback?.api?.cachedResult) {
      updateIterativeFeedback("api", (prev) => ({
        ...prev,
        cachedResult: null,
      }));
    }
  };

  const mobileEditingEndpoint = mobileEditingId
    ? endpoints.find((ep) => ep.id === mobileEditingId)
    : null;

  // Subscribe to close events and voice changes
  useEffect(() => {
    if (!mobileEditingId) return;

    // Listen for close events from navigation
    const unsubClose = on("apiEditor:close", () => {
      setMobileEditingId(null);
    });

    // Listen for voice change events from footer
    const unsubVoice = on("apiEditor:voiceChange", ({ value }) => {
      updateEndpoint(mobileEditingId, (current) => ({
        ...current,
        notes: value,
      }));
    });

    return () => {
      unsubClose();
      unsubVoice();
    };
  }, [mobileEditingId, updateEndpoint]);

  // Emit state changes when mobile editing state changes
  useEffect(() => {
    if (mobileEditingId && mobileEditingEndpoint) {
      emit("apiEditor:stateChange", {
        editing: true,
        value: mobileEditingEndpoint.notes,
      });
    } else {
      emit("apiEditor:stateChange", { editing: false });
    }
  }, [mobileEditingId, mobileEditingEndpoint]);

  return (
    <div className="relative h-full sm:h-auto">
      {/* Desktop layout - unchanged */}
      <div className="hidden sm:block space-y-6">
        <section className="space-y-4 mx-4 pb-8 sm:mx-6 lg:mx-auto lg:max-w-3xl">
          {(hasNoEndpoints || hasNoValidEndpoints) && !isReadOnly && (
            <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-3">
              <p className="text-xs text-red-400">
                {hasNoEndpoints
                  ? "Please add at least one API endpoint before continuing."
                  : "Please define at least one endpoint with a path and description."}
              </p>
            </div>
          )}

          {endpoints.map((endpoint, index) => {
            const isOpen = expandedIds.has(endpoint.id);
            const isTouched = touchedEndpoints.has(endpoint.id);
            const hasError = feedbackMessage.length > 0 && !isReadOnly;
            const shouldShowError = hasError && isTouched;
            const trimmedLength = endpoint.notes.trim().length;
            // Determine which field to highlight based on feedback
            const highlightField = endpointsToHighlight.get(endpoint.id);
            const shouldHighlightPath = showHighlights && highlightField === "path" && !isReadOnly;
            const shouldHighlightNotes =
              showHighlights && highlightField === "notes" && !isReadOnly;

            return (
              <article
                key={endpoint.id}
                className={`overflow-hidden rounded-3xl border transition-[max-height,opacity] duration-300 ${"border-zinc-800 bg-zinc-900/70"} ${isOpen ? "max-h-[999px] opacity-100" : "max-h-[120px] opacity-80"}`}
              >
                <div className="flex w-full flex-wrap items-center justify-center gap-2 p-4 sm:flex-nowrap sm:justify-between sm:gap-3 sm:p-6">
                  <div className="flex flex-1 flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
                    <div className="relative">
                      <select
                        value={endpoint.method}
                        onChange={(event) =>
                          updateEndpoint(endpoint.id, (current) => ({
                            ...current,
                            method: event.target.value as ApiEndpoint["method"],
                          }))
                        }
                        disabled={isReadOnly}
                        className="h-10 w-full rounded-full border border-zinc-700 bg-zinc-900 pl-3 pr-10 text-xs font-semibold uppercase tracking-wide text-zinc-100 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 appearance-none"
                      >
                        {METHOD_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg
                          className="h-4 w-4 text-zinc-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="relative h-10 min-w-[160px] flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-100 pointer-events-none">
                        /
                      </span>
                      <input
                        value={endpoint.path}
                        onChange={(event) => {
                          let value = event.target.value;
                          // Remove any leading slashes
                          value = value.replace(/^\/+/, "");
                          updateEndpoint(endpoint.id, (current) => ({
                            ...current,
                            path: value,
                          }));
                        }}
                        disabled={isReadOnly}
                        className={`h-10 w-full rounded-full border pl-6 pr-4 text-sm text-zinc-100 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                          shouldHighlightPath
                            ? "border-amber-400/30 bg-amber-950/30 ring-2 ring-amber-400/10 focus-visible:ring-2 focus-visible:ring-amber-500"
                            : "border-zinc-700 bg-zinc-900 focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
                        }`}
                      />
                      <p
                        className={`mt-2 text-xs ${shouldHighlightPath ? "text-amber-400" : "text-zinc-500"}`}
                      >
                        {shouldHighlightPath
                          ? `The path should follow restful conventions, review the feedback and make changes`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!endpoint.suggested && !isReadOnly ? (
                      <button
                        type="button"
                        onClick={() => removeEndpoint(endpoint.id)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-400/40 text-rose-200 transition hover:bg-rose-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                        aria-label="Remove endpoint"
                      >
                        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
                          <path
                            d="M4.75 4.75l6.5 6.5m0-6.5-6.5 6.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => toggleEndpoint(endpoint.id)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition hover:border-blue-400 hover:text-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      aria-expanded={isOpen}
                      aria-label={isOpen ? "Collapse endpoint" : "Expand endpoint"}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        fill="none"
                        aria-hidden
                      >
                        <path
                          d="M4 6l4 4 4-4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {isOpen ? (
                  <div className="px-6 pb-4 sm:px-8">
                    <div
                      className={`relative mt-2 rounded-2xl border transition-colors duration-300 ${
                        shouldHighlightNotes
                          ? "border-amber-400/50 bg-amber-950/20 ring-2 ring-amber-400/30"
                          : "border-zinc-700/60 bg-zinc-950/40 focus-within:border-blue-400/50 focus-within:bg-zinc-950/60 focus-within:shadow-lg focus-within:shadow-blue-500/10"
                      }`}
                    >
                      <textarea
                        value={endpoint.notes}
                        onChange={(event) =>
                          updateEndpoint(endpoint.id, (current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        onBlur={() => {
                          markEndpointTouched(endpoint.id);
                        }}
                        placeholder={getApiNotesPlaceholder(endpoint.method, endpoint.path)}
                        disabled={isReadOnly}
                        className={`styled-scrollbar min-h-[280px] w-full resize-y rounded-2xl border-none bg-transparent px-4 pb-4 pr-14 pt-4 text-sm leading-6 text-zinc-100 placeholder:text-zinc-500 focus:outline-none ${
                          shouldHighlightNotes
                            ? "focus-visible:ring-2 focus-visible:ring-amber-500"
                            : "focus-visible:ring-2 focus-visible:ring-blue-500"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      />
                      <div className="absolute bottom-3 right-3">
                        <VoiceCaptureBridge
                          value={endpoint.notes}
                          onChange={(notes) =>
                            updateEndpoint(endpoint.id, (current) => ({
                              ...current,
                              notes,
                            }))
                          }
                          stepId={`api-${endpoint.id}`}
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>

                    {!isReadOnly && (shouldHighlightNotes || trimmedLength < 10) && (
                      <p
                        className={`mt-2 text-xs ${trimmedLength < 10 ? "text-white/50" : shouldHighlightNotes ? "text-amber-400" : "text-zinc-500"}`}
                      >
                        {shouldShowError
                          ? `The following section needs to be updated based on the feedback.`
                          : `Remaining characters needed: ${10 - trimmedLength}`}
                      </p>
                    )}

                    <p className="mt-3 text-xs text-zinc-500">
                      Endpoint {index + 1} of {endpoints.length}
                    </p>
                  </div>
                ) : null}
              </article>
            );
          })}

          <div className="space-y-4">
            {!isReadOnly ? (
              <button
                type="button"
                onClick={addEndpoint}
                disabled={isReadOnly}
                className="inline-flex h-11 w-full items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/10 px-4 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Add endpoint
              </button>
            ) : null}
          </div>
        </section>
      </div>

      {/* Mobile layout - list and slide-in editor */}
      <div className="sm:hidden h-full flex flex-col">
        {/* Mobile List View */}
        <div
          className={`h-full flex flex-col transition-transform duration-300 ${mobileEditingId ? "-translate-x-full" : "translate-x-0"}`}
        >
          <div className="flex-1 overflow-y-auto pb-20">
            <div className="space-y-3 p-4">
              {endpoints.map((endpoint) => {
                const highlightField = endpointsToHighlight.get(endpoint.id);
                const shouldHighlightPath =
                  showHighlights && highlightField === "path" && !isReadOnly;
                const shouldHighlightNotes =
                  showHighlights && highlightField === "notes" && !isReadOnly;

                return (
                  <button
                    key={endpoint.id}
                    type="button"
                    onClick={() => setMobileEditingId(endpoint.id)}
                    className={`w-full text-left rounded-2xl border p-4 transition hover:bg-zinc-900 active:scale-98 ${
                      shouldHighlightPath || shouldHighlightNotes
                        ? "border-amber-400/50 bg-amber-950/20"
                        : "border-zinc-800 bg-zinc-900/70 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 px-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-100">
                        {endpoint.method}
                      </span>
                      <span className="flex-1 text-sm text-zinc-200 font-mono">
                        /
                        {endpoint.path || (
                          <span className="text-zinc-500 italic">new-endpoint</span>
                        )}
                      </span>
                      <svg viewBox="0 0 16 16" className="h-4 w-4 text-zinc-400" fill="none">
                        <path
                          d="M6 4l4 4-4 4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>

                    {/* Notes preview */}
                    {endpoint.notes && (
                      <p className={`mt-2 text-xs line-clamp-2 text-zinc-400`}>
                        {endpoint.notes.length > 0
                          ? endpoint.notes.slice(0, 1).toUpperCase() +
                            endpoint.notes.slice(1).toLowerCase()
                          : "No description"}
                      </p>
                    )}
                  </button>
                );
              })}

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={addEndpoint}
                  className="w-full h-12 inline-flex items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/10 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  + Add endpoint
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Slide-in Editor */}
        {mobileEditingEndpoint && (
          <div
            className="absolute inset-0 bg-zinc-950 transform transition-transform duration-300"
            style={{ transform: mobileEditingId ? "translateX(0)" : "translateX(100%)" }}
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
                <div className="flex-1 flex items-center gap-2">
                  <div className="relative">
                    <select
                      value={mobileEditingEndpoint.method}
                      onChange={(event) =>
                        updateEndpoint(mobileEditingEndpoint.id, (current) => ({
                          ...current,
                          method: event.target.value as ApiEndpoint["method"],
                        }))
                      }
                      disabled={isReadOnly}
                      className="h-9 w-full rounded-full border border-zinc-700 bg-zinc-900 pl-3 pr-10 text-xs font-semibold uppercase tracking-wide text-zinc-100 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 appearance-none"
                    >
                      {METHOD_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg
                        className="h-4 w-4 text-zinc-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-100 pointer-events-none">
                      /
                    </span>
                    <input
                      value={mobileEditingEndpoint.path}
                      onChange={(event) => {
                        const value = event.target.value.replace(/^\/+/, "");
                        updateEndpoint(mobileEditingEndpoint.id, (current) => ({
                          ...current,
                          path: value,
                        }));
                      }}
                      disabled={isReadOnly}
                      className="h-9 w-full rounded-full border border-zinc-700 bg-zinc-900 pl-6 pr-3 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    />
                  </div>
                </div>
                {!mobileEditingEndpoint.suggested && !isReadOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      removeEndpoint(mobileEditingEndpoint.id);
                      setMobileEditingId(null);
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-400/40 text-rose-200 transition hover:bg-rose-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                    aria-label="Delete endpoint"
                  >
                    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
                      <path
                        d="M4.75 4.75l6.5 6.5m0-6.5-6.5 6.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Editor */}
              <div
                className="relative flex-1 overflow-y-auto overscroll-contain"
                style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
              >
                <textarea
                  value={mobileEditingEndpoint.notes}
                  onChange={(event) =>
                    updateEndpoint(mobileEditingEndpoint.id, (current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  onBlur={() => markEndpointTouched(mobileEditingEndpoint.id)}
                  placeholder="What does this endpoint do? Describe the request and response."
                  disabled={isReadOnly}
                  className="w-full min-h-full resize-none border-none bg-transparent px-4 pb-16 pt-4 text-base leading-7 text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus-visible:ring-0"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ApiDefinitionStep;
