import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type FeedbackBox = {
  title: string;
  description: string;
};

type SolutionItem = {
  requirementId: string;
  text: string;
};

type IterativeFeedbackModalProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  scoreDisplay: string;
  completedItems: string[];
  bonusFeature?: FeedbackBox;
  missingRequirement?: FeedbackBox;
  solution?: Array<SolutionItem> | null;
  showReviseButton: boolean;
  showContinueButton: boolean;
  onClose: () => void;
  onContinue?: () => void;
  onRevise?: () => void;
  onInsert?: () => void;
};

export function IterativeFeedbackModal({
  isOpen,
  title,
  description,
  scoreDisplay,
  completedItems,
  bonusFeature,
  missingRequirement,
  solution,
  showReviseButton,
  showContinueButton,
  onClose,
  onContinue,
  onRevise,
  onInsert,
}: IterativeFeedbackModalProps) {
  const [isSolutionRevealed, setIsSolutionRevealed] = useState(false);
  const isPerfectScore = scoreDisplay.includes("100%");
  const hasMissingRequirement = !!missingRequirement;
  const hasSolution = Array.isArray(solution) && solution.length > 0;

  console.log("[IterativeFeedbackModal] hasSolution:", hasSolution, "solution:", solution);

  // Reset reveal state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsSolutionRevealed(false);
    }
  }, [isOpen]);

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
                isPerfectScore
                  ? "text-3xl sm:text-4xl text-emerald-400"
                  : "text-2xl sm:text-3xl text-foreground"
              }`}
            >
              {scoreDisplay}
            </p>
            {/* Title with icon - Secondary */}
            <div className="flex items-center gap-2">
              {isPerfectScore ? (
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-emerald-500" />
              ) : hasMissingRequirement ? (
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-emerald-500" />
              )}
              <DialogTitle className="text-base sm:text-lg font-medium text-muted-foreground">
                {title}
              </DialogTitle>
            </div>
            {/* Description */}
            {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
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
          {/* Completed items */}
          {completedItems.length > 0 && (
            <div className="text-sm text-emerald-100">
              <ul className="space-y-1">
                {completedItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing requirement box */}
          {missingRequirement && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-950/40 p-4">
              <h3 className="mb-2 text-sm font-semibold text-amber-300">
                {missingRequirement.title}
              </h3>
              <p className="text-sm text-amber-100">{missingRequirement.description}</p>
            </div>
          )}

          {/* Bonus feature box */}
          {bonusFeature && (
            <div className="rounded-xl border border-blue-400/30 bg-blue-950/40 p-4">
              <h3 className="mb-2 text-sm font-semibold text-blue-300">{bonusFeature.title}</h3>
              <p className="text-sm text-blue-100">{bonusFeature.description}</p>
            </div>
          )}

          {/* Solution reveal section - shown after 3 failed attempts */}
          {hasSolution && (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-950/40 p-4">
              {!isSolutionRevealed ? (
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm text-emerald-200">Want to see the full solution?</span>
                  <button
                    type="button"
                    onClick={() => setIsSolutionRevealed(true)}
                    className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
                  >
                    Reveal Answer
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-emerald-300">💡 Complete Solution:</h3>
                  <div className="space-y-3">
                    {Array.isArray(solution) &&
                      solution.map((item, index) => (
                        <div key={item.requirementId || index} className="text-sm text-emerald-100">
                          <p className="whitespace-pre-line">{item.text}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-6 sm:mt-8 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
          {showReviseButton && (
            <button
              type="button"
              onClick={onRevise || onClose}
              className="rounded-lg border border-white bg-transparent px-4 sm:px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/10"
            >
              Revise Answer
            </button>
          )}
          {hasSolution && isSolutionRevealed && onInsert && (
            <button
              type="button"
              onClick={onInsert}
              className="rounded-lg bg-emerald-500 px-4 sm:px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
            >
              Insert
            </button>
          )}
          {showContinueButton && onContinue && (
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
