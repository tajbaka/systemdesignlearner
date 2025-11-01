import type { PracticeStep } from "@/lib/practice/types";
import type { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
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

export const STEP_CONFIGS: Record<PracticeStep, StepConfig> = {
  functional: {
    id: "functional",
    showBack: false,
    nextLabel: "Next",
    nextDisabled: (session) => !session.state.requirements.functionalSummary.trim(),
    onNext: (session) => completeStep(session, "functional"),
  },
  nonFunctional: {
    id: "nonFunctional",
    showBack: true,
    nextLabel: "Next",
    nextDisabled: (session) => {
      const nf = session.state.requirements.nonFunctional;
      return nf.readRps <= 0 || nf.writeRps <= 0 || nf.p95RedirectMs <= 0;
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
      const validEndpoints = endpoints.filter(ep => ep.path.trim().length > 0);
      if (validEndpoints.length === 0) return true;
      // Require at least some meaningful content in notes for each valid endpoint
      return validEndpoints.some(ep => !ep.notes.trim() || ep.notes.trim().length < 10);
    },
    onNext: (session) => completeStep(session, "api"),
  },
  sandbox: {
    id: "sandbox",
    showBack: true,
    nextLabel: "Run & Continue",
    nextDisabled: () => false, // Always enabled - will trigger run if needed
    onNext: (session) => completeStep(session, "sandbox"),
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
  if (currentStep === "sandbox" && nextDisabled) {
    return "Run the simulation and achieve a passing score to continue.";
  }
  if (currentStep === "nonFunctional" && nextDisabled) {
    return "Enter positive numbers for throughput and latency targets.";
  }
  if (currentStep === "api" && nextDisabled) {
    return "Add meaningful descriptions (at least 10 characters) for each API endpoint.";
  }
  return null;
};
