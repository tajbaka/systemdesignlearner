"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { encodeDesign as encodeShare } from "@/lib/shareLink";
import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import { track } from "@/lib/analytics";
import { logger } from "@/lib/logger";
import type { CumulativeScore, FeedbackResult } from "@/lib/scoring/types";
import { getGradeDescription, getGradeColor, calculateCumulativeScore } from "@/lib/scoring/index";
import type { IterativeFeedbackResult } from "@/lib/scoring/ai/iterative";
import { useUser } from "@clerk/nextjs";
import { IconLinkedIn, IconX } from "@/app/components/icons";

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

const formatScore = (value: number): string => Math.round(value).toString();

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
            message:
              result.ui.nextPrompt ??
              result.nextQuestion?.question ??
              "Address the remaining topic to continue.",
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
  const { isSignedIn } = useUser();
  const lastResult = state.run.lastResult;
  const scores = state.scores;
  const score = lastResult?.scoreBreakdown;
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");

  // Check if user is authenticated
  const isAuthenticated = state.auth.isAuthed || isSignedIn;

  const cumulativeScore: CumulativeScore | null = useMemo(() => {
    if (!scores?.functional || !scores?.nonFunctional || !scores?.api) {
      return null;
    }

    const designScore = scores.design ?? createEmptyResult(35);

    return calculateCumulativeScore(
      scores.functional,
      scores.nonFunctional,
      scores.api,
      designScore
    );
  }, [scores]);

  const getStepResult = useCallback(
    (
      key: "functional" | "nonFunctional" | "api" | "design",
      fallbackMax: number
    ): FeedbackResult => {
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
    () =>
      [
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
          result: getStepResult("api", 25),
          maxFallback: 25,
        },
        {
          id: "design",
          label: "High-Level Design",
          barClass: "bg-purple-500",
          result: getStepResult("design", 35),
          maxFallback: 35,
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

  const handleSocialShare = async (platform: "linkedin" | "x", url: string) => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus("copied");
      track("practice_shared", {
        slug: state.slug,
        score: score?.totalScore ?? 0,
        destination: platform,
      });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      logger.error("Share failed", error);
      setShareStatus("error");
    }
  };

  const linkedinHref = shareUrl
    ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    : "https://www.linkedin.com/shareArticle";

  const twitterHref = shareUrl
    ? `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Check out my system design!")}`
    : "https://twitter.com/intent/tweet";

  const hints = score?.hints ?? [];

  // Show authentication required message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="space-y-6 pb-40 sm:pb-8 px-4 lg:pl-20 lg:pr-4">
        <section className="space-y-6 rounded-3xl border border-blue-800 bg-blue-900/20 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl">
          <div className="text-center space-y-4">
            <div className="text-6xl">🔒</div>
            <h3 className="text-xl font-semibold text-blue-200">Authentication Required</h3>
            <p className="text-sm text-blue-100">
              You need to sign in to view your final score and share your design. Your progress is
              saved and will be available after authentication.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => setStep("sandbox")}
                className="inline-flex h-10 items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/10 px-4 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Back to Sandbox
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!cumulativeScore) {
    return (
      <div className="space-y-6 pb-40 sm:pb-8 px-4 lg:pl-20 lg:pr-4 pt-[20px] sm:pt-0">
        {!cumulativeScore ? (
          <section className="space-y-6 rounded-3xl border border-amber-800 bg-amber-900/20 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl">
            <div className="text-center space-y-4">
              <div className="text-6xl">⚠️</div>
              <h3 className="text-xl font-semibold text-amber-200">Incomplete Practice Session</h3>
              <p className="text-sm text-amber-100">
                You need to complete all steps (Functional Requirements, Non-Functional
                Requirements, API Definition, and Design with Simulation) to see your final score.
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
                <div
                  className={`inline-block text-6xl sm:text-8xl font-bold text-${getGradeColor(cumulativeScore.grade)}-400`}
                >
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
                    step.maxPoints === 0
                      ? 0
                      : Math.min(100, (step.result.score / step.maxPoints) * 100);
                  return (
                    <div
                      key={step.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-zinc-700 bg-zinc-900/60 p-3"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium text-zinc-200 truncate">
                          {step.label}
                        </span>
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
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-40 sm:pb-8 px-4 lg:pl-20 lg:pr-4 pt-[20px] sm:pt-0">
      {cumulativeScore && (
        <>
          <section className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl">
            <div className="text-center space-y-4">
              <div>
                <div
                  className={`inline-block text-6xl sm:text-8xl font-bold text-${getGradeColor(cumulativeScore.grade)}-400`}
                >
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
                    step.maxPoints === 0
                      ? 0
                      : Math.min(100, (step.result.score / step.maxPoints) * 100);
                  return (
                    <div
                      key={step.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-zinc-700 bg-zinc-900/60 p-3"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium text-zinc-200 truncate">
                          {step.label}
                        </span>
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
          <section className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {/* <button
             type="button"
             onClick={() => setStep("sandbox")}
             className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 px-5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
           >
             Improve design
           </button> */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400">Share on</span>
                <button
                  type="button"
                  onClick={() => handleSocialShare("linkedin", linkedinHref)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/10 text-blue-100 transition hover:bg-blue-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  aria-label="Share on LinkedIn"
                >
                  <IconLinkedIn size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialShare("x", twitterHref)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-400/40 bg-zinc-500/10 text-zinc-100 transition hover:bg-zinc-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                  aria-label="Share on X"
                >
                  <IconX size={20} />
                </button>
              </div>
              <span className="text-sm text-zinc-400">Or</span>
              <button
                type="button"
                onClick={handleShare}
                className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  shareStatus === "copied"
                    ? "border border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                    : "border border-blue-400/40 bg-blue-500/15 text-blue-100 hover:bg-blue-500/25"
                }`}
              >
                {shareStatus === "copied"
                  ? "Link copied"
                  : shareStatus === "error"
                    ? "Copy failed"
                    : "Copy link"}
              </button>
            </div>

            {hints.length ? (
              <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-200">
                  Suggestions
                </h4>
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
          </section>
        </>
      )}
    </div>
  );
}

export default ScoreShareStep;
