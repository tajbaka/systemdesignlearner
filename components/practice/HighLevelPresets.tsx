"use client";

import type { HighLevelChoice } from "@/lib/practice/types";
import { PRESET_CHOICES } from "@/lib/practice/defaults";
import { useMemo, useState } from "react";

type HighLevelPresetsProps = {
  value?: HighLevelChoice;
  locked: boolean;
  onChange: (value: HighLevelChoice) => void;
  onContinue: (value: HighLevelChoice) => void;
  readOnly?: boolean;
};

type Preset = HighLevelChoice & {
  title: string;
  tagline: string;
  highlight?: string;
};

const buildPreset = (choice: HighLevelChoice): Preset => {
  switch (choice.presetId) {
    case "cache_primary":
      return {
        ...choice,
        title: "Cache First",
        tagline: "Redirect path hits cache; DB on write/miss.",
        highlight: "Recommended",
      };
    case "global_edge_cache":
      return {
        ...choice,
        title: "Global Edge",
        tagline: "Edge cache backed by regional services.",
      };
    default:
      return {
        ...choice,
        title: "DB Only",
        tagline: "Single service writes straight to the database.",
      };
  }
};

const PRESETS: Preset[] = PRESET_CHOICES.map(buildPreset);

const makeSelection = (preset: Preset): HighLevelChoice => ({
  presetId: preset.presetId,
  components: [...preset.components],
  notes: preset.notes ? [...preset.notes] : [],
});

const Diagram = ({ components }: { components: string[] }) => (
  <svg
    aria-hidden
    focusable="false"
    className="mt-3 h-28 w-full"
    viewBox="0 0 240 120"
    role="presentation"
  >
    {components.map((component, index) => {
      const y = 12 + index * 34;
      return (
        <g key={component} transform={`translate(16, ${y})`}>
          <rect
            width={208}
            height={28}
            rx={8}
            className="fill-blue-100 stroke-blue-400 dark:fill-blue-950 dark:stroke-blue-400/80"
          />
          <text
            x={12}
            y={18}
            className="fill-blue-900 text-[12px] font-medium dark:fill-blue-200"
          >
            {component}
          </text>
        </g>
      );
    })}
  </svg>
);

export const HighLevelPresets = ({ value, locked, onChange, onContinue, readOnly = false }: HighLevelPresetsProps) => {
  const [error, setError] = useState<string | null>(null);

  const currentPresetId = value?.presetId;
  const selected = useMemo(() => {
    if (!currentPresetId) return undefined;
    const preset = PRESETS.find((p) => p.presetId === currentPresetId);
    return preset ? makeSelection(preset) : value;
  }, [currentPresetId, value]);

  const handleSelect = (preset: Preset) => {
    if (readOnly) return;
    const selection = makeSelection(preset);
    onChange(selection);
    setError(null);
  };

  const handleContinue = () => {
    if (!selected) {
      setError("Pick an architecture preset before continuing.");
      return;
    }
    setError(null);
    onContinue(selected);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Choose the architecture that best fits the redirect workload. Cards are keyboard focusable and clickable.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {PRESETS.map((preset) => {
          const isSelected = preset.presetId === currentPresetId;
          return (
            <button
              key={preset.presetId}
              type="button"
              onClick={() => handleSelect(preset)}
              disabled={locked || readOnly}
              aria-pressed={isSelected}
              className={`relative flex h-full flex-col rounded-2xl border p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isSelected
                  ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950"
                  : "border-zinc-200 bg-white hover:border-blue-300 hover:bg-blue-50/60 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-blue-400/60 dark:hover:bg-blue-950/40"
              } ${(locked || readOnly) ? "opacity-60" : ""}`}
            >
              <span className="flex items-start justify-between gap-2">
                <span>
                  <span className="block text-base font-semibold">{preset.title}</span>
                  <span className="block text-sm text-zinc-600 dark:text-zinc-400">{preset.tagline}</span>
                </span>
                {preset.highlight ? (
                  <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
                    {preset.highlight}
                  </span>
                ) : null}
              </span>
              <Diagram components={preset.components} />
              <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-zinc-600 dark:text-zinc-400">
                {preset.notes?.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      {error ? <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleContinue}
          disabled={locked || readOnly}
          className="inline-flex h-12 min-w-[140px] items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white shadow transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default HighLevelPresets;
