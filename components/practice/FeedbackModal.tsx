"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import type { FeedbackResult } from "@/lib/scoring/types";

type FeedbackModalProps = {
  isOpen: boolean;
  feedbackResult: FeedbackResult;
  onRevise: () => void;
  onContinue?: () => void;
  improvementQuestion?: string; // Question to help reach 100%
};

export function FeedbackModal({
  isOpen,
  feedbackResult,
  onRevise,
  onContinue,
  improvementQuestion,
}: FeedbackModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const passed = feedbackResult.percentage >= 40;

  // Extract positive messages (limit to 3)
  const positiveMessages = feedbackResult.positive.slice(0, 3);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onRevise}
    >
      <div
        className={`relative w-full max-w-lg animate-scale-in rounded-3xl border p-6 shadow-2xl ${
          passed
            ? "border-emerald-400/40 bg-emerald-950/90"
            : "border-amber-400/40 bg-amber-950/90"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with icon */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex-shrink-0">
            {passed ? (
              <svg className="h-8 w-8 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="h-8 w-8 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          <div>
            <h2 className={`text-xl font-bold ${passed ? "text-emerald-100" : "text-amber-100"}`}>
              {passed ? "Good progress!" : "Almost there!"}
            </h2>
            <p className="text-sm text-zinc-400">
              Score: {Math.round(feedbackResult.score * 100) / 100}/{feedbackResult.maxScore} ({Math.round(feedbackResult.percentage)}%)
            </p>
          </div>
        </div>

        {/* Positive feedback */}
        {positiveMessages.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-semibold text-emerald-300">✓ What&apos;s working well:</h3>
            <ul className="space-y-1.5">
              {positiveMessages.map((msg, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-emerald-200">
                  <span className="mt-0.5 flex-shrink-0">•</span>
                  <span>{msg.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvement question for scores between 40-99% */}
        {passed && improvementQuestion && feedbackResult.percentage < 100 && (
          <div className="mb-6 rounded-xl border border-blue-400/30 bg-blue-950/40 p-4">
            <h3 className="mb-2 text-sm font-semibold text-blue-300">
              💡 To reach 100%:
            </h3>
            <p className="text-sm text-blue-100">{improvementQuestion}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onRevise}
            className={`inline-flex h-10 items-center justify-center rounded-full px-6 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 ${
              passed
                ? "bg-white/10 text-white hover:bg-white/20 focus-visible:ring-white/50"
                : "bg-amber-500/20 text-amber-100 hover:bg-amber-500/30 focus-visible:ring-amber-400"
            }`}
          >
            Revise
          </button>
          {passed && onContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 text-sm font-semibold text-white transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              Continue
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
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
