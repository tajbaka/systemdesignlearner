"use client";

import { useState, useCallback } from "react";
import { usePracticeSession } from "@/domains/practice/components/PracticeSessionProvider";

export function useNonFunctionalRequirements() {
  const { state, setRequirements, setStepScore, updateIterativeFeedback } = usePracticeSession();
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

  const handleChange = useCallback(
    (summary: string) => {
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
    },
    [
      requirements,
      nf,
      touched,
      showHint,
      state.scores,
      state.iterativeFeedback,
      setRequirements,
      setStepScore,
      updateIterativeFeedback,
    ]
  );

  const handleBlur = useCallback(() => {
    setTouched(true);
  }, []);

  return {
    value: nf.notes,
    trimmedLength,
    isEmpty,
    isTooShort,
    hasError,
    hasMinContent,
    shouldShowError,
    showHint,
    touched,
    handleChange,
    handleBlur,
  };
}
