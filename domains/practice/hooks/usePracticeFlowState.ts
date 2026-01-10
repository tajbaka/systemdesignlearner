"use client";

import { useEffect, useState } from "react";
import { on } from "@/domains/practice/lib/events";

export function usePracticeFlowState() {
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);
  const [showTooltips, setShowTooltips] = useState(false);
  const [apiMobileEditing, setApiMobileEditing] = useState(false);
  const [apiMobileEditorValue, setApiMobileEditorValue] = useState<string | undefined>(undefined);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  // Listen for API mobile editor state changes via typed events
  useEffect(() => {
    return on("apiEditor:stateChange", (data) => {
      setApiMobileEditing(data.editing);
      setApiMobileEditorValue(data.value);
    });
  }, []);

  // Track keyboard position using Visual Viewport API
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const updateKeyboardOffset = () => {
      if (!window.visualViewport) return;

      // Calculate the difference between layout viewport and visual viewport
      const layoutHeight = window.innerHeight;
      const visualHeight = window.visualViewport.height;
      const offset = layoutHeight - visualHeight - window.visualViewport.offsetTop;

      // Only set positive offsets (keyboard is open)
      setKeyboardOffset(Math.max(0, offset));

      // Prevent the page from scrolling when keyboard opens
      // Keep the scroll position at top to prevent header from being pushed out
      if (window.visualViewport.offsetTop > 0) {
        window.scrollTo(0, 0);
      }
    };

    window.visualViewport.addEventListener("resize", updateKeyboardOffset);
    window.visualViewport.addEventListener("scroll", updateKeyboardOffset);

    // Initial check
    updateKeyboardOffset();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updateKeyboardOffset);
        window.visualViewport.removeEventListener("scroll", updateKeyboardOffset);
      }
    };
  }, []);

  return {
    keyboardOffset,
    apiMobileEditing,
    apiMobileEditorValue,
    showTooltips,
    setShowTooltips,
    mobilePaletteOpen,
    setMobilePaletteOpen,
  };
}
