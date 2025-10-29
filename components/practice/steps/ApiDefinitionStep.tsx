"use client";

import { useEffect, useMemo, useState } from "react";
import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import type { ApiEndpoint } from "@/lib/practice/types";

const MicIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="none">
    <path
      d="M12 3a2 2 0 0 0-2 2v6a2 2 0 1 0 4 0V5a2 2 0 0 0-2-2Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19 11a7 7 0 0 1-14 0M12 21v-3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const METHOD_OPTIONS: Array<ApiEndpoint["method"]> = ["GET", "POST"];

const createEndpoint = (): ApiEndpoint => ({
  id: `endpoint-${crypto.randomUUID()}`,
  method: "GET",
  path: "/new-endpoint",
  notes: "Describe request, response, and edge cases.",
  suggested: false,
});

export function ApiDefinitionStep() {
  const { state, setApiDefinition, isReadOnly } = usePracticeSession();
  const endpoints = useMemo(() => state.apiDefinition.endpoints, [state.apiDefinition.endpoints]);
  const [openId, setOpenId] = useState<string | null>(() => endpoints[0]?.id ?? null);

  useEffect(() => {
    if (!openId || !endpoints.some((endpoint) => endpoint.id === openId)) {
      setOpenId(endpoints[0]?.id ?? null);
    }
  }, [endpoints, openId]);

  const updateEndpoint = (id: string, updater: (endpoint: ApiEndpoint) => ApiEndpoint) => {
    if (isReadOnly) return;
    setApiDefinition((prev) => ({
      ...prev,
      endpoints: prev.endpoints.map((endpoint) =>
        endpoint.id === id ? updater(endpoint) : endpoint
      ),
    }));
  };

  const addEndpoint = () => {
    if (isReadOnly) return;
    const next = createEndpoint();
    setApiDefinition((prev) => ({
      ...prev,
      endpoints: [...prev.endpoints, next],
    }));
    setOpenId(next.id);
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
  };

  return (
    <div className="space-y-6">
      <div className="px-4 text-center sm:px-6">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">URL Shortener</h2>
        </div>
      </div>

      <section className="space-y-4 lg:mx-auto lg:max-w-3xl">
        {endpoints.map((endpoint, index) => {
          const isOpen = openId === endpoint.id;

          return (
            <article
              key={endpoint.id}
              className={`overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 transition-[max-height,opacity] duration-300 ${
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
                  <input
                    value={endpoint.path}
                    onChange={(event) =>
                      updateEndpoint(endpoint.id, (current) => ({
                        ...current,
                        path: event.target.value,
                      }))
                    }
                    disabled={isReadOnly}
                    className="h-10 min-w-[160px] flex-1 rounded-full border border-zinc-700 bg-zinc-900 px-4 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  />
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
                    onClick={() =>
                      setOpenId((current) => {
                        if (current !== endpoint.id) return endpoint.id;
                        if (endpoints.length <= 1) return endpoint.id;
                        const nextEndpoint = endpoints[(index + 1) % endpoints.length];
                        return nextEndpoint?.id ?? endpoint.id;
                      })
                    }
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
                  <div className="relative mt-2 rounded-2xl border border-zinc-700 bg-zinc-950/60">
                    <textarea
                      value={endpoint.notes}
                      onChange={(event) =>
                        updateEndpoint(endpoint.id, (current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      placeholder="Example: Describe request body, success response, error codes, and how this ties back to requirements. Mention auth or rate limiting if applicable."
                      disabled={isReadOnly}
                      className="min-h-[180px] w-full resize-y rounded-2xl border-none bg-transparent px-4 pb-4 pr-14 pt-4 text-sm leading-6 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (isReadOnly) return;
                        console.info("Speech capture not yet implemented");
                      }}
                      disabled={isReadOnly}
                      aria-label="Record your answer"
                      className="absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-400/40 bg-blue-950/40 text-blue-200 transition hover:bg-blue-900/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <MicIcon />
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-zinc-500">
                    Endpoint {index + 1} of {endpoints.length}
                  </p>
                </div>
              ) : null}
            </article>
          );
        })}

        {!isReadOnly ? (
          <button
            type="button"
            onClick={addEndpoint}
            className="inline-flex h-11 w-full items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/10 px-4 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed"
          >
            + Add endpoint
          </button>
        ) : null}
      </section>
    </div>
  );
}

export default ApiDefinitionStep;
