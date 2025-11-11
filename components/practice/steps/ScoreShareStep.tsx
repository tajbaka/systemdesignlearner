"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { encodeDesign as encodeShare } from "@/lib/shareLink";
import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import { track } from "@/lib/analytics";
import { logger } from "@/lib/logger";
import type { CumulativeScore, FeedbackResult } from "@/lib/scoring/types";
import { getGradeDescription, getGradeColor, calculateCumulativeScore } from "@/lib/scoring/index";
import type { IterativeFeedbackResult } from "@/lib/scoring/ai/iterative";

type ShareStatus = "idle" | "copied" | "error";

const createEmptyResult = (maxScore: number): FeedbackResult => ({
  score: 0,
  maxScore,
  percentage: 0,
  blocking: [],
  warnings: [],
  positive: [],
  suggestions: [],
});

const formatScore = (value: number): string =>
  Number.isInteger(value) ? value.toString() : value.toFixed(1);

const getMaxPoints = (result: FeedbackResult | undefined, fallback: number): number =>
  result?.maxScore ?? fallback;

const fromIterativeResult = (result: IterativeFeedbackResult): FeedbackResult => {
  const feedback: FeedbackResult = {
    score: result.score.obtained,
    maxScore: result.score.max,
    percentage: result.score.percentage,
    blocking: result.ui.blocking
      ? [
          {
            category: "requirement",
            severity: "blocking",
            message: result.ui.nextPrompt ?? result.nextQuestion?.question ?? "Address the remaining topic to continue.",
          },
        ]
      : [],
    warnings: [],
    positive: result.ui.coveredLines.map((line) => ({
      category: "bestPractice",
      severity: "positive",
      message: line,
    })),
    suggestions: [],
    improvementQuestion: result.ui.nextPrompt ?? result.nextQuestion?.question ?? undefined,
  };
  return feedback;
};

const buildSharePayload = (state: ReturnType<typeof usePracticeSession>["state"]) => ({
  scenarioId: state.slug,
  nodes: state.design.nodes.map((node) => ({
    id: node.id,
    kind: node.spec.kind,
    x: node.x,
    y: node.y,
    replicas: node.replicas,
    customLabel: node.customLabel,
  })),
  edges: state.design.edges.map((edge) => ({
    id: edge.id,
    from: edge.from,
    to: edge.to,
    linkLatencyMs: edge.linkLatencyMs,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
  })),
});

