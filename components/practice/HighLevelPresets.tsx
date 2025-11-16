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
    className="mt-3 h-20 sm:h-28 w-full"
    viewBox="0 0 240 120"
    role="presentation"
  >
    {components.map((component, index) => {
      const y = 12 + index * 34;
      return (
        <g key={component} transform={`translate(16, ${y})`}>
          <rect width={208} height={28} rx={8} className="fill-blue-950 stroke-blue-400/80" />
          <text x={12} y={18} className="fill-blue-200 text-[10px] sm:text-[12px] font-medium">
            {component}
          </text>
        </g>
      );
    })}
  </svg>
);

export const HighLevelPresets = ({
  value,
  locked,
  onChange,
  onContinue,
  readOnly = false,
}: HighLevelPresetsProps) => {
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
    <div className="space-y-4 sm:space-y-6">
      <p className="text-sm text-zinc-400 px-1">
        Choose the architecture that best fits the redirect workload. Cards are keyboard focusable
        and clickable.
      </p>
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {PRESETS.map((preset) => {
          const isSelected = preset.presetId === currentPresetId;
          return (
            <button
              key={preset.presetId}
              type="button"
              onClick={() => {
                if ("vibrate" in navigator && !isSelected) navigator.vibrate(30);
                handleSelect(preset);
              }}
              disabled={locked || readOnly}
              aria-pressed={isSelected}
              className={`relative flex h-full flex-col rounded-2xl border p-4 sm:p-5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 touch-manipulation min-h-[44px] haptic-feedback ${
                isSelected
                  ? "border-blue-400 bg-blue-950"
                  : "border-zinc-700 bg-zinc-900 hover:border-blue-400/60 hover:bg-blue-950/40"
              } ${locked || readOnly ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <span className="block text-base sm:text-lg font-semibold text-white">
                    {preset.title}
                  </span>
                  <span className="block text-sm text-zinc-400 leading-relaxed">
                    {preset.tagline}
                  </span>
                </div>
                {preset.highlight ? (
                  <span className="rounded-full bg-emerald-500 px-2 sm:px-3 py-1 text-xs font-semibold text-white flex-shrink-0">
                    {preset.highlight}
                  </span>
                ) : null}
              </div>
              <Diagram components={preset.components} />
              <ul className="mt-3 sm:mt-4 list-disc space-y-1 pl-4 sm:pl-5 text-xs text-zinc-400">
                {preset.notes?.map((note) => (
                  <li key={note} className="leading-relaxed">
                    {note}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-400">
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

export default HighLevelPresets;
