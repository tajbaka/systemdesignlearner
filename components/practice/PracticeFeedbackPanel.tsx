import type { FeedbackResult } from "@/lib/scoring/types";
import type { ProgressStep } from "@/lib/scoring/ai/progress";
import type { PracticeStep } from "@/lib/practice/types";
import VerificationFeedback from "@/components/practice/VerificationFeedback";
import { FeedbackModal } from "@/components/practice/FeedbackModal";
import { EvaluationProgress } from "@/components/practice/EvaluationProgress";
import type { VerificationState } from "@/hooks/usePracticeScoring";

type PracticeFeedbackPanelProps = {
  currentStep: PracticeStep;
  verification: VerificationState;
  scoringProgressSteps: ProgressStep[];
  scoringFeedback: FeedbackResult | null;
  helperText: string | null;
  onRevise: () => void;
  onContinue?: () => void;
  onClearVerification: () => void;
  hasIterativeFeedback?: boolean;
};

export function PracticeFeedbackPanel({
  currentStep,
  verification,
  scoringProgressSteps,
  scoringFeedback,
  helperText: _helperText,
  onRevise,
  onContinue,
  onClearVerification,
  hasIterativeFeedback = false,
}: PracticeFeedbackPanelProps) {
  // Only show helper text if there's no feedback being displayed
  const _hasFeedback =
    verification.error ||
    scoringProgressSteps.length > 0 ||
    scoringFeedback ||
    (verification.result && (verification.result.blocking.length > 0 || verification.result.warnings.length > 0));

  return (
    <>
      {verification.error ? (
        <div className="mx-auto w-full max-w-5xl px-4 pt-4">
          <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4">
            <p className="text-sm text-rose-200">{verification.error}</p>
          </div>
        </div>
      ) : null}

      {scoringProgressSteps.length > 0 && (
        <div className="mx-auto w-full max-w-5xl px-4 pt-4">
          <EvaluationProgress steps={scoringProgressSteps} />
        </div>
      )}

      {/* Only show old FeedbackModal for Sandbox step, not for functional/nonFunctional/api (they use IterativeFeedbackModal) */}
      <FeedbackModal
        isOpen={
          !!scoringFeedback &&
          !hasIterativeFeedback &&
          (currentStep === "sandbox" ||
            (currentStep !== "functional" &&
              currentStep !== "nonFunctional" &&
              currentStep !== "api" &&
              scoringFeedback.percentage >= 40))
        }
        feedbackResult={scoringFeedback!}
        onRevise={onRevise}
        onContinue={onContinue}
        improvementQuestion={(scoringFeedback as FeedbackResult & { improvementQuestion?: string })?.improvementQuestion}
      />

      {verification.result && (verification.result.blocking.length > 0 || verification.result.warnings.length > 0) ? (
        <div className="mx-auto w-full max-w-5xl px-4 pt-4">
          <VerificationFeedback
            blocking={verification.result.blocking}
            warnings={verification.result.warnings}
            onRevise={onClearVerification}
            onContinue={verification.result.canProceed ? onContinue : undefined}
          />
        </div>
      ) : null}
    </>
  );
}
