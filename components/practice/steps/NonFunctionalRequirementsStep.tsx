"use client";

import { useState } from "react";
import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import { VoiceCaptureBridge } from "@/components/practice/VoiceCaptureBridge";

export function NonFunctionalRequirementsStep() {
  const { state, setRequirements, setStepScore, isReadOnly } = usePracticeSession();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const requirements = state.requirements;
  const nf = requirements.nonFunctional;

  // Check if user has provided numeric values
  const hasNumericValues = nf.readRps > 0 && nf.writeRps > 0 && nf.p95RedirectMs > 0;
  const hasNotes = nf.notes.trim().length > 0;

  const handleSummaryChange = (summary: string) => {
    setRequirements({
      ...requirements,
      nonFunctional: {
        ...nf,
        notes: summary,
      },
    });
    // Clear the score when user changes their answer
    if (state.scores?.nonFunctional) {
      setStepScore("nonFunctional", undefined);
    }
  };

  const handleNumberChange = (key: "readRps" | "writeRps" | "p95RedirectMs", value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    setRequirements({
      ...requirements,
      nonFunctional: {
        ...nf,
        [key]: parsed,
      },
    });
  };

  const handleAvailabilityChange = (value: string) => {
    if (!["99.0", "99.9", "99.99"].includes(value)) return;
    setRequirements({
      ...requirements,
      nonFunctional: {
        ...nf,
        availability: value as typeof nf.availability,
      },
    });
  };

  const handleRateLimitChange = (value: string) => {
    setRequirements({
      ...requirements,
      nonFunctional: {
        ...nf,
        rateLimitNotes: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="px-4 text-center sm:px-6">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            URL Shortener
          </h2>
        </div>
      </div>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
              Describe the constraints
            </h3>
            {!hasNotes && !isReadOnly && (
              <span className="text-xs text-red-400">Required</span>
            )}
          </div>
          <div className={`relative rounded-2xl border ${
            !hasNotes && !isReadOnly
              ? 'border-red-500/50 bg-red-950/20'
              : 'border-zinc-700 bg-zinc-950/60'
          }`}>
            <textarea
              value={nf.notes}
              onChange={(event) => handleSummaryChange(event.target.value)}
              placeholder="Example: target 100ms P95 redirects with 5k read RPS, 100 write RPS. Require 99.9% availability and rate limit writes to 5/min per IP."
              className={`min-h-[200px] w-full resize-y rounded-2xl border-none bg-transparent px-4 pb-4 pr-14 pt-4 text-sm leading-6 text-zinc-100 placeholder:text-zinc-500 focus:outline-none ${
                !hasNotes && !isReadOnly
                  ? 'focus-visible:ring-2 focus-visible:ring-red-500'
                  : 'focus-visible:ring-2 focus-visible:ring-blue-500'
              }`}
              disabled={isReadOnly}
            />
            <div className="absolute bottom-3 right-3">
              <VoiceCaptureBridge
                value={nf.notes}
                onChange={handleSummaryChange}
                stepId="nonFunctional"
                disabled={isReadOnly}
              />
            </div>
          </div>

          {!hasNotes && !isReadOnly && (
            <p className="text-xs text-red-400">
              Please describe the performance constraints before continuing.
            </p>
          )}

          {hasNotes && !hasNumericValues && !isReadOnly && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-950/20 p-3">
              <p className="text-xs text-blue-300">
                💡 <span className="font-semibold">Tip:</span> Consider adding specific numbers like &apos;100ms&apos; for latency or &apos;5000 RPS&apos; for throughput. Quantitative metrics help design more precisely.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 transition hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {showAdvanced ? "Hide targets" : "Edit numeric targets"}
            <svg
              viewBox="0 0 16 16"
              className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              fill="none"
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

          {showAdvanced ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-zinc-200">
                  <span className="font-semibold text-white">Latency target (P95, ms)</span>
                  <input
                    type="number"
                    min={1}
                    step={10}
                    value={nf.p95RedirectMs}
                    onChange={(event) => handleNumberChange("p95RedirectMs", event.target.value)}
                    disabled={isReadOnly}
                    className="h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-zinc-200">
                  <span className="font-semibold text-white">Write throughput (requests / second)</span>
                  <input
                    type="number"
                    min={1}
                    step={10}
                    value={nf.writeRps}
                    onChange={(event) => handleNumberChange("writeRps", event.target.value)}
                    disabled={isReadOnly}
                    className="h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-zinc-200">
                  <span className="font-semibold text-white">Read throughput (requests / second)</span>
                  <input
                    type="number"
                    min={1}
                    step={100}
                    value={nf.readRps}
                    onChange={(event) => handleNumberChange("readRps", event.target.value)}
                    disabled={isReadOnly}
                    className="h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-zinc-200">
                  <span className="font-semibold text-white">Availability target</span>
                  <select
                    value={nf.availability}
                    onChange={(event) => handleAvailabilityChange(event.target.value)}
                    disabled={isReadOnly}
                    className="h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="99.0">99.0%</option>
                    <option value="99.9">99.9%</option>
                    <option value="99.99">99.99%</option>
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-2 text-sm text-zinc-200">
                <span className="font-semibold text-white">Rate limit notes</span>
                <textarea
                  value={nf.rateLimitNotes}
                  onChange={(event) => handleRateLimitChange(event.target.value)}
                  disabled={isReadOnly}
                  className="min-h-[80px] resize-y rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>
            </div>
          ) : null}

        </div>
      </section>
    </div>
  );
}

export default NonFunctionalRequirementsStep;
