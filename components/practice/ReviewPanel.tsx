"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { encodeDesign } from "@/lib/practice/encoder";
import { toMarkdown } from "@/lib/practice/brief";
import { encodeDesign as encodeShare } from "@/lib/shareLink";
import { scorePractice } from "@/lib/practice/scoring";
import { track } from "@/lib/analytics";
import type { PracticeState } from "@/lib/practice/types";

type ReviewPanelProps = {
  state: PracticeState;
  sandboxAvailable?: boolean;
  onExport?: () => void;
  onOpenSandbox?: () => void;
  readOnly?: boolean;
};

export const ReviewPanel = ({ state, sandboxAvailable = false, onExport, onOpenSandbox, readOnly = false }: ReviewPanelProps) => {
  const router = useRouter();
  const markdown = useMemo(() => toMarkdown(state), [state]);
  const score = useMemo(() => {
    const calculatedScore = scorePractice(state);
    track("practice_score_viewed", {
      slug: state.slug,
      score: calculatedScore.totalScore,
      outcome: calculatedScore.outcome,
      hints_count: calculatedScore.hints.length
    });
    return calculatedScore;
  }, [state]);
  const canDeepLink = sandboxAvailable && state.high;

  const handleExport = () => {
    if (readOnly) return;
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${state.slug}-design.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onExport?.();
  };

  const handleOpenSandbox = () => {
    if (readOnly || !canDeepLink || !state.high) {
      return;
    }
    const deepLink = `/play#d=${encodeDesign(state.high)}`;
    onOpenSandbox?.();
    router.push(deepLink);
  };

  const handleShare = () => {
    if (readOnly) return;
    const shareUrl = `${window.location.origin}/practice/${state.slug}?s=${encodeShare(state)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      track("practice_shared", { slug: state.slug, score: score.totalScore });
      console.log("Share link copied to clipboard");
    }).catch((err) => {
      console.error("Failed to copy share link", err);
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm border-zinc-700 bg-zinc-900">
        <header className="mb-4 flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-white">Design brief</h2>
          <p className="text-sm text-zinc-400">
            Review the generated Markdown. Export it for your notes or validate it in the sandbox.
          </p>
        </header>

        {/* Score Display */}
        <div className="mb-4 rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Design Score</h3>
            <div className={`rounded-full px-3 py-1 text-xs font-semibold ${
              score.outcome === 'pass' ? 'bg-emerald-900/60 text-emerald-200' :
              score.outcome === 'partial' ? 'bg-amber-900/60 text-amber-200' :
              'bg-red-900/60 text-red-200'
            }`}>
              {score.outcome === 'pass' ? 'Pass' : score.outcome === 'partial' ? 'Partial' : 'Fail'} ({score.totalScore}/100)
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-zinc-400">SLO Alignment</div>
              <div className="font-semibold text-white">{score.sloScore}/60</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400">Requirements</div>
              <div className="font-semibold text-white">{score.checklistScore}/30</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400">Efficiency</div>
              <div className="font-semibold text-white">{score.costScore}/10</div>
            </div>
          </div>

          {score.hints.length > 0 && (
            <div className="mt-3 pt-3 border-t border-zinc-700">
              <div className="text-xs font-semibold text-zinc-300 mb-2">Improvement Hints:</div>
              <ul className="text-xs text-zinc-400 space-y-1">
                {score.hints.map((hint, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-zinc-500 mt-0.5">•</span>
                    <span>{hint}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <pre className="max-h-[60vh] overflow-y-auto rounded-lg bg-zinc-900 p-4 text-sm leading-relaxed text-zinc-100">
          {markdown}
        </pre>
      </section>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handleShare}
          disabled={readOnly}
          className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-700 px-6 text-sm font-semibold text-zinc-100 transition hover:border-blue-400 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Share Link
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={readOnly}
          className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-700 px-6 text-sm font-semibold text-zinc-100 transition hover:border-blue-400 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Export .md
        </button>
        <button
          type="button"
          onClick={handleOpenSandbox}
          disabled={!canDeepLink || readOnly}
          className="inline-flex h-12 items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white shadow transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          Validate in Sandbox
        </button>
      </div>
    </div>
  );
};

export default ReviewPanel;
