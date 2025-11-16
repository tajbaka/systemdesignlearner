import type { IterativeFeedbackResult } from "@/lib/scoring/ai/iterative";
import type { PracticeStep } from "@/lib/practice/types";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
  durationMs: _durationMs,
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
  const scoreDisplay = `Score: ${Math.round(result.score.obtained)}/${result.score.max} (${displayedPercentage}%)`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideClose
        className="max-w-xl rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-2xl"
      >
        <DialogDescription className="sr-only">
          Feedback on your answer with score and suggestions for improvement
        </DialogDescription>
        {/* Header */}
        <div className="mb-4 sm:mb-6 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Score - Hero element when 100% */}
            <p
              className={`mb-2 font-bold ${
                allTopicsCovered
                  ? "text-3xl sm:text-4xl text-emerald-400"
                  : "text-2xl sm:text-3xl text-foreground"
              }`}
            >
              {scoreDisplay}
            </p>
            {/* Title with icon - Secondary */}
            <div className="flex items-center gap-2">
              {allTopicsCovered ? (
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-emerald-500" />
              ) : blocking ? (
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-emerald-500" />
              )}
              <DialogTitle className="text-base sm:text-lg font-medium text-muted-foreground">
                {getTitle()}
              </DialogTitle>
            </div>
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

          {/* Improvement question */}
          {nextPrompt && (
            <div
              className={
                blocking
                  ? "rounded-xl border border-amber-400/30 bg-amber-950/40 p-4"
                  : allTopicsCovered
                    ? "mt-4 rounded-xl border border-blue-400/30 bg-blue-950/40 p-4"
                    : "rounded-xl border border-blue-400/30 bg-blue-950/40 p-4"
              }
            >
              <h3
                className={`mb-2 text-sm font-semibold ${blocking ? "text-amber-300" : "text-blue-300"}`}
              >
                {blocking
                  ? "Missing requirement:"
                  : allTopicsCovered
                    ? "💡 Bonus feature:"
                    : "💡 To reach 100%:"}
              </h3>
              <p className={`text-sm ${blocking ? "text-amber-100" : "text-blue-100"}`}>
                {nextPrompt}
              </p>
            </div>
          )}

          {/* Example hint after 3 attempts */}
          {result.ui.exampleHint && (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-950/40 p-4">
              <h3 className="mb-2 text-sm font-semibold text-emerald-300">
                💡 Hint: Here&apos;s an example
              </h3>
              <div className="text-sm text-emerald-100 whitespace-pre-line font-mono">
                {result.ui.exampleHint}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-6 sm:mt-8 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
          {/* Only show Revise button if there's still something to improve */}
          {(nextPrompt || !allTopicsCovered) && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white bg-transparent px-4 sm:px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/10"
            >
              Revise Answer
            </button>
          )}
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
