"use client";

import { useMemo, useState } from "react";
import type { LowLevel } from "@/lib/practice/types";
import { makeDefaultLowLevel, URL_SCHEMA, CLICK_SCHEMA } from "@/lib/practice/defaults";

type LowLevelEditorProps = {
  value?: LowLevel;
  locked: boolean;
  onChange: (value: LowLevel) => void;
  onContinue: (value: LowLevel) => void;
};

const DEFAULT_APIS: LowLevel["apis"] = makeDefaultLowLevel().apis;

const ensureDefaults = (value?: LowLevel): LowLevel => {
  if (!value) {
    return makeDefaultLowLevel();
  }

  return {
    schemas: {
      Url: value.schemas?.Url ?? URL_SCHEMA,
      ...(value.schemas?.ClickEvent ? { ClickEvent: value.schemas.ClickEvent } : {}),
    },
    apis: value.apis?.length ? value.apis : DEFAULT_APIS,
    capacityAssumptions: {
      cacheHit: value.capacityAssumptions?.cacheHit ?? 95,
      avgWritesPerCreate: value.capacityAssumptions?.avgWritesPerCreate ?? 1,
      readRps: value.capacityAssumptions?.readRps ?? 5000,
    },
  };
};

const parseJson = (raw: string) => {
  try {
    JSON.parse(raw);
    return true;
  } catch (error) {
    return false;
  }
};

const buildCapacityHints = (readRps: number, cacheHit: number) => {
  const missRate = Math.max(0, Math.min(100, 100 - cacheHit));
  const dbReads = Math.round(readRps * (missRate / 100));
  const hints: string[] = [];

  if (dbReads > 1000) {
    hints.push("Miss traffic is heavy; introduce regional caches or read replicas.");
  }
  if (missRate > 10) {
    hints.push("Improve cache hit rate with longer TTL or redirect pre-warming.");
  }
  if (dbReads > readRps * 0.2) {
    hints.push("Redirects still lean on DB; ensure connection pooling and async logging.");
  }

  if (hints.length === 0) {
    hints.push("Cache keeps DB reads manageable; monitor for hot-key churn.");
  }

  return { dbReads, hints };
};

