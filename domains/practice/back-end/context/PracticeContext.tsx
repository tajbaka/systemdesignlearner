"use client";

import { createContext, useContext } from "react";
import type { ProblemConfig, StepHandlers } from "../types";

type PracticeContextValue = {
  config: ProblemConfig;
  handlers: StepHandlers;
  slug: string;
  stepType: string | null;
  loading: boolean;
};

const PracticeContext = createContext<PracticeContextValue | null>(null);

export const PracticeProvider = PracticeContext.Provider;

export function usePractice(): PracticeContextValue {
  const ctx = useContext(PracticeContext);
  if (!ctx) {
    throw new Error("usePractice must be used within a PracticeProvider");
  }
  return ctx;
}

export function usePracticeOptional(): PracticeContextValue | null {
  return useContext(PracticeContext);
}
