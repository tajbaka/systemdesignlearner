"use client";

import { useEffect, useMemo, useState } from "react";
import { encodeDesign as encodeShare } from "@/lib/shareLink";
import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import { track } from "@/lib/analytics";

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
      console.error("Share failed", error);
      setShareStatus("error");
    }
  };

  const linkedinHref = shareUrl
    ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    : "https://www.linkedin.com/shareArticle";

  const hints = score?.hints ?? [];

  const badgeClass = outcome === "pass"
    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
    : outcome === "partial"
      ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
      : "border-zinc-700 bg-zinc-900 text-zinc-200";

  const summaryCopy = outcome === "pass"
    ? "Redirect path meets the targets you set — nice work!"
    : outcome === "partial"
      ? "Close! Address the notes below, then re-run to bump your score."
      : "Keep iterating. Use the hints and rerun the simulation.";

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
              Step 6 · Finish
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white sm:text-2xl">
                URL Shortener
              </h2>
              <p className="mt-1 text-sm text-zinc-300">
                Review your run, polish the architecture, and share a badge when you&apos;re ready.
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide ${badgeClass}`}>
            {outcome ?? "pending"}
            {score ? <>· {score.totalScore}/100</> : null}
          </span>
        </div>
      </section>

      <section className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6">
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-white">
            Summary
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
              {hints.map((hint) => (
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
