"use client";

import type { FeedbackResult } from "@/lib/scoring/types";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { CircleCheck, CircleAlert, X } from "lucide-react";

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
  // Early return if no feedback result
  if (!feedbackResult) return null;

  const passed = feedbackResult.percentage >= 40;
  const isPerfect = feedbackResult.percentage === 100;
  const roundedScore = Math.round(feedbackResult.score * 100) / 100;
  const hasBonus = Boolean(feedbackResult.bonus && feedbackResult.bonus.score > 0 && feedbackResult.bonus.maxScore > 0);
  const totalScore = feedbackResult.totalScore ?? (feedbackResult.score + (feedbackResult.bonus?.score ?? 0));
  const totalMaxScore = feedbackResult.totalMaxScore ?? (feedbackResult.maxScore + (feedbackResult.bonus?.maxScore ?? 0));
  const roundedTotal = Math.round(totalScore * 100) / 100;
  const bonusSummary = hasBonus
    ? ` • +${Math.round((feedbackResult.bonus!.score) * 100) / 100} bonus (Total ${roundedTotal}/${totalMaxScore})`
    : "";

  // Extract positive messages (limit to 3)
  const positiveMessages = feedbackResult.positive.slice(0, 3);

  // Get title based on score
  const getTitle = () => {
    if (isPerfect) return "Perfect Score!";
    if (passed) return "Good progress!";
    return "Almost there!";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onRevise()}>
      <DialogContent hideClose className="mx-4 w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-3">
              {passed ? (
                <CircleCheck className="h-6 w-6 text-emerald-500" />
              ) : (
                <CircleAlert className="h-6 w-6 text-amber-500" />
              )}
              <DialogTitle className="text-xl font-semibold text-foreground">
                {getTitle()}
              </DialogTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Score: {roundedScore}/{feedbackResult.maxScore} ({Math.round(feedbackResult.percentage)}%){bonusSummary}
            </p>
          </div>
          <button
            type="button"
            onClick={onRevise}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Positive feedback */}
          {positiveMessages.length > 0 && (
            <div className="text-sm text-emerald-100">
              <ul className="list-inside list-disc space-y-1">
                {positiveMessages.map((msg, index) => (
                  <li key={index}>✓ {msg.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary message */}
          {passed && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5">
              <p className="text-base text-emerald-200">
                {isPerfect
                  ? "Excellent! All core requirements covered. You can continue."
                  : "Good work! You've met the minimum requirements. You can continue or revise to improve your score."}
              </p>
            </div>
          )}

          {/* Improvement question */}
          {improvementQuestion && (
            <div className="rounded-xl border border-blue-400/30 bg-blue-950/40 p-4">
              <h3 className="mb-2 text-sm font-semibold text-blue-300">
                💡 {isPerfect ? "Bonus opportunity:" : passed ? "Bonus feature:" : "To reach 100%:"}
              </h3>
              <p className="text-sm text-blue-100">{improvementQuestion}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onRevise}
            className="rounded-lg border border-border bg-background px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Revise Answer
          </button>
          {passed && onContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Continue
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
