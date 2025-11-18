"use client";

import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import { RequirementsTextareaStep } from "./RequirementsTextareaStep";
import { useState } from "react";

export function NonFunctionalRequirementsStep() {
  const { state, setRequirements, setStepScore, updateIterativeFeedback, isReadOnly } =
    usePracticeSession();
  const requirements = state.requirements;
  const nf = requirements.nonFunctional;
  const [showHint, setShowHint] = useState(true);
  const [touched, setTouched] = useState(false);

  const trimmedLength = nf.notes.trim().length;
  const isEmpty = trimmedLength === 0;
  const isTooShort = trimmedLength > 0 && trimmedLength < 50;
  const hasError = isEmpty || isTooShort;
  const hasMinContent = trimmedLength >= 15;
  const shouldShowError = hasError && touched;

  const handleSummaryChange = (summary: string) => {
    setRequirements({
      ...requirements,
      nonFunctional: {
        ...nf,
        notes: summary,
      },
    });
    // Mark as touched when user starts typing
    if (!touched) {
      setTouched(true);
    }
    // Hide hint when user starts typing
    if (summary.length > 0 && showHint) {
      setShowHint(false);
    }
    // Clear the score when user changes their answer
    if (state.scores?.nonFunctional) {
      setStepScore("nonFunctional", undefined);
    }
    // Clear the cached iterative feedback result
    if (state.iterativeFeedback?.nonFunctional?.cachedResult) {
      updateIterativeFeedback("nonFunctional", (prev) => ({
        ...prev,
        cachedResult: null,
      }));
    }
  };

  return (
    <RequirementsTextareaStep
      value={nf.notes}
      onChange={handleSummaryChange}
      onBlur={() => setTouched(true)}
      placeholder="Example: Low latency responses (sub-second). High availability (99.9%+). Scale to handle millions of requests per day and traffic spikes."
      mobilePlaceholder="NON-FUNCTIONAL REQUIREMENTS&#10;Describe performance goals like latency, throughput, and availability"
      title="Define performance and scale constraints"
      description="Think about latency, throughput, availability, and scale."
      // hintText="Tip: Focus on measurable qualities and constraints"
      showHint={showHint}
      stepId="nonFunctional"
      isReadOnly={isReadOnly}
      hasMinContent={hasMinContent}
      trimmedLength={trimmedLength}
      showError={shouldShowError}
    />
  );
}

export default NonFunctionalRequirementsStep;
