"use client";

import type { FeedbackResult } from "@/lib/scoring/types";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
  const roundedScore = Math.round(feedbackResult.score);
  const hasBonus = Boolean(
    feedbackResult.bonus && feedbackResult.bonus.score > 0 && feedbackResult.bonus.maxScore > 0
  );
  const totalScore =
    feedbackResult.totalScore ?? feedbackResult.score + (feedbackResult.bonus?.score ?? 0);
  const totalMaxScore =
    feedbackResult.totalMaxScore ?? feedbackResult.maxScore + (feedbackResult.bonus?.maxScore ?? 0);
  const roundedTotal = Math.round(totalScore);
  const displayedPercentage =
    feedbackResult.maxScore > 0
      ? Math.round((feedbackResult.score / feedbackResult.maxScore) * 100)
      : Math.round(feedbackResult.percentage);
  const bonusSummary = hasBonus
    ? ` • +${Math.round(feedbackResult.bonus!.score)} bonus (Total ${roundedTotal}/${totalMaxScore})`
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
      <DialogContent
        hideClose
        className="max-w-xl rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-4 sm:mb-6 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Score - Hero element when 100% */}
            <p
              className={`mb-2 font-bold ${
                isPerfect
                  ? "text-3xl sm:text-4xl text-emerald-400"
                  : "text-2xl sm:text-3xl text-foreground"
              }`}
            >
              Score: {roundedScore}/{feedbackResult.maxScore} ({displayedPercentage}%){bonusSummary}
            </p>
            {/* Title with icon - Secondary */}
            <div className="flex items-center gap-2">
              {passed ? (
                <CircleCheck className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-emerald-500" />
              ) : (
                <CircleAlert className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-amber-500" />
              )}
              <DialogTitle className="text-base sm:text-lg font-medium text-muted-foreground">
                {getTitle()}
              </DialogTitle>
            </div>
          </div>
          <button
            type="button"
            onClick={onRevise}
            className="flex-shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
        <div className="mt-6 sm:mt-8 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
          {/* Only show Revise button if there's still something to improve */}
          {(improvementQuestion || !isPerfect) && (
            <button
              type="button"
              onClick={onRevise}
              className="rounded-lg border border-white bg-transparent px-4 sm:px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/10"
            >
              Revise Answer
            </button>
          )}
          {passed && onContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="rounded-lg bg-primary px-4 sm:px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Continue
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
