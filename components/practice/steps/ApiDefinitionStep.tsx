"use client";

import { useEffect, useMemo, useState } from "react";
import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import { VoiceCaptureBridge } from "@/components/practice/VoiceCaptureBridge";
import type { ApiEndpoint } from "@/lib/practice/types";
import { getApiNotesPlaceholder } from "@/lib/practice/apiPlaceholders";

const METHOD_OPTIONS: Array<ApiEndpoint["method"]> = ["GET", "POST", "PATCH", "DELETE"];

const createEndpoint = (): ApiEndpoint => ({
  id: `endpoint-${crypto.randomUUID()}`,
  method: "GET",
  path: "new-endpoint",
  notes: "",
  suggested: false,
});

export function ApiDefinitionStep() {
  const { state, setApiDefinition, setStepScore, updateIterativeFeedback, isReadOnly } = usePracticeSession();
  const endpoints = useMemo(() => state.apiDefinition.endpoints, [state.apiDefinition.endpoints]);
  const [openId, setOpenId] = useState<string | null>(() => endpoints[0]?.id ?? null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set([endpoints[0]?.id].filter(Boolean)));
  const [touchedEndpoints, setTouchedEndpoints] = useState<Set<string>>(new Set());

  // Check if there's a blocking feedback result
  const hasBlockingFeedback = state.iterativeFeedback?.api?.cachedResult?.ui?.blocking ?? false;

  // Check if there are any validation issues
  const hasNoEndpoints = endpoints.length === 0;
  const validEndpoints = endpoints.filter(ep => ep.path.trim().length > 0);
  const hasNoValidEndpoints = validEndpoints.length === 0;
  const endpointsWithIssues = validEndpoints.filter(ep => !ep.notes.trim() || ep.notes.trim().length < 10);
  const _hasValidationIssues = hasNoEndpoints || hasNoValidEndpoints || endpointsWithIssues.length > 0;

  useEffect(() => {
    if (!openId || !endpoints.some((endpoint) => endpoint.id === openId)) {
      setOpenId(endpoints[0]?.id ?? null);
    }
  }, [endpoints, openId]);

  // Auto-expand endpoints with issues when there's blocking feedback
  useEffect(() => {
    if (hasBlockingFeedback) {
      const endpointsWithIssues = endpoints.filter(
        ep => ep.path.trim().length > 0 && ep.notes.trim().length < 10
      );
      if (endpointsWithIssues.length > 0) {
        setExpandedIds(prev => {
          const next = new Set(prev);
          endpointsWithIssues.forEach(ep => next.add(ep.id));
          return next;
        });
      }
    }
  }, [hasBlockingFeedback, endpoints]);

  const toggleEndpoint = (id: string) => {
    setExpandedIds(prev => {
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

  const updateEndpoint = (id: string, updater: (endpoint: ApiEndpoint) => ApiEndpoint) => {
    if (isReadOnly) return;
    setApiDefinition((prev) => ({
      ...prev,
      endpoints: prev.endpoints.map((endpoint) =>
        endpoint.id === id ? updater(endpoint) : endpoint
      ),
    }));
    // Mark as touched when user changes the endpoint
    markEndpointTouched(id);
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
  };

  const addEndpoint = () => {
    if (isReadOnly) return;
    const next = createEndpoint();
    setApiDefinition((prev) => ({
      ...prev,
      endpoints: [...prev.endpoints, next],
    }));
    setOpenId(next.id);
    // Automatically expand the new endpoint
    setExpandedIds(prev => new Set([...prev, next.id]));
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
    setExpandedIds(prev => {
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

  return (
    <div className="space-y-6">
      <div className="px-4 text-center sm:px-6">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">URL Shortener</h2>
        </div>
      </div>

      <section className="space-y-4 lg:mx-auto lg:max-w-3xl">
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
          const hasPath = endpoint.path.trim().length > 0;
          const hasValidNotes = endpoint.notes.trim().length >= 10;
          const isTouched = touchedEndpoints.has(endpoint.id);
          const hasError = hasPath && !hasValidNotes && !isReadOnly;
          const shouldShowError = hasError && isTouched;

          // Highlight endpoint if there's blocking feedback and this endpoint has issues
          const shouldHighlight = hasBlockingFeedback && hasPath && !hasValidNotes && !isReadOnly;

          return (
            <article
              key={endpoint.id}
              className={`overflow-hidden rounded-3xl border transition-[max-height,opacity] duration-300 ${
                shouldShowError
                  ? 'border-red-500/50 bg-red-950/10'
                  : 'border-zinc-800 bg-zinc-900/70'
              } ${
                isOpen ? "max-h-[999px] opacity-100" : "max-h-[120px] opacity-80"
              }`}
            >
              <div className="flex w-full flex-wrap items-center justify-center gap-2 p-4 sm:flex-nowrap sm:justify-between sm:gap-3 sm:p-6">
                <div className="flex flex-1 flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
                  <select
                    value={endpoint.method}
                    onChange={(event) =>
                      updateEndpoint(endpoint.id, (current) => ({
                        ...current,
                        method: event.target.value as ApiEndpoint["method"],
                      }))
                    }
                    disabled={isReadOnly}
                    className="h-10 rounded-full border border-zinc-700 bg-zinc-900 px-3 text-xs font-semibold uppercase tracking-wide text-zinc-100 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {METHOD_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
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
                      className="h-10 w-full rounded-full border border-zinc-700 bg-zinc-900 pl-6 pr-4 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    />
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
                <div className="px-4 pb-4 sm:px-6">
                  <div className={`relative mt-2 rounded-2xl border transition-colors duration-300 ${
                    shouldShowError
                      ? 'border-red-500/50 bg-red-950/20'
                      : shouldHighlight
                        ? 'border-amber-400/50 bg-amber-950/20 ring-2 ring-amber-400/30'
                        : 'border-zinc-700 bg-zinc-950/60'
                  }`}>
                    <textarea
                      value={endpoint.notes}
                      onChange={(event) =>
                        updateEndpoint(endpoint.id, (current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      onBlur={() => markEndpointTouched(endpoint.id)}
                      placeholder={getApiNotesPlaceholder(endpoint.method, endpoint.path)}
                      disabled={isReadOnly}
                      className={`styled-scrollbar min-h-[280px] w-full resize-y rounded-2xl border-none bg-transparent px-4 pb-4 pr-14 pt-4 text-sm leading-6 text-zinc-100 placeholder:text-zinc-500 focus:outline-none ${
                        shouldShowError
                          ? 'focus-visible:ring-2 focus-visible:ring-red-500'
                          : shouldHighlight
                            ? 'focus-visible:ring-2 focus-visible:ring-amber-500'
                            : 'focus-visible:ring-2 focus-visible:ring-blue-500'
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

                  {(shouldShowError || shouldHighlight) && (
                    <p className={`mt-2 text-xs ${shouldShowError ? 'text-red-400' : 'text-amber-400'}`}>
                      Please add a meaningful description (at least 10 characters).
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
  );
}

export default ApiDefinitionStep;
