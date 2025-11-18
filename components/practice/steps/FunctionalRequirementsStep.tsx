"use client";

import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import { RequirementsTextareaStep } from "./RequirementsTextareaStep";
import { useState } from "react";

export function FunctionalRequirementsStep() {
  const { state, setRequirements, setStepScore, updateIterativeFeedback, isReadOnly } =
    usePracticeSession();
  const requirements = state.requirements;
  const [showHint, setShowHint] = useState(true);
  const [touched, setTouched] = useState(false);

  const trimmedLength = requirements.functionalSummary.trim().length;
  const isEmpty = trimmedLength === 0;
  const isTooShort = trimmedLength > 0 && trimmedLength < 50;
  const hasError = isEmpty || isTooShort;
  const hasMinContent = trimmedLength >= 15;
  const shouldShowError = hasError && touched;

  const handleSummaryChange = (summary: string) => {
    setRequirements({
      ...requirements,
      functionalSummary: summary,
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
    if (state.scores?.functional) {
      setStepScore("functional", undefined);
    }
    // Clear the cached iterative feedback result
    if (state.iterativeFeedback?.functional?.cachedResult) {
      updateIterativeFeedback("functional", (prev) => ({
        ...prev,
        cachedResult: null,
      }));
    }
  };

  return (
    <RequirementsTextareaStep
      value={requirements.functionalSummary}
      onChange={handleSummaryChange}
      onBlur={() => setTouched(true)}
      placeholder="Example: Users create and manage content, search across the platform, and receive real-time notifications about relevant activity."
      mobilePlaceholder="FUNCTIONAL REQUIREMENTS&#10;List key features: user actions, core workflows, and business capabilities"
      title="Define key features and user actions"
      description="Describe what users can do and the core capabilities the system must provide."
      // hintText="You can write in plain language"
      showHint={showHint}
      stepId="functional"
      isReadOnly={isReadOnly}
      hasMinContent={hasMinContent}
      trimmedLength={trimmedLength}
      showError={shouldShowError}
    />
  );
}

export default FunctionalRequirementsStep;
