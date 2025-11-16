"use client";

import { useMemo, useState } from "react";
import type { LowLevel } from "@/lib/practice/types";
import { makeDefaultLowLevel, URL_SCHEMA } from "@/lib/practice/defaults";

// Simple API linting for practice APIs
function lintPracticeApi(apis: LowLevel["apis"]): string[] {
  const msgs: string[] = [];

  for (const api of apis) {
    // Path should start with "/"
    if (!api.path.startsWith("/")) {
      msgs.push(`Path "${api.path}" should start with "/".`);
    }

    // Avoid trailing slash
    if (api.path.endsWith("/") && api.path !== "/") {
      msgs.push(`Avoid trailing slash in "${api.path}".`);
    }

    // Path should use nouns, not verbs
    const pathParts = api.path.split("/").filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && !lastPart.startsWith(":") && isVerb(lastPart)) {
      msgs.push(`Path "${api.path}" should use nouns, not verbs. Consider restructuring.`);
    }

    // Suggest proper HTTP methods
    if (api.path.includes("/create") && api.method !== "POST") {
      msgs.push(`Create operation "${api.path}" should use POST method.`);
    }
    if (api.path.includes("/update") && api.method !== "POST") {
      msgs.push(
        `Update operation "${api.path}" should use POST method (since only GET/POST are available).`
      );
    }
    if (api.path.includes("/delete") && api.method !== "POST") {
      msgs.push(
        `Delete operation "${api.path}" should use POST method (since only GET/POST are available).`
      );
    }

    // POST endpoints should mention body in notes
    if (api.method === "POST" && (!api.notes || !api.notes.toLowerCase().includes("body"))) {
      msgs.push(`POST endpoint "${api.path}" should specify request body in notes.`);
    }
  }

  return msgs;
}

function isVerb(word: string): boolean {
  const commonVerbs = [
    "create",
    "update",
    "delete",
    "get",
    "fetch",
    "send",
    "post",
    "put",
    "add",
    "remove",
    "insert",
    "modify",
    "change",
    "save",
    "load",
    "retrieve",
  ];
  return commonVerbs.includes(word.toLowerCase());
}

