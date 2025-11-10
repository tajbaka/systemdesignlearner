import type { IterativeFeedbackResult } from "@/lib/scoring/ai/iterative";
import type { PracticeStep } from "@/lib/practice/types";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

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
  if (!isOpen) return null;

  const allTopicsCovered = result.coverage.allCovered;
  const blocking = result.ui.blocking;
  const nextPrompt = result.ui.nextPrompt;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-3">
              {allTopicsCovered ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              ) : blocking ? (
                <AlertCircle className="h-6 w-6 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              )}
              <h2 className="text-xl font-semibold text-foreground">
                {allTopicsCovered ? "Perfect Score!" : blocking ? "Let's Improve Your Answer" : "Great Progress!"}
              </h2>
            </div>
            {!allTopicsCovered && (
              <p className="text-sm text-muted-foreground">
                Score: {result.score.obtained}/{result.score.max} ({result.score.percentage}%)
                {durationMs !== undefined && durationMs !== null ? ` • ${ (durationMs / 1000).toFixed(2) }s` : null}
              </p>
            )}
            {allTopicsCovered && (
              <p className="text-sm text-muted-foreground">
                Score: {result.score.obtained}/{result.score.max} (100%)
                {durationMs !== undefined && durationMs !== null ? ` • ${ (durationMs / 1000).toFixed(2) }s` : null}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {result.ui.coveredLines.length > 0 && (
            <div className="text-sm text-emerald-100">
              <ul className="list-disc list-inside space-y-1">
                {result.ui.coveredLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          {!allTopicsCovered && nextPrompt && (
            <div className="rounded-xl border border-blue-400/30 bg-blue-950/40 p-4">
              <h3 className="mb-2 text-sm font-semibold text-blue-300">
                {blocking ? "Missing requirement:" : "💡 To reach 100%:"}
              </h3>
              <p className="text-sm text-blue-100">{nextPrompt}</p>
            </div>
          )}

          {allTopicsCovered && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5">
              <p className="text-base text-emerald-200">
                Excellent! All core requirements covered. You can continue.
              </p>
            </div>
          )}

          {allTopicsCovered && nextPrompt && (
            <div className="mt-4 rounded-xl border border-blue-400/30 bg-blue-950/40 p-4">
              <h3 className="mb-2 text-sm font-semibold text-blue-300">
                💡 Bonus feature:
              </h3>
              <p className="text-sm text-blue-100">{nextPrompt}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-background px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Revise Answer
          </button>
          {allTopicsCovered && onContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Continue
            </button>
          )}
          {!allTopicsCovered && !blocking && onContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
