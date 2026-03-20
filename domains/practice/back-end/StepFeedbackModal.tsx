import { SolutionRevealBox } from "./components/SolutionRevealBox";
import { SolutionAnswerBox } from "./components/SolutionAnswerBox";
import { ItemsBox } from "./components/ItemsBox";
import { LinkBox } from "./components/LinkBox";
import { useSolutionReveal } from "./hooks/useSolutionReveal";
import { useFeedbackModal } from "./hooks/useFeedbackModal";
import type { ProblemConfig, StepHandlers } from "./types";

type StepFeedbackModalProps = {
  slug: string;
  stepType: string | null;
  config: ProblemConfig;
  handlers: StepHandlers;
  onInsertComplete?: () => void;
};

export function StepFeedbackModal({
  slug,
  stepType,
  config,
  handlers,
  onInsertComplete,
}: StepFeedbackModalProps) {
  const { completedItems, hint, feedback } = useFeedbackModal(stepType, config, handlers, slug);

  const { isRevealed, shouldShow, solutionText, handleReveal, handleInsert } = useSolutionReveal({
    slug,
    stepType,
    config,
    onInsertComplete,
  });

  return (
    <>
      <ItemsBox
        items={completedItems}
        variant="completed"
        title="Well done! You've completed the following requirements:"
      />

      {/* Show hints or feedback until solution is revealed */}
      {!isRevealed && hint && (
        <ItemsBox items={[hint]} variant="missing" title="Missing Requirements" />
      )}

      {/* Show general feedback when no hint is available */}
      {!isRevealed && !hint && feedback && (
        <ItemsBox items={[feedback]} variant="missing" title="Missing Requirements" />
      )}

      {shouldShow &&
        solutionText &&
        (!isRevealed ? (
          <SolutionRevealBox
            leftText="Want to see the full solution?"
            buttonText="Click to reveal"
            onClick={handleReveal}
          />
        ) : (
          <SolutionAnswerBox
            leftText="Answer to this section:"
            buttonText="Insert"
            description={solutionText}
            onClick={handleInsert}
          />
        ))}

      {/* Show "learn more" link until solution is revealed */}
      {/* {!isRevealed && hint?.href && hint?.title && (
        <div className="mt-4">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            learn more:
          </p>
          <div className="flex flex-wrap gap-2">
            <LinkBox
              title={hint.title}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(hint.href, "_blank", "noopener,noreferrer");
              }}
            />
          </div>
        </div>
      )} */}
    </>
  );
}
