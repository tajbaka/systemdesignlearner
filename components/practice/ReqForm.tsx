"use client";

import { useMemo, useState } from "react";
import type { Requirements } from "@/lib/practice/types";
import { FUNCTIONAL_TOGGLES, makeDefaultRequirements } from "@/lib/practice/defaults";

type ReqFormProps = {
  value: Requirements;
  locked: boolean;
  onChange: (value: Requirements) => void;
  onContinue: (value: Requirements) => void;
  readOnly?: boolean;
};

const ensureDefaults = (value?: Requirements): Requirements => {
  if (!value) {
    return makeDefaultRequirements();
  }

  const next: Requirements = {
    functional: { ...value.functional },
    nonFunctional: { ...value.nonFunctional },
  };

  FUNCTIONAL_TOGGLES.forEach((toggle) => {
    if (typeof next.functional[toggle.id] !== "boolean") {
      next.functional[toggle.id] = toggle.default;
    }
  });

  return next;
};

export const ReqForm = ({ value, locked, onChange, onContinue, readOnly = false }: ReqFormProps) => {
  const [error, setError] = useState<string | null>(null);
  const requirements = useMemo(() => ensureDefaults(value), [value]);

  const handleToggle = (id: string) => {
    if (readOnly) return;
    const next: Requirements = {
      ...requirements,
      functional: {
        ...requirements.functional,
        [id]: !requirements.functional[id],
      },
    };
    onChange(next);
  };


  const handleNonFunctionalChange = (key: keyof Requirements["nonFunctional"], raw: string) => {
    if (readOnly) return;
    const parsedValue = key === "availability" ? raw : Number(raw);
    const next: Requirements = {
      ...requirements,
      nonFunctional: {
        ...requirements.nonFunctional,
        [key]: parsedValue,
      },
    } as Requirements;
    onChange(next);
  };

  const handleSubmit = () => {
    const { readRps, writeRps, p95RedirectMs } = requirements.nonFunctional;
    if (readRps <= 0 || writeRps <= 0 || p95RedirectMs <= 0) {
      setError("Provide positive values for throughput and latency targets.");
      return;
    }
    setError(null);
    onContinue(requirements);
  };

  return (
    <form className="space-y-4 sm:space-y-6" aria-describedby="requirements-hint">
      <section className="rounded-xl border border-zinc-700 bg-zinc-900 p-3 sm:p-4 shadow-sm">
        <header className="mb-3 sm:mb-4 flex flex-col gap-2">
          <h2 className="text-lg sm:text-xl font-semibold text-white">Functional scope</h2>
          <p id="requirements-hint" className="text-sm text-zinc-400">
            Select what your MVP must support. Core flows are pre-selected.
          </p>
        </header>
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
          {FUNCTIONAL_TOGGLES.map((toggle) => (
            <div
              key={toggle.id}
              className={`flex min-h-[2.5rem] sm:min-h-[2.25rem] items-start gap-2 rounded-lg border px-2 py-2 sm:py-1.5 transition cursor-pointer hover:border-zinc-600 ${
                requirements.functional[toggle.id]
                  ? "border-blue-400 bg-blue-950/50"
                  : "border-zinc-700"
              } ${(locked || readOnly) ? "opacity-60" : ""}`}
              onClick={() => handleToggle(toggle.id)}
            >
              <span className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-white block">{toggle.label}</span>
                <span className="block text-xs text-zinc-400 leading-relaxed">{toggle.description}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-700 bg-zinc-900 p-3 sm:p-4 shadow-sm">
        <header className="mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-white">Non-functional targets</h2>
          <p className="text-sm text-zinc-400">
            Start with these baseline numbers; you can tighten them later.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-white">
            <span className="text-sm font-medium">Read throughput (requests per second)</span>
            <input
              type="number"
              min={1}
              step={100}
              value={requirements.nonFunctional.readRps}
              onChange={(event) => handleNonFunctionalChange("readRps", event.target.value)}
              disabled={locked || readOnly}
              className="h-12 rounded-lg border border-zinc-600 bg-zinc-800 px-3 text-base text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-900 min-h-[44px]"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-white">
            <span className="text-sm font-medium">Write throughput (requests per second)</span>
            <input
              type="number"
              min={1}
              step={10}
              value={requirements.nonFunctional.writeRps}
              onChange={(event) => handleNonFunctionalChange("writeRps", event.target.value)}
              disabled={locked || readOnly}
              className="h-12 rounded-lg border border-zinc-600 bg-zinc-800 px-3 text-base text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-900 min-h-[44px]"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-white">
            <span className="text-sm font-medium">P95 redirect latency (ms)</span>
            <input
              type="number"
              min={1}
              step={10}
              value={requirements.nonFunctional.p95RedirectMs}
              onChange={(event) => handleNonFunctionalChange("p95RedirectMs", event.target.value)}
              disabled={locked || readOnly}
              className="h-12 rounded-lg border border-zinc-600 bg-zinc-800 px-3 text-base text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-900 min-h-[44px]"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-white">
            <span className="text-sm font-medium">Availability target</span>
            <select
              value={requirements.nonFunctional.availability}
              onChange={(event) => handleNonFunctionalChange("availability", event.target.value)}
              disabled={locked || readOnly}
              className="h-12 rounded-lg border border-zinc-600 bg-zinc-800 px-3 text-base text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-900 min-h-[44px]"
            >
              <option value="99.0">99.0%</option>
              <option value="99.9">99.9%</option>
              <option value="99.99">99.99%</option>
            </select>
          </label>
        </div>
        <div className="mt-4 rounded-lg bg-amber-900/60 p-3 sm:p-4">
          <p className="text-sm text-amber-200 leading-relaxed">
            Keep read latency low by serving redirects from cache or edge. Database must not sit on the hot redirect path.
          </p>
        </div>
      </section>

      {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={locked || readOnly}
          className="inline-flex h-12 min-w-[140px] items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white shadow transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-zinc-400 min-h-[44px] touch-manipulation"
        >
          Continue
        </button>
      </div>
    </form>
  );
};

export default ReqForm;
