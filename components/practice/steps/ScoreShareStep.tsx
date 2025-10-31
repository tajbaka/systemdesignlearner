"use client";

import { useEffect, useMemo, useState } from "react";
import { encodeDesign as encodeShare } from "@/lib/shareLink";
import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import { track } from "@/lib/analytics";
import { logger } from "@/lib/logger";
import type { CumulativeScore, FeedbackResult } from "@/lib/scoring/types";
import { getGradeDescription, getGradeColor, calculateCumulativeScore } from "@/lib/scoring/index";

type ShareStatus = "idle" | "copied" | "error";

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
  const score = lastResult?.scoreBreakdown;
  const outcome = score?.outcome ?? (lastResult?.failedByChaos ? "chaos_fail" : undefined);
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");

  // Calculate cumulative score from all practice steps
  const cumulativeScore: CumulativeScore | null = useMemo(() => {
    const scores = state.scores;

    // Check if we have all required scores
    const hasAllScores = scores?.functional && scores?.nonFunctional && scores?.api;

    // Get simulation score from run result if available
    const simulationScore: FeedbackResult = {
      score: 0,
      maxScore: 5,
      percentage: 0,
      blocking: [],
      warnings: [],
      positive: [],
      suggestions: [],
    };

    if (lastResult && lastResult.scoreBreakdown?.outcome === "pass") {
      simulationScore.score = 5;
      simulationScore.percentage = 100;
      simulationScore.positive.push({
        category: "performance",
        severity: "positive",
        message: "✓ Simulation passed with meeting requirements",
      });
    } else if (lastResult) {
      // Partial credit for attempting simulation
      simulationScore.score = 0;
    }

    if (!hasAllScores || !scores.functional || !scores.nonFunctional || !scores.api) {
      // Don't show score until all steps are completed
      return null;
    }

    // Use the real calculation with all scores
    const designScore: FeedbackResult = scores.design || {
      score: 0,
      maxScore: 30,
      percentage: 0,
      blocking: [],
      warnings: [],
      positive: [],
      suggestions: [],
    };

    return calculateCumulativeScore(
      scores.functional,
      scores.nonFunctional,
      scores.api,
      designScore,
      simulationScore
    );
  }, [state.scores, lastResult]);

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
              <div className={`inline-block text-8xl font-bold text-${getGradeColor(cumulativeScore.grade)}-400`}>
                {cumulativeScore.grade}
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {cumulativeScore.total}/100
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
              <div className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-900/60 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">
                    1
                  </div>
                  <span className="text-sm font-medium text-zinc-200">Functional Requirements</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${(cumulativeScore.breakdown.functional / 20) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-white w-16 text-right">
                    {cumulativeScore.breakdown.functional}/20
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-900/60 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">
                    2
                  </div>
                  <span className="text-sm font-medium text-zinc-200">Non-Functional Requirements</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${(cumulativeScore.breakdown.nonFunctional / 20) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-white w-16 text-right">
                    {cumulativeScore.breakdown.nonFunctional}/20
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-900/60 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">
                    3
                  </div>
                  <span className="text-sm font-medium text-zinc-200">API Definition</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full bg-cyan-500"
                      style={{ width: `${(cumulativeScore.breakdown.api / 20) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-white w-16 text-right">
                    {cumulativeScore.breakdown.api}/20
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-900/60 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">
                    4
                  </div>
                  <span className="text-sm font-medium text-zinc-200">High-Level Design</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full bg-purple-500"
                      style={{ width: `${(cumulativeScore.breakdown.design / 30) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-white w-16 text-right">
                    {cumulativeScore.breakdown.design}/30
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Improvement Suggestions */}
          {cumulativeScore.feedback.improvements.length > 0 && (
            <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-amber-200">
                Areas for Improvement
              </h4>
              <ul className="mt-3 space-y-2">
                {cumulativeScore.feedback.improvements.slice(0, 5).map((improvement: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-amber-100">
                    <span aria-hidden className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-300" />
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl">
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-white">
            Simulation Results
          </h3>
          <p className="text-sm text-zinc-300 leading-relaxed">
            {summaryCopy}
          </p>
          {score ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-blue-400/30 bg-blue-500/10 p-4 text-sm text-blue-50">
                <span className="block text-xs uppercase tracking-wide text-blue-200">SLO score</span>
                <span className="text-2xl font-semibold text-white">{score.sloScore}</span>
              </div>
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-50">
                <span className="block text-xs uppercase tracking-wide text-emerald-200">Checklist</span>
                <span className="text-2xl font-semibold text-white">{score.checklistScore}</span>
              </div>
              <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-50">
                <span className="block text-xs uppercase tracking-wide text-amber-200">Efficiency</span>
                <span className="text-2xl font-semibold text-white">{score.costScore}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-700 bg-zinc-900/80 p-4 text-sm text-zinc-300">
              Run the simulation from the sandbox to generate a score.
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
            {shareStatus === "copied" ? "Link copied" : shareStatus === "error" ? "Copy failed" : "Share badge"}
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

        <p className="text-sm text-zinc-400">
          Continue practice tomorrow for new systems and tougher latency targets.
        </p>
      </section>
    </div>
  );
}

export default ScoreShareStep;
