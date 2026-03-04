"use client";

import type { ReactNode } from "react";
import { Stepper } from "../components/Stepper";
import {
  PracticeFooter,
  LeftArrowIcon,
  RightArrowIcon,
  LoadingSpinnerIcon,
} from "../components/PracticeFooter";
import { useNavigation } from "../hooks/useNavigation";
import useStore from "../store/useStore";
import { useStepper } from "../hooks/useStepper";
import { CheckCircle2 } from "lucide-react";
import { FeedbackModal } from "../components/FeedbackModal";
import { PracticeModalContent } from "../PracticeModalContent";
import { useFeedbackModal } from "../hooks/useFeedbackModal";
import { PRACTICE_STEPS, STEPS } from "../constants";
import { AuthModalDialog } from "@/domains/authentication/components/AuthModalDialog";
import { usePracticeAuth } from "../hooks/usePracticeAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useStepConfigStore } from "../stores/useStepConfigStore";
import { usePractice } from "../context/PracticeContext";
import { useSidepanel } from "./PracticeShell";
import type { Hint, DesignSolution, ProblemConfig } from "../types";

function getArticlesForStep(
  config: ProblemConfig,
  stepType: string | null
): Array<{ title: string; href: string }> {
  if (!stepType || stepType === STEPS.SCORE) return [];

  const stepKey = stepType as keyof ProblemConfig["steps"];
  const stepData = config.steps[stepKey];
  if (!stepData?.requirements) return [];

  let hints: Hint[];

  if (stepType === STEPS.HIGH_LEVEL_DESIGN) {
    const solutions = stepData.requirements as DesignSolution[];
    hints = solutions.flatMap((sol) => sol.edges.flatMap((edge) => edge.hints ?? []));
  } else {
    const requirements = stepData.requirements as Array<{ hints?: Hint[] }>;
    hints = requirements.flatMap((req) => req.hints ?? []);
  }

  const seen = new Set<string>();
  return hints
    .filter((h): h is Hint & { href: string; title: string } => Boolean(h.href && h.title))
    .filter((h) => {
      if (seen.has(h.href)) return false;
      seen.add(h.href);
      return true;
    })
    .map((h) => ({ title: h.title, href: h.href }));
}

type BackendLayoutProps = {
  children: ReactNode;
};

export function BackendLayout({ children }: BackendLayoutProps) {
  const { config, handlers, slug, stepType } = usePractice();
  const { isActionLoading } = useStore(slug);

  const {
    showBack,
    showNext,
    backDisabled,
    nextDisabled,
    fullWidth,
    leftAction,
    rightAction,
    leftButtonIcon,
    rightButtonIcon,
  } = useStepConfigStore();

  const {
    isAuthModalOpen,
    email,
    code,
    step: authStep,
    isAuthLoading,
    isGoogleLoading,
    error,
    isLoaded,
    isSignedIn,
    user,
    setEmail,
    setCode,
    handleEmailSubmit,
    handleCodeVerify,
    handleGoogleSignIn,
    setStep: setAuthStep,
  } = usePracticeAuth({ slug });

  const { activeStep, maxVisitedStep, steps } = useStepper({
    stepType,
    config,
    slug,
  });

  const { handleStepClick, handleBack, handleNext } = useNavigation({
    stepType,
    handlers,
    maxVisitedStep,
    leftAction,
    rightAction,
  });

  const { isModalOpen, setModalOpen, modalTitle, modalDescription, buttonText, onButtonClick } =
    useFeedbackModal(stepType, config, handlers, slug);

  const closeModal = () => setModalOpen(false);

  const sidepanel = useSidepanel();
  const isMobile = useIsMobile();
  const showMobilePanelButton = isMobile && sidepanel;

  const currentStepData = stepType ? PRACTICE_STEPS[stepType as keyof typeof PRACTICE_STEPS] : null;

  const _stepArticles = getArticlesForStep(config, stepType);

  const pageTitle = isMobile
    ? (currentStepData?.title ?? (config.title ? config.title : null))
    : config.title
      ? config.title
      : null;

  return (
    <>
      <div className="flex h-full w-full flex-1 flex-col overflow-hidden">
        <div className="bg-zinc-950/90 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80 mx-auto w-full flex-1 flex flex-col min-h-0">
          <div className="flex-shrink-0 md:px-[8%]">
            {pageTitle && (
              <div className="relative flex items-center justify-center pl-6 pr-16 md:pl-0 md:pr-0 pt-[18px] pb-[18px] md:pt-10 md:pb-0">
                <h2 className="text-xl font-semibold text-white sm:text-2xl text-center max-w-[60vw] break-words ml-12 md:ml-0">
                  {pageTitle}
                </h2>
                {showMobilePanelButton && (
                  <div className="absolute right-6 md:right-0">
                    <button
                      type="button"
                      onClick={sidepanel.openMobilePanel}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-600/60 bg-zinc-800/40 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-300 hover:border-zinc-500/60 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
                      aria-label="Step information"
                    >
                      <svg
                        viewBox="0 0 16 16"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="8" cy="8" r="6" />
                        <path d="M6.2 6.2a2 2 0 0 1 3.5 1.1c0 1.2-1.7 1.2-1.7 2.2M8 11.5h.01" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="md:pt-10 md:pb-2">
              <Stepper
                steps={steps}
                activeStep={activeStep}
                maxVisitedStep={maxVisitedStep}
                className="!bg-transparent backdrop-blur-none"
                onStepClick={handleStepClick}
              />
            </div>
          </div>
          <div
            className={`flex-1 overflow-y-auto min-h-0 sm:pt-[40px] ${fullWidth ? "" : "md:px-[8%]"}`}
          >
            {children}
          </div>
        </div>

        <FeedbackModal
          isOpen={isModalOpen}
          title={modalTitle}
          description={modalDescription}
          icon={<CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-emerald-500" />}
          onClose={closeModal}
          onButtonClick={onButtonClick}
          buttonLabel={buttonText}
        >
          <PracticeModalContent
            slug={slug}
            stepType={stepType}
            config={config}
            handlers={handlers}
            onInsertComplete={closeModal}
          />
        </FeedbackModal>

        <footer className="bg-black border-t border-zinc-800 flex-shrink-0">
          <div className="mx-auto w-full max-w-5xl px-4 md:max-w-none md:px-[8%]">
            <PracticeFooter
              leftButton={{
                show: showBack,
                onClick: handleBack,
                disabled: backDisabled,
                icon: leftButtonIcon ?? <LeftArrowIcon />,
              }}
              rightButton={{
                show: showNext,
                onClick: handleNext,
                disabled: nextDisabled,
                icon: rightButtonIcon ?? <RightArrowIcon />,
                loadingIcon: <LoadingSpinnerIcon />,
                isLoading: isActionLoading,
              }}
            />
          </div>
        </footer>
      </div>

      <AuthModalDialog
        isOpen={isAuthModalOpen}
        isSignedIn={Boolean(isSignedIn)}
        userEmail={user?.primaryEmailAddress?.emailAddress}
        email={email}
        code={code}
        step={authStep}
        isLoading={isAuthLoading}
        isGoogleLoading={isGoogleLoading}
        error={error}
        isLoaded={isLoaded}
        onEmailChange={setEmail}
        onCodeChange={setCode}
        onEmailSubmit={handleEmailSubmit}
        onCodeVerify={handleCodeVerify}
        onGoogleSignIn={handleGoogleSignIn}
        onBack={() => setAuthStep("start")}
      />
    </>
  );
}