export function ScoreShareStep() {
  const { state, setStep, isReadOnly: _isReadOnly } = usePracticeSession();
  const lastResult = state.run.lastResult;
  const scores = state.scores;
  const score = lastResult?.scoreBreakdown;
  const outcome = score?.outcome ?? (lastResult?.failedByChaos ? "chaos_fail" : undefined);
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");

  // Calculate cumulative score from all practice steps
  const simulationScoreResult = useMemo<FeedbackResult>(() => {
    const base = createEmptyResult(5);

    if (!lastResult) {
      return base;
    }

    if (lastResult.scoreBreakdown?.outcome === "pass") {
      return {
        ...base,
        score: base.maxScore,
        percentage: 100,
        positive: [
          {
            category: "performance",
            severity: "positive",
            message: "✓ Simulation passed with meeting requirements",
          },
        ],
      };
    }

    return base;
  }, [lastResult]);

  const cumulativeScore: CumulativeScore | null = useMemo(() => {
    if (!scores?.functional || !scores?.nonFunctional || !scores?.api) {
      return null;
    }

    const designScore = scores.design ?? createEmptyResult(30);

    return calculateCumulativeScore(
      scores.functional,
      scores.nonFunctional,
      scores.api,
      designScore,
      simulationScoreResult
    );
  }, [scores, simulationScoreResult]);

  const getStepResult = useCallback(
    (key: "functional" | "nonFunctional" | "api" | "design", fallbackMax: number): FeedbackResult => {
      if (key !== "design") {
        const iterative = state.iterativeFeedback?.[key]?.cachedResult;
        if (iterative) {
          return fromIterativeResult(iterative);
        }
      }
      return scores?.[key] ?? createEmptyResult(fallbackMax);
    },
    [scores, state.iterativeFeedback]
  );

  const stepScoreItems = useMemo(
    () => [
      {
        id: "functional",
        label: "Functional Requirements",
        barClass: "bg-emerald-500",
        result: getStepResult("functional", 20),
        maxFallback: 20,
      },
      {
        id: "nonFunctional",
        label: "Non-Functional Requirements",
        barClass: "bg-blue-500",
        result: getStepResult("nonFunctional", 20),
        maxFallback: 20,
      },
      {
        id: "api",
        label: "API Definition",
        barClass: "bg-cyan-500",
        result: getStepResult("api", 20),
        maxFallback: 20,
      },
      {
        id: "design",
        label: "High-Level Design",
        barClass: "bg-purple-500",
        result: getStepResult("design", 30),
        maxFallback: 30,
      },
    ].map((step) => ({
      ...step,
      maxPoints: getMaxPoints(step.result, step.maxFallback),
    })),
    [getStepResult]
  );

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const payload = buildSharePayload(state);
    return `${window.location.origin}/play?s=${encodeShare(payload)}`;
  }, [state]);

  useEffect(() => {
    if (!score) return;
    track("practice_score_viewed", {
      slug: state.slug,
      score: score.totalScore,
      outcome: score.outcome,
      attempts: state.run.attempts,
    });
  }, [score, state.slug, state.run.attempts]);

  useEffect(() => {
    if (shareStatus === "idle") return;
    const timeout = window.setTimeout(() => setShareStatus("idle"), 2500);
    return () => window.clearTimeout(timeout);
  }, [shareStatus]);

  const handleShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus("copied");
      track("practice_shared", {
        slug: state.slug,
        score: score?.totalScore ?? 0,
        destination: "share_badge",
      });
    } catch (error) {
      logger.error("Share failed", error);
      setShareStatus("error");
    }
  };

  const linkedinHref = shareUrl
    ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    : "https://www.linkedin.com/shareArticle";

  const hints = score?.hints ?? [];

  const summaryCopy = outcome === "pass"
    ? "Redirect path meets the targets you set — nice work!"
    : outcome === "partial"
      ? "Close! Address the notes below, then re-run to bump your score."
      : "Keep iterating. Use the hints and rerun the simulation.";

  return (
    <div className="space-y-6">
      <div className="px-4 text-center sm:px-6">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            URL Shortener
          </h2>
        </div>
      </div>

      {/* Overall Score Section */}
      {!cumulativeScore ? (
        <section className="space-y-6 rounded-3xl border border-amber-800 bg-amber-900/20 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl">
          <div className="text-center space-y-4">
            <div className="text-6xl">⚠️</div>
            <h3 className="text-xl font-semibold text-amber-200">Incomplete Practice Session</h3>
            <p className="text-sm text-amber-100">
              You need to complete all steps (Functional Requirements, Non-Functional Requirements, API Definition, and Design with Simulation) to see your final score.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => setStep("functional")}
                className="inline-flex h-10 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/10 px-4 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                Go to Step 1
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl">
          <div className="text-center space-y-4">
            <div>
              <div className={`inline-block text-6xl sm:text-8xl font-bold text-${getGradeColor(cumulativeScore.grade)}-400`}>
                {cumulativeScore.grade}
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-semibold text-white">
                {formatScore(cumulativeScore.total)}/100
              </div>
              <div className="mt-1 text-sm text-zinc-400">
                {getGradeDescription(cumulativeScore.grade)}
              </div>
            </div>
          </div>

          {/* Score Breakdown by Step */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
              Score by Step
            </h3>
            <div className="space-y-2">
              {stepScoreItems.map((step, index) => {
                const percentage =
                  step.maxPoints === 0 ? 0 : Math.min(100, (step.result.score / step.maxPoints) * 100);
                return (
                  <div
                    key={step.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-zinc-700 bg-zinc-900/60 p-3"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium text-zinc-200 truncate">{step.label}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="h-2 w-16 sm:w-24 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className={`h-full ${step.barClass}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-white min-w-[3rem] sm:min-w-[5rem] text-right">
                        {formatScore(step.result.score)}/{formatScore(step.maxPoints)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </section>
      )}

      <section className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setStep("sandbox")}
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 px-5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
          >
            Improve design
          </button>
          <button
            type="button"
            onClick={handleShare}
            className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
              shareStatus === "copied"
                ? "border border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                : "border border-blue-400/40 bg-blue-500/15 text-blue-100 hover:bg-blue-500/25"
            }`}
          >
            {shareStatus === "copied" ? "Link copied" : shareStatus === "error" ? "Copy failed" : "Share design"}
          </button>
          <a
            href={linkedinHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/10 px-5 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            Share on LinkedIn
          </a>
        </div>

        {hints.length ? (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-200">Suggestions</h4>
            <ul className="mt-3 space-y-2">
              {hints.map((hint: string) => (
                <li key={hint} className="flex items-start gap-2">
                  <span aria-hidden className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-200" />
                  <span>{hint}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="text-sm text-center text-zinc-400">
          Continue practice tomorrow for new systems and tougher latency targets.
        </p>
      </section>
    </div>
  );
}

export default ScoreShareStep;
