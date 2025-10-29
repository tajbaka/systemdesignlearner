"use client";

import { useMemo, useState } from "react";
import BottomSheet from "@/app/components/BottomSheet";
import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import type { ApiEndpoint } from "@/lib/practice/types";

const METHOD_OPTIONS: Array<ApiEndpoint["method"]> = ["GET", "POST"];

const methodBadgeStyles: Record<ApiEndpoint["method"], string> = {
  GET: "border-emerald-400/50 bg-emerald-500/15 text-emerald-100",
  POST: "border-blue-400/50 bg-blue-500/15 text-blue-100",
};

const createCustomEndpoint = (): ApiEndpoint => ({
  id: `custom-${crypto.randomUUID()}`,
  method: "GET",
  path: "/new-endpoint",
  body: "",
  response: "",
  suggested: false,
});

export function ApiDefinitionStep() {
  const { state, setApiDefinition, isReadOnly } = usePracticeSession();
  const { endpoints, selectedId } = state.apiDefinition;
  const [sheetOpen, setSheetOpen] = useState(false);

  const selectedEndpoint = useMemo(
    () => endpoints.find((endpoint) => endpoint.id === selectedId),
    [endpoints, selectedId]
  );

  const openEditor = (endpointId: string) => {
    if (isReadOnly) return;
    setApiDefinition((prev) => ({
      ...prev,
      selectedId: endpointId,
    }));
    setSheetOpen(true);
  };

  const closeEditor = () => {
    setSheetOpen(false);
  };

  const updateEndpoint = <Key extends keyof ApiEndpoint>(
    key: Key,
    value: ApiEndpoint[Key]
  ) => {
    if (!selectedEndpoint) return;
    setApiDefinition((prev) => ({
      ...prev,
      endpoints: prev.endpoints.map((endpoint) =>
        endpoint.id === selectedEndpoint.id
          ? { ...endpoint, [key]: value }
          : endpoint
      ),
    }));
  };

  const removeEndpoint = (endpointId: string) => {
    setApiDefinition((prev) => {
      const nextEndpoints = prev.endpoints.filter((endpoint) => endpoint.id !== endpointId);
      return {
        endpoints: nextEndpoints,
        selectedId: nextEndpoints.length ? nextEndpoints[0].id : null,
      };
    });
    setSheetOpen(false);
  };

  const addEndpoint = () => {
    const next = createCustomEndpoint();
    setApiDefinition((prev) => ({
      endpoints: [...prev.endpoints, next],
      selectedId: next.id,
    }));
    setSheetOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
              Step 3 · API contract
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white sm:text-2xl">
                Draft the endpoints
              </h2>
              <p className="text-sm leading-relaxed text-zinc-300">
                Start from the suggested routes. Tweak payloads so the design and data model stay in sync.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
                Endpoints
              </h3>
              <p className="text-xs text-zinc-500">
                Click an endpoint to review method, path, and payload details.
              </p>
            </div>
            <button
              type="button"
              onClick={addEndpoint}
              disabled={isReadOnly}
              className="inline-flex h-10 items-center justify-center rounded-full border border-blue-400/40 bg-blue-950/30 px-4 text-xs font-semibold text-blue-100 transition hover:bg-blue-900/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              + Add custom endpoint
            </button>
          </div>

          <div className="space-y-2">
            {endpoints.map((endpoint) => {
              const isSelected = selectedId === endpoint.id;
              return (
                <button
                  key={endpoint.id}
                  type="button"
                  onClick={() => openEditor(endpoint.id)}
                  className={`flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isSelected
                      ? "border-blue-400 bg-blue-950/40 text-blue-100"
                      : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-600"
                  }`}
                  disabled={isReadOnly}
                >
                  <div className="flex items-center gap-3 truncate">
                    <span
                      className={`inline-flex min-w-[56px] justify-center rounded-full border px-3 py-1 text-xs font-semibold uppercase ${
                        methodBadgeStyles[endpoint.method] ?? "border-zinc-600 bg-zinc-800 text-zinc-200"
                      }`}
                    >
                      {endpoint.method}
                    </span>
                    <span className="truncate text-sm font-semibold">
                      {endpoint.path}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    {endpoint.suggested ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-400/40 px-3 py-1 text-blue-100">
                        Suggested
                      </span>
                    ) : null}
                    <span aria-hidden>→</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <BottomSheet
        isOpen={sheetOpen && Boolean(selectedEndpoint)}
        onClose={closeEditor}
        title={selectedEndpoint ? `${selectedEndpoint.method} ${selectedEndpoint.path}` : "Endpoint"}
      >
        {selectedEndpoint ? (
          <div className="space-y-6">
            <div className="grid gap-4">
              <label className="flex flex-col gap-2 text-sm text-zinc-200">
                <span className="font-semibold uppercase tracking-wide text-xs text-zinc-400">
                  Method
                </span>
                <select
                  value={selectedEndpoint.method}
                  onChange={(event) =>
                    updateEndpoint("method", event.target.value as ApiEndpoint["method"])
                  }
                  disabled={selectedEndpoint.suggested || isReadOnly}
                  className="h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {METHOD_OPTIONS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-200">
                <span className="font-semibold uppercase tracking-wide text-xs text-zinc-400">
                  Path
                </span>
                <input
                  value={selectedEndpoint.path}
                  onChange={(event) => updateEndpoint("path", event.target.value)}
                  disabled={isReadOnly}
                  className="h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>
            </div>

            {selectedEndpoint.method === "POST" ? (
              <label className="flex flex-col gap-2 text-sm text-zinc-200">
                <span className="font-semibold uppercase tracking-wide text-xs text-zinc-400">
                  Request body (JSON)
                </span>
                <textarea
                  value={selectedEndpoint.body}
                  onChange={(event) => updateEndpoint("body", event.target.value)}
                  rows={6}
                  disabled={isReadOnly}
                  className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>
            ) : null}

            <label className="flex flex-col gap-2 text-sm text-zinc-200">
              <span className="font-semibold uppercase tracking-wide text-xs text-zinc-400">
                Response (JSON or summary)
              </span>
              <textarea
                value={selectedEndpoint.response}
                onChange={(event) => updateEndpoint("response", event.target.value)}
                rows={6}
                disabled={isReadOnly}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            {!selectedEndpoint.suggested && !isReadOnly ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removeEndpoint(selectedEndpoint.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 px-4 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  Remove endpoint
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </BottomSheet>
    </>
  );
}

export default ApiDefinitionStep;
