"use client";

import { useEffect, useState } from "react";
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
  const { endpoints } = state.apiDefinition;
  const [openId, setOpenId] = useState<string | null>(() => endpoints[0]?.id ?? null);

  useEffect(() => {
    if (!openId || !endpoints.find((endpoint) => endpoint.id === openId)) {
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
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            Outline the API
          </h2>
          <p className="text-xs text-zinc-400 sm:text-sm">
            Capture each endpoint’s purpose, payload, and edge cases. Speak or type directly into the card.
          </p>
        </div>
      </div>

      <section className="space-y-4">
        {endpoints.map((endpoint, index) => {
          const isOpen = openId === endpoint.id;
          return (
          <article
            key={endpoint.id}
            className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
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
                  className="h-10 min-w-0 rounded-full border border-zinc-700 bg-zinc-900 px-4 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              <div className="flex items-center gap-3">
                {!endpoint.suggested && !isReadOnly ? (
                  <button
                    type="button"
                    onClick={() => removeEndpoint(endpoint.id)}
                    className="hidden h-9 items-center justify-center rounded-full border border-rose-400/40 px-3 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 sm:inline-flex"
                  >
                    Remove
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setOpenId((current) => (current === endpoint.id ? null : endpoint.id))}
                  className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 transition hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-expanded={isOpen}
                >
                  {isOpen ? "Collapse" : "Expand"}
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

            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
                  {isOpen ? "Endpoint notes" : "Summary"}
                </h3>
                {endpoint.suggested ? (
                  <span className="inline-flex items-center rounded-full border border-blue-400/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-200">
                    Suggested
                  </span>
                ) : null}
              </div>
              {isOpen ? (
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
              ) : (
                <p className="mt-2 text-xs text-zinc-400">
                  {endpoint.notes || "No details captured yet."}
                </p>
              )}
            </div>

            <p className="mt-3 text-xs text-zinc-500">
              Endpoint {index + 1} of {endpoints.length}
            </p>
            {!endpoint.suggested && !isReadOnly ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => removeEndpoint(endpoint.id)}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-rose-400/40 px-3 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  Remove endpoint
                </button>
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
