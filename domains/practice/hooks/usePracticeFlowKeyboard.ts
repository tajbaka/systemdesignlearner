"use client";

import { useEffect } from "react";

interface UsePracticeFlowKeyboardOptions {
  showNext: boolean;
  nextDisabled: boolean;
  isVerifying: boolean;
  isReadOnly: boolean;
  handleNext: () => void;
}

export function usePracticeFlowKeyboard({
  showNext,
  nextDisabled,
  isVerifying,
  isReadOnly,
  handleNext,
}: UsePracticeFlowKeyboardOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger on Enter key
      if (event.key !== "Enter") return;

      // Don't trigger if user is typing in a textarea or input
      const target = event.target as HTMLElement;
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") return;

      // Don't trigger if next button is not shown or is disabled
      if (!showNext || nextDisabled || isVerifying || isReadOnly) return;

      // Trigger the next button
      event.preventDefault();
      handleNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showNext, nextDisabled, isVerifying, isReadOnly, handleNext]);
}
