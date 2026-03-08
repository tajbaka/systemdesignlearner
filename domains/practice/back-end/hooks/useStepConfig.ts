"use client";

import { useEffect, useRef } from "react";
import { useStepConfigStore, type StepConfig } from "../store/stepConfigStore";

/**
 * Registers per-step footer/layout configuration.
 * Sets overrides on mount and whenever primitive values change,
 * resets to defaults on unmount.
 */
export function useStepConfig(overrides: Partial<StepConfig>) {
  const setConfig = useStepConfigStore((s) => s.setConfig);
  const resetConfig = useStepConfigStore((s) => s.resetConfig);
  const ref = useRef(overrides);
  ref.current = overrides;

  const { showBack, showNext, backDisabled, nextDisabled, fullWidth, leftAction, rightAction } =
    overrides;

  useEffect(() => {
    setConfig(ref.current);
  }, [
    setConfig,
    showBack,
    showNext,
    backDisabled,
    nextDisabled,
    fullWidth,
    leftAction,
    rightAction,
  ]);

  useEffect(() => {
    return () => resetConfig();
  }, [resetConfig]);
}
