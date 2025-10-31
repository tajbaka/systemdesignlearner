"use client";

import type { FeedbackResult } from "@/lib/scoring/types";

type VerificationFeedbackProps = {
  blocking?: string[];
  warnings?: string[];
  onRevise?: () => void;
  onContinue?: () => void;
  // New scoring props
  feedbackResult?: FeedbackResult;
  showScore?: boolean;
  className?: string;
};

export function VerificationFeedback({
  blocking = [],
  warnings = [],
  onRevise,
  onContinue,
  feedbackResult,
  showScore = true,
  className = "",
}: VerificationFeedbackProps) {
  // Use feedbackResult if provided, otherwise use legacy props
  const blockingMessages = feedbackResult ? feedbackResult.blocking.map((f) => f.message) : blocking;
  const warningMessages = feedbackResult ? feedbackResult.warnings.map((f) => f.message) : warnings;
  const positiveMessages = feedbackResult?.positive.map((f) => f.message) || [];
  const suggestionMessages = feedbackResult?.suggestions.map((f) => f.message) || [];

  const hasBlocking = blockingMessages.length > 0;
  const hasWarnings = warningMessages.length > 0;
  const hasPositive = positiveMessages.length > 0;
  const hasSuggestions = suggestionMessages.length > 0;

  // Show feedback if there's anything to show
  const showFeedback = hasBlocking || hasWarnings || hasPositive || hasSuggestions;

  if (!showFeedback) {
    return null;
  }

  return (
    <div className={`animate-slide-down overflow-hidden ${className}`}>
      <div
        className={`rounded-2xl border p-4 ${
          hasBlocking
            ? "border-rose-400/40 bg-rose-500/10"
            : hasWarnings
              ? "border-amber-400/40 bg-amber-500/10"
              : "border-emerald-400/40 bg-emerald-500/10"
        }`}
      >
        {/* Score display */}
        {showScore && feedbackResult && (
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
            <div className="text-sm font-semibold text-white">
              Score: {feedbackResult.score}/{feedbackResult.maxScore}
            </div>
            <div
              className={`text-2xl font-bold ${
                feedbackResult.percentage >= 90
                  ? "text-emerald-300"
                  : feedbackResult.percentage >= 75
                    ? "text-blue-300"
                    : feedbackResult.percentage >= 60
                      ? "text-amber-300"
                      : "text-rose-300"
              }`}
            >
              {Math.round(feedbackResult.percentage)}%
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {hasBlocking ? (
              <svg className="h-5 w-5 text-rose-300" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            ) : hasWarnings ? (
              <svg className="h-5 w-5 text-amber-300" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-emerald-300" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <h3
              className={`text-sm font-semibold ${
                hasBlocking
                  ? "text-rose-100"
                  : hasWarnings
                    ? "text-amber-100"
                    : "text-emerald-100"
              }`}
            >
              {hasBlocking
                ? "❌ Required improvements"
                : hasWarnings
                  ? "⚠️ Suggestions for improvement"
                  : "✓ Great work!"}
            </h3>

            {/* Positive feedback */}
            {hasPositive && (
              <ul className="space-y-1 text-sm text-emerald-200">
                {positiveMessages.slice(0, 3).map((item, index) => (
                  <li key={`positive-${index}`} className="flex items-start gap-2">
                    <span className="flex-shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Blocking and warning feedback */}
            {(hasBlocking || hasWarnings) && (
              <ul
                className={`space-y-1 text-sm ${hasBlocking ? "text-rose-200" : "text-amber-200"}`}
              >
                {blockingMessages.map((item, index) => (
                  <li key={`blocking-${index}`} className="flex items-start gap-2">
                    <span className="flex-shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
                {warningMessages.map((item, index) => (
                  <li key={`warning-${index}`} className="flex items-start gap-2">
                    <span className="flex-shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Suggestions */}
            {hasSuggestions && (
              <ul className="mt-2 space-y-1 text-xs text-zinc-400">
                {suggestionMessages.slice(0, 2).map((item, index) => (
                  <li key={`suggestion-${index}`} className="flex items-start gap-2">
                    <span className="flex-shrink-0">💡</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center gap-3 pt-2">
              {/* Only show Revise if there are warnings or blocking issues */}
              {(hasBlocking || hasWarnings) && (
                <button
                  type="button"
                  onClick={onRevise}
                  className={`inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 ${
                    hasBlocking
                      ? "bg-rose-500/20 text-rose-100 hover:bg-rose-500/30 focus-visible:ring-rose-400"
                      : "bg-amber-500/20 text-amber-100 hover:bg-amber-500/30 focus-visible:ring-amber-400"
                  }`}
                >
                  Revise
                </button>
              )}

              {!hasBlocking && onContinue ? (
                <button
                  type="button"
                  onClick={onContinue}
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 ${
                    hasWarnings
                      ? "bg-white/10 text-white hover:bg-white/20 focus-visible:ring-white/70"
                      : "bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 focus-visible:ring-emerald-400"
                  }`}
                >
                  {hasWarnings ? "Continue Anyway" : "Continue"}
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M4 2l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerificationFeedback;
