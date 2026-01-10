import type { PracticeStep } from "@/domains/practice/types";
import type { usePracticeSession } from "@/domains/practice/components/PracticeSessionProvider";
import { track } from "@/lib/analytics";

type PracticeSessionValue = ReturnType<typeof usePracticeSession>;

export type StepConfig = {
  id: PracticeStep;
  showBack?: boolean;
  showNext?: boolean;
  nextLabel?: string;
  nextDisabled?: (session: PracticeSessionValue) => boolean;
  onNext?: (session: PracticeSessionValue) => void;
};

export const completeStep = (session: PracticeSessionValue, step: PracticeStep) => {
  if (session.isReadOnly || session.state.completed[step]) return;
  session.markStep(step, true);
  track("practice_step_completed", { slug: session.state.slug, step });
};

/**
 * Get step configuration that's aware of the current scenario.
 * This allows different scenarios to have different validation rules or labels.
 */
export function getStepConfig(step: PracticeStep, _slug: string): StepConfig {
  const baseConfig = STEP_CONFIGS[step];

  // You can customize configs per scenario here in the future
  // For now, return the base config
  return baseConfig;
}

export const STEP_CONFIGS: Record<PracticeStep, StepConfig> = {
  functional: {
    id: "functional",
    showBack: true,
    nextLabel: "Next",
    nextDisabled: (session) => {
      const summary = session.state.requirements.functionalSummary.trim();
      // Require at least 50 characters for meaningful description
      return !summary || summary.length < 50;
    },
    onNext: (session) => completeStep(session, "functional"),
  },
  nonFunctional: {
    id: "nonFunctional",
    showBack: true,
    nextLabel: "Next",
    nextDisabled: (session) => {
      const notes = session.state.requirements.nonFunctional.notes.trim();
      // Require at least 50 characters for meaningful description
      return !notes || notes.length < 50;
    },
    onNext: (session) => completeStep(session, "nonFunctional"),
  },
  api: {
    id: "api",
    showBack: true,
    nextLabel: "Next",
    nextDisabled: (session) => {
      const endpoints = session.state.apiDefinition.endpoints;
      if (endpoints.length === 0) return true;
      // Only validate endpoints that have a path defined
      // This allows users to have empty placeholder endpoints
      const validEndpoints = endpoints.filter((ep) => ep.path.trim().length > 0);
      if (validEndpoints.length === 0) return true;
      // Require at least some meaningful content in notes for each valid endpoint
      return validEndpoints.some((ep) => !ep.notes.trim() || ep.notes.trim().length < 10);
    },
    onNext: (session) => completeStep(session, "api"),
  },
  highLevelDesign: {
    id: "highLevelDesign",
    showBack: true,
    nextLabel: "Run & Continue",
    nextDisabled: () => false, // Always enabled - will trigger run if needed
    onNext: (session) => completeStep(session, "highLevelDesign"),
  },
  score: {
    id: "score",
    showBack: true,
    showNext: false,
  },
};

export const getHelperText = (
  currentStep: PracticeStep,
  nextDisabled: boolean,
  isReadOnly: boolean
): string | null => {
  if (isReadOnly) return null;
  if (currentStep === "functional" && nextDisabled) {
    return "Please provide a detailed description (at least 50 characters) of what the system should do.";
  }
  if (currentStep === "highLevelDesign" && nextDisabled) {
    return "Design your system architecture visually with drag-and-drop components.";
  }
  if (currentStep === "nonFunctional" && nextDisabled) {
    return "Please provide a detailed description (at least 50 characters) of the performance constraints.";
  }
  if (currentStep === "api" && nextDisabled) {
    return "Add meaningful descriptions (at least 10 characters) for each API endpoint.";
  }
  return null;
};
