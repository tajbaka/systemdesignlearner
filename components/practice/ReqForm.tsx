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

  const handleToggle = (id: string, checked: boolean) => {
    if (readOnly) return;
    const next: Requirements = {
      ...requirements,
      functional: {
        ...requirements.functional,
        [id]: checked,
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
    <form className="space-y-6" aria-describedby="requirements-hint">
      <section className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-sm">
        <header className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Functional scope</h2>
            <p id="requirements-hint" className="text-sm text-zinc-400">
              Select what your MVP must support. Core flows are pre-selected.
            </p>
          </div>
        </header>
        <div className="grid gap-3 sm:grid-cols-2">
          {FUNCTIONAL_TOGGLES.map((toggle) => (
            <label
              key={toggle.id}
              className={`flex min-h-[3.25rem] items-start gap-3 rounded-lg border px-3 py-2 transition focus-within:ring-2 focus-within:ring-blue-500 ${
                requirements.functional[toggle.id]
                  ? "border-blue-400 bg-blue-950/50"
                  : "border-zinc-700"
              } ${(locked || readOnly) ? "opacity-60" : ""} ${readOnly ? "" : "cursor-pointer"}`}
            >
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0 rounded border-zinc-600 text-blue-600 focus:ring-blue-500"
                checked={Boolean(requirements.functional[toggle.id])}
                onChange={(event) => handleToggle(toggle.id, event.target.checked)}
                disabled={locked || readOnly}
              />
              <span>
                <span className="text-sm font-semibold text-white">{toggle.label}</span>
                <span className="block text-xs text-zinc-400">{toggle.description}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-sm">
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-white">Non-functional targets</h2>
          <p className="text-sm text-zinc-400">
            Start with these baseline numbers; you can tighten them later.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-white">
            <span>Read throughput (requests per second)</span>
            <input
              type="number"
              min={1}
              step={100}
              value={requirements.nonFunctional.readRps}
              onChange={(event) => handleNonFunctionalChange("readRps", event.target.value)}
              disabled={locked || readOnly}
              className="h-12 rounded-lg border border-zinc-600 bg-zinc-800 px-3 text-base text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-white">
            <span>Write throughput (requests per second)</span>
            <input
              type="number"
              min={1}
              step={10}
              value={requirements.nonFunctional.writeRps}
              onChange={(event) => handleNonFunctionalChange("writeRps", event.target.value)}
              disabled={locked || readOnly}
              className="h-12 rounded-lg border border-zinc-600 bg-zinc-800 px-3 text-base text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-white">
            <span>P95 redirect latency (ms)</span>
            <input
              type="number"
              min={1}
              step={10}
              value={requirements.nonFunctional.p95RedirectMs}
              onChange={(event) => handleNonFunctionalChange("p95RedirectMs", event.target.value)}
              disabled={locked || readOnly}
              className="h-12 rounded-lg border border-zinc-600 bg-zinc-800 px-3 text-base text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-white">
            <span>Availability target</span>
            <select
              value={requirements.nonFunctional.availability}
              onChange={(event) => handleNonFunctionalChange("availability", event.target.value)}
              disabled={locked || readOnly}
              className="h-12 rounded-lg border border-zinc-600 bg-zinc-800 px-3 text-base text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-900"
            >
              <option value="99.0">99.0%</option>
              <option value="99.9">99.9%</option>
              <option value="99.99">99.99%</option>
            </select>
          </label>
        </div>
        <p className="mt-4 rounded-lg bg-amber-900/60 p-3 text-sm text-amber-200">
          Keep read latency low by serving redirects from cache or edge. Database must not sit on the hot redirect path.
        </p>
      </section>

      {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={locked || readOnly}
          className="inline-flex h-12 min-w-[140px] items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white shadow transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          Continue
        </button>
      </div>
    </form>
  );
};

export default ReqForm;