type LowLevelEditorProps = {
  value?: LowLevel;
  locked: boolean;
  onChange: (value: LowLevel) => void;
  onContinue: (value: LowLevel) => void;
  readOnly?: boolean;
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
  } catch {
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

export const LowLevelEditor = ({
  value,
  locked,
  onChange,
  onContinue,
  readOnly = false,
}: LowLevelEditorProps) => {
  const [schemaErrors, setSchemaErrors] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);

  const lowLevel = useMemo(() => ensureDefaults(value), [value]);
  const { dbReads, hints } = useMemo(
    () =>
      buildCapacityHints(
        lowLevel.capacityAssumptions.readRps,
        lowLevel.capacityAssumptions.cacheHit
      ),
    [lowLevel.capacityAssumptions.cacheHit, lowLevel.capacityAssumptions.readRps]
  );
  const apiLintMessages = useMemo(() => lintPracticeApi(lowLevel.apis), [lowLevel.apis]);

  const setSchemas = (key: string, nextValue: string) => {
    if (readOnly) return;
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
    if (readOnly) return;
    const next: LowLevel = {
      ...lowLevel,
      apis: lowLevel.apis.map((api, i) => (i === index ? { ...api, notes } : api)),
    };
    onChange(next);
  };

  const updateCapacity = (key: keyof LowLevel["capacityAssumptions"], raw: string) => {
    if (readOnly) return;
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
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4 shadow-sm border-zinc-700 bg-zinc-900">
        <header className="mb-3 sm:mb-4 flex flex-col gap-1">
          <h2 className="text-lg sm:text-xl font-semibold text-white">Schemas</h2>
          <p className="text-sm text-zinc-400">
            Capture the core entities. Update JSON if you plan to persist more metadata.
          </p>
        </header>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
          {Object.entries(lowLevel.schemas).map(([name, schema]) => (
            <div key={name} className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-white">{name}</span>
              <textarea
                className="h-32 sm:h-48 w-full rounded-lg border border-zinc-300 bg-white p-3 font-mono text-xs leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-100 border-zinc-700 bg-zinc-900 text-zinc-100 min-h-[44px]"
                spellCheck={false}
                value={schema}
                onChange={(event) => setSchemas(name, event.target.value)}
                disabled={locked || readOnly}
                aria-invalid={Boolean(schemaErrors[name])}
              />
              {schemaErrors[name] ? (
                <span className="text-xs text-red-600 text-red-400">{schemaErrors[name]}</span>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4 shadow-sm border-zinc-700 bg-zinc-900">
        <header className="mb-3 sm:mb-4 flex flex-col gap-1">
          <h2 className="text-lg sm:text-xl font-semibold text-white">APIs</h2>
          <p className="text-sm text-zinc-400">
            Flesh out contracts and add notes about caching or validation.
          </p>
        </header>
        <div className="space-y-4">
          {lowLevel.apis.map((api, index) => (
            <div
              key={`${api.method}-${api.path}`}
              className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 sm:p-4"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-mono font-semibold bg-zinc-700 text-zinc-300 uppercase">
                    {api.method}
                  </span>
                  <span className="font-mono text-sm text-blue-300 flex-1 min-w-0 break-all">
                    {api.path}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Notes</label>
                  <textarea
                    className="w-full rounded-md border border-zinc-300 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-100 border-zinc-600 bg-zinc-900 text-zinc-100 min-h-[44px]"
                    rows={3}
                    value={api.notes ?? ""}
                    onChange={(event) => updateApiNote(index, event.target.value)}
                    disabled={locked || readOnly}
                    placeholder="Add notes about request/response format, caching, validation..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        {apiLintMessages.length > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 bg-amber-900/20 border-amber-800/50">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-4 h-4 text-amber-600 text-amber-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-semibold text-amber-800 text-amber-200">
                API Design Suggestions
              </span>
            </div>
            <ul className="text-sm text-amber-700 text-amber-300 space-y-1">
              {apiLintMessages.map((msg, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>{msg}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4 shadow-sm border-zinc-700 bg-zinc-900">
        <header className="mb-3 sm:mb-4 flex flex-col gap-1">
          <h2 className="text-lg sm:text-xl font-semibold text-white">Capacity mini-calc</h2>
          <p className="text-sm text-zinc-400">
            Use this to reason about cache pressure and DB load.
          </p>
        </header>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm text-white">
            <span className="text-sm font-medium">Read throughput (redirects /s)</span>
            <input
              type="number"
              min={1}
              step={100}
              value={lowLevel.capacityAssumptions.readRps}
              onChange={(event) => updateCapacity("readRps", event.target.value)}
              disabled={locked || readOnly}
              className="h-12 rounded-lg border border-zinc-300 px-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-100 border-zinc-600 bg-zinc-800 text-zinc-100 min-h-[44px]"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-white">
            <span className="text-sm font-medium">Cache hit rate (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={lowLevel.capacityAssumptions.cacheHit}
              onChange={(event) => updateCapacity("cacheHit", event.target.value)}
              disabled={locked || readOnly}
              className="h-12 rounded-lg border border-zinc-300 px-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-100 border-zinc-600 bg-zinc-800 text-zinc-100 min-h-[44px]"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-white">
            <span className="text-sm font-medium">Writes per create</span>
            <input
              type="number"
              min={1}
              step={1}
              value={lowLevel.capacityAssumptions.avgWritesPerCreate}
              onChange={(event) => updateCapacity("avgWritesPerCreate", event.target.value)}
              disabled={locked || readOnly}
              className="h-12 rounded-lg border border-zinc-300 px-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-100 border-zinc-600 bg-zinc-800 text-zinc-100 min-h-[44px]"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-2 rounded-lg bg-blue-950/60 p-3 sm:p-4 text-sm text-blue-100">
          <p className="leading-relaxed">
            Derived DB reads: <strong>{dbReads.toLocaleString()}</strong> per second (~
            {Math.round(dbReads)} /s).
          </p>
          <ul className="list-disc space-y-1 pl-4 sm:pl-5">
            {hints.slice(0, 3).map((hint) => (
              <li key={hint} className="leading-relaxed">
                {hint}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {error ? (
        <p role="alert" className="text-sm text-red-600 text-red-400">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleContinue}
          disabled={locked || readOnly}
          className="inline-flex h-12 min-w-[140px] items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white shadow transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-zinc-400 min-h-[44px] touch-manipulation"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default LowLevelEditor;
