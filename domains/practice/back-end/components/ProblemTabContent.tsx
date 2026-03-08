"use client";

import { useState } from "react";
import { ChevronRight, ExternalLink } from "lucide-react";
import { Lock } from "lucide-react";
import { PRACTICE_STEPS, STEPS } from "../constants";
import { usePractice } from "../context/PracticeContext";
import useStepStore from "../hooks/useStore";
import type { Hint, Solution, ProblemConfig, DesignSolution } from "../types";
import { formatSolution } from "../utils/solutionHelpers";

const REQUIRED_ATTEMPTS = 3;

function getAttemptsForStep(
  store: ReturnType<typeof useStepStore>,
  stepType: string | null
): number {
  if (!stepType) return 0;
  if (stepType === "functional") return store.functionalRequirements.attempts ?? 0;
  if (stepType === "nonFunctional") return store.nonFunctionalRequirements.attempts ?? 0;
  if (stepType === "api") return store.apiDesign.attempts ?? 0;
  if (stepType === "highLevelDesign") return store.highLevelDesign.attempts ?? 0;
  return 0;
}

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

function getSolutionsForStep(config: ProblemConfig, stepType: string | null): Solution[] {
  if (!stepType || stepType === STEPS.SCORE || stepType === STEPS.HIGH_LEVEL_DESIGN) return [];

  const stepKey = stepType as keyof ProblemConfig["steps"];
  const stepData = config.steps[stepKey];
  if (!stepData?.requirements) return [];

  const requirements = stepData.requirements as Array<{ solutions?: Solution[] }>;
  return requirements.flatMap((req) => req.solutions ?? []);
}

function firstOccurrenceHrefIds(hints: Hint[]): Set<string> {
  const seenHrefs = new Set<string>();
  const ids = new Set<string>();
  for (const hint of hints) {
    if (!hint.href) continue;
    if (!seenHrefs.has(hint.href)) {
      seenHrefs.add(hint.href);
      ids.add(hint.id);
    }
  }
  return ids;
}

function CollapsibleHint({
  hint,
  index,
  showHref,
}: {
  hint: Hint;
  index: number;
  showHref: boolean;
}) {
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
          {showHref && hint.href && hint.title && (
            <div className="mt-2">
              <a
                href={hint.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
              >
                {hint.title}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CollapsibleSolution({ solution, index }: { solution: Solution; index: number }) {
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
        <span className="font-medium truncate">Item {index + 1}</span>
      </button>
      {open && (
        <div className="border-t border-zinc-800 px-3 py-2.5 text-sm leading-relaxed text-zinc-400 whitespace-pre-line">
          {formatSolution(solution)}
        </div>
      )}
    </div>
  );
}

export function ProblemTabContent() {
  const { config, stepType, slug } = usePractice();
  const store = useStepStore(slug);

  const stepDef = stepType ? PRACTICE_STEPS[stepType as keyof typeof PRACTICE_STEPS] : null;

  const articles = config.articles ?? [];
  const hints = getHintsForStep(config, stepType);
  const hintIdsWithHref = firstOccurrenceHrefIds(hints);
  const solutions = getSolutionsForStep(config, stepType);
  const attempts = getAttemptsForStep(store, stepType);
  const solutionLocked = attempts < REQUIRED_ATTEMPTS;
  const remaining = REQUIRED_ATTEMPTS - attempts;

  return (
    <div className="flex flex-col gap-0 divide-y divide-zinc-800">
      {/* Section 1 — Problem listing */}
      <section className="space-y-3 p-5">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Problem</p>
          <h3 className="text-base font-semibold text-white">{config.title}</h3>
          <p className="text-sm leading-relaxed text-zinc-400">{config.description}</p>
        </div>

        {articles.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Prerequisites
            </p>
            <div className="flex flex-wrap gap-1.5">
              {articles.map((article) => (
                <a
                  key={article.id}
                  href={article.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
                >
                  {article.title}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          </div>
        )}
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
                <CollapsibleHint
                  key={`${hint.id}-${i}`}
                  hint={hint}
                  index={i}
                  showHref={hintIdsWithHref.has(hint.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Section 3 — Solutions */}
      {solutions.length > 0 && (
        <section className="space-y-3 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Solution</p>

          <div className="relative">
            {solutionLocked && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-md bg-zinc-950/80 backdrop-blur-sm">
                <Lock className="h-5 w-5 text-zinc-500" />
                <p className="text-sm font-medium text-zinc-400">
                  Available in {remaining} {remaining === 1 ? "attempt" : "attempts"}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              {solutions.map((sol, i) => (
                <CollapsibleSolution key={i} solution={sol} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