export const LowLevelEditor = ({ value, locked, onChange, onContinue }: LowLevelEditorProps) => {
  const [schemaErrors, setSchemaErrors] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);

  const lowLevel = useMemo(() => ensureDefaults(value), [value]);
  const { dbReads, hints } = useMemo(
    () => buildCapacityHints(lowLevel.capacityAssumptions.readRps, lowLevel.capacityAssumptions.cacheHit),
    [lowLevel.capacityAssumptions.cacheHit, lowLevel.capacityAssumptions.readRps]
  );

  const setSchemas = (key: string, nextValue: string) => {
    const next: LowLevel = {
      ...lowLevel,
      schemas: {
        ...lowLevel.schemas,
        [key]: nextValue,
      },
    };
    onChange(next);
    setSchemaErrors((prev) => ({
      ...prev,
      [key]: parseJson(nextValue) ? null : "Invalid JSON schema",
    }));
  };

  const updateApiNote = (index: number, notes: string) => {
    const next: LowLevel = {
      ...lowLevel,
      apis: lowLevel.apis.map((api, i) => (i === index ? { ...api, notes } : api)),
    };
    onChange(next);
  };

  const updateCapacity = (key: keyof LowLevel["capacityAssumptions"], raw: string) => {
    const parsed = Number(raw);
    const next: LowLevel = {
      ...lowLevel,
      capacityAssumptions: {
        ...lowLevel.capacityAssumptions,
        [key]: Number.isNaN(parsed) ? 0 : parsed,
      },
    };
    onChange(next);
  };

  const handleContinue = () => {
    const schemasAreValid = Object.entries(lowLevel.schemas).every(([key, schema]) => {
      const valid = parseJson(schema);
      if (!valid) {
        setSchemaErrors((prev) => ({ ...prev, [key]: "Invalid JSON schema" }));
      }
      return valid;
    });
    if (!schemasAreValid) {
      setError("Fix schema JSON before continuing.");
      return;
    }

    if (lowLevel.capacityAssumptions.cacheHit < 0 || lowLevel.capacityAssumptions.cacheHit > 100) {
      setError("Cache hit rate must be between 0 and 100.");
      return;
    }

    if (lowLevel.capacityAssumptions.readRps <= 0) {
      setError("Provide a positive read throughput estimate.");
      return;
    }

    if (lowLevel.capacityAssumptions.avgWritesPerCreate <= 0) {
      setError("Writes per create should be at least 1 (DB + cache operations). ");
      return;
    }

    setError(null);
    onContinue(lowLevel);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <header className="mb-4 flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Schemas</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Capture the core entities. Update JSON if you plan to persist more metadata.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(lowLevel.schemas).map(([name, schema]) => (
            <label key={name} className="flex flex-col gap-2">
              <span className="text-sm font-semibold">{name}</span>
              <textarea
                className="h-48 w-full rounded-lg border border-zinc-300 bg-white p-3 font-mono text-xs leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                spellCheck={false}
                value={schema}
                onChange={(event) => setSchemas(name, event.target.value)}
                disabled={locked}
                aria-invalid={Boolean(schemaErrors[name])}
              />
              {schemaErrors[name] ? (
                <span className="text-xs text-red-600 dark:text-red-400">{schemaErrors[name]}</span>
              ) : null}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <header className="mb-4 flex flex-col gap-1">
          <h2 className="text-lg font-semibold">APIs</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Flesh out contracts and add notes about caching or validation.
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-700">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2 text-left">Method</th>
                <th className="px-3 py-2 text-left">Path</th>
                <th className="px-3 py-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {lowLevel.apis.map((api, index) => (
                <tr key={`${api.method}-${api.path}`} className="align-top">
                  <td className="px-3 py-2 font-mono text-xs uppercase text-zinc-600 dark:text-zinc-300">{api.method}</td>
                  <td className="px-3 py-2 font-mono text-xs text-blue-600 dark:text-blue-300">{api.path}</td>
                  <td className="px-3 py-2">
                    <textarea
                      className="w-full rounded-md border border-zinc-300 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      rows={3}
                      value={api.notes ?? ""}
                      onChange={(event) => updateApiNote(index, event.target.value)}
                      disabled={locked}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <header className="mb-4 flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Capacity mini-calc</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Use this to reason about cache pressure and DB load.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>Read throughput (redirects /s)</span>
            <input
              type="number"
              min={1}
              step={100}
              value={lowLevel.capacityAssumptions.readRps}
              onChange={(event) => updateCapacity("readRps", event.target.value)}
              disabled={locked}
              className="h-12 rounded-lg border border-zinc-300 px-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Cache hit rate (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={lowLevel.capacityAssumptions.cacheHit}
              onChange={(event) => updateCapacity("cacheHit", event.target.value)}
              disabled={locked}
              className="h-12 rounded-lg border border-zinc-300 px-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Writes per create</span>
            <input
              type="number"
              min={1}
              step={1}
              value={lowLevel.capacityAssumptions.avgWritesPerCreate}
              onChange={(event) => updateCapacity("avgWritesPerCreate", event.target.value)}
              disabled={locked}
              className="h-12 rounded-lg border border-zinc-300 px-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-2 rounded-lg bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-950/60 dark:text-blue-100">
          <p>
            Derived DB reads: <strong>{dbReads.toLocaleString()}</strong> per second (~{Math.round(dbReads)} /s).
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {hints.slice(0, 3).map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </div>
      </section>

      {error ? <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleContinue}
          disabled={locked}
          className="inline-flex h-12 min-w-[140px] items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white shadow transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default LowLevelEditor;
