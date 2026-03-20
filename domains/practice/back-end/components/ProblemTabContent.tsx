"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { PRACTICE_STEPS, STEPS } from "../constants";
import { usePractice } from "../context/PracticeContext";
import type { Hint, ProblemConfig, DesignSolution } from "../types";

function getHintsForStep(config: ProblemConfig, stepType: string | null): Hint[] {
  if (!stepType || stepType === STEPS.SCORE) return [];

  const stepKey = stepType as keyof ProblemConfig["steps"];
  const stepData = config.steps[stepKey];
  if (!stepData?.requirements) return [];

  if (stepType === STEPS.HIGH_LEVEL_DESIGN) {
    const solutions = stepData.requirements as DesignSolution[];
    return solutions.flatMap((sol) => sol.edges.flatMap((edge) => edge.hints ?? []));
  }

  const requirements = stepData.requirements as Array<{ hints?: Hint[] }>;
  return requirements.flatMap((req) => req.hints ?? []);
}

function CollapsibleHint({ hint, index }: { hint: Hint; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-300 hover:text-white transition-colors"
      >
        <ChevronRight
          className={`h-3.5 w-3.5 flex-shrink-0 text-zinc-500 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
        />
        <span className="font-medium truncate">Hint {index + 1}</span>
      </button>
      {open && (
        <div className="border-t border-zinc-800 px-3 py-2.5 text-sm leading-relaxed text-zinc-400">
          <p>{hint.text}</p>
        </div>
      )}
    </div>
  );
}

export function ProblemTabContent() {
  const { config, stepType } = usePractice();

  const stepDef = stepType ? PRACTICE_STEPS[stepType as keyof typeof PRACTICE_STEPS] : null;
  const hints = getHintsForStep(config, stepType);

  return (
    <div className="flex flex-col gap-0 divide-y divide-zinc-800">
      {/* Section 1 — Problem listing */}
      <section className="space-y-3 p-5">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Problem</p>
          <h3 className="text-base font-semibold text-white">{config.title}</h3>
          <p className="text-sm leading-relaxed text-zinc-400">{config.description}</p>
        </div>
      </section>

      {/* Section 2 — Step definition + hints */}
      {stepDef && (
        <section className="space-y-3 p-5">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Step</p>
            <h3 className="text-base font-semibold text-white">{stepDef.title}</h3>
            <p className="text-sm leading-relaxed text-zinc-400">{stepDef.tooltipDescription}</p>
          </div>

          {hints.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {hints.map((hint, i) => (
                <CollapsibleHint key={`${hint.id}-${i}`} hint={hint} index={i} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
