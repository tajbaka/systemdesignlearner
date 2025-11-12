import type { IterativeFeedbackResult } from "@/lib/scoring/ai/iterative";
import type { PracticeStep } from "@/lib/practice/types";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type IterativeFeedbackModalProps = {
  isOpen: boolean;
  currentStep: PracticeStep;
  result: IterativeFeedbackResult;
  onClose: () => void;
  onContinue?: () => void;
  durationMs?: number | null;
};

export function IterativeFeedbackModal({
  isOpen,
  currentStep: _currentStep,
  result,
  onClose,
  onContinue,
  durationMs,
}: IterativeFeedbackModalProps) {
  // Early return if no result
  if (!result) return null;

  const allTopicsCovered = result.coverage.allCovered;
  const blocking = result.ui.blocking;
  const nextPrompt = result.ui.nextPrompt;

  // Get title based on score
  const getTitle = () => {
    if (allTopicsCovered) return "Perfect Score!";
    if (blocking) return "Let's Improve Your Answer";
    return "Great Progress!";
  };

  const displayedPercentage =
    result.score.max > 0
      ? Math.round((result.score.obtained / result.score.max) * 100)
      : result.score.percentage;

  // Format score display
  const scoreDisplay = durationMs !== undefined && durationMs !== null
    ? `Score: ${result.score.obtained}/${result.score.max} (${displayedPercentage}%) • ${(durationMs / 1000).toFixed(2)}s`
    : `Score: ${result.score.obtained}/${result.score.max} (${displayedPercentage}%)`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent hideClose className="max-w-xl rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-2xl">
        <DialogDescription className="sr-only">
          Feedback on your answer with score and suggestions for improvement
        </DialogDescription>
        {/* Header */}
        <div className="mb-4 sm:mb-6 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="mb-2 flex items-center gap-2 sm:gap-3">
              {allTopicsCovered ? (
                <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 text-emerald-500" />
              ) : blocking ? (
                <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 text-emerald-500" />
              )}
              <DialogTitle className="text-lg sm:text-xl font-semibold text-foreground">
                {getTitle()}
              </DialogTitle>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {scoreDisplay}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Positive feedback */}
          {result.ui.coveredLines.length > 0 && (
            <div className="text-sm text-emerald-100">
              <ul className="list-inside list-disc space-y-1">
                {result.ui.coveredLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary message */}
          {allTopicsCovered && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5">
              <p className="text-base text-emerald-200">
                Excellent! All core requirements covered. You can continue.
              </p>
            </div>
          )}

          {/* Improvement question */}
          {nextPrompt && (
            <div className={allTopicsCovered ? "mt-4 rounded-xl border border-blue-400/30 bg-blue-950/40 p-4" : "rounded-xl border border-blue-400/30 bg-blue-950/40 p-4"}>
              <h3 className="mb-2 text-sm font-semibold text-blue-300">
                {blocking ? "Missing requirement:" : allTopicsCovered ? "💡 Bonus feature:" : "💡 To reach 100%:"}
              </h3>
              <p className="text-sm text-blue-100">{nextPrompt}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-6 sm:mt-8 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white bg-transparent px-4 sm:px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/10"
          >
            Revise Answer
          </button>
          {(allTopicsCovered || !blocking) && onContinue && (
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
