import { create } from "zustand";
import type { ReactNode } from "react";
import type { AllStepActions } from "../types";

export type StepConfig = {
  showBack: boolean;
  showNext: boolean;
  backDisabled: boolean;
  nextDisabled: boolean;
  fullWidth: boolean;
  leftAction?: AllStepActions;
  rightAction?: AllStepActions;
  leftButtonIcon?: ReactNode;
  rightButtonIcon?: ReactNode;
};

const DEFAULT_CONFIG: StepConfig = {
  showBack: true,
  showNext: true,
  backDisabled: false,
  nextDisabled: false,
  fullWidth: false,
  leftAction: "back",
  rightAction: "next",
  leftButtonIcon: undefined,
  rightButtonIcon: undefined,
};

type StepConfigStore = StepConfig & {
  setConfig: (overrides: Partial<StepConfig>) => void;
  resetConfig: () => void;
};

export const useStepConfigStore = create<StepConfigStore>((set) => ({
  ...DEFAULT_CONFIG,
  setConfig: (overrides) => set({ ...DEFAULT_CONFIG, ...overrides }),
  resetConfig: () => set(DEFAULT_CONFIG),
}));
