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
import type { ProblemConfig } from "../types";
import type { StepHandlers, AllStepActions } from "../types";
import { CheckCircle2 } from "lucide-react";
import { FeedbackModal } from "../components/FeedbackModal";
import { PracticeModalContent } from "../PracticeModalContent";
import { useFeedbackModal } from "../hooks/useFeedbackModal";
import { Sidebar } from "@/components/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StepTooltip } from "../components/StepTooltip";
import { useStepTooltip } from "../hooks/useStepTooltip";
import { PRACTICE_STEPS, STEPS } from "../constants";
import { AuthModalDialog } from "@/domains/authentication/components/AuthModalDialog";
import { usePracticeAuth } from "../hooks/usePracticeAuth";
import { useIsMobile } from "@/hooks/useIsMobile";

type CommonLayoutProps = {
  config: ProblemConfig;
  handlers: StepHandlers;
  stepType: string | null;
  slug: string;
  children: ReactNode;
  showBack?: boolean;
  showNext?: boolean;
  backDisabled?: boolean;
  nextDisabled?: boolean;
  fullWidth?: boolean;
  leftButtonIcon?: ReactNode;
  rightButtonIcon?: ReactNode;
  leftAction?: AllStepActions;
  rightAction?: AllStepActions;
  showTooltip?: boolean;
};

export function CommonLayout({
  config,
  handlers,
  stepType,
  slug,
  children,
  showBack = true,
  showNext = true,
  backDisabled = false,
  nextDisabled = false,
  fullWidth = false,
  leftButtonIcon,
  rightButtonIcon,
  leftAction,
  rightAction,
}: CommonLayoutProps) {
  const { isActionLoading } = useStore(slug);

  // Auth state management
  const {
    isAuthModalOpen,
    email,
    code,
    step,
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
    setStep,
  } = usePracticeAuth({ slug });

  // Use useStepper hook to calculate activeStep and maxVisitedStep
  const { activeStep, maxVisitedStep, steps } = useStepper({
    stepType,
    config,
  });

  const { handleStepClick, handleBack, handleNext } = useNavigation({
    stepType,
    handlers,
    maxVisitedStep,
    leftAction,
    rightAction,
  });

  // Use feedback modal hook
  const { isModalOpen, setModalOpen, modalTitle, modalDescription, buttonText, onButtonClick } =
    useFeedbackModal(stepType, config, handlers, slug);

  const closeModal = () => setModalOpen(false);

  const { tooltipOpen, handleClick, handleClickOutside } = useStepTooltip(stepType, slug);

  // Get current step data for tooltip
  const currentStepData =
    stepType && stepType !== STEPS.INTRO
      ? PRACTICE_STEPS[stepType as keyof typeof PRACTICE_STEPS]
      : null;

  const isMobile = useIsMobile();
  // On mobile: show step title when on a step; on desktop: always show problem title
  const pageTitle = isMobile
    ? (currentStepData?.title ?? (config.title ? config.title : null))
    : config.title
      ? config.title
      : null;

  return (
    <>
      <Sidebar theme="dark" />
      <TooltipProvider>
        <div className="flex h-full w-full flex-1 flex-col overflow-hidden lg:pl-16">
          {/* Title and Stepper */}
          <div className="bg-zinc-950/90 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80 mx-auto w-full flex-1 flex flex-col min-h-0">
            <div className="flex-shrink-0 md:px-[15%]">
              {pageTitle && (
                <div className="relative flex items-center justify-center pl-6 pr-16 md:pl-0 md:pr-0 pt-[18px] pb-[18px] md:pt-10 md:pb-0">
                  <h2 className="text-xl font-semibold text-white sm:text-2xl text-center max-w-[23ch] break-words ml-8 md:ml-0">
                    {pageTitle}
                  </h2>
                  {/* Tooltip button */}
                  {currentStepData && (
                    <div className="absolute right-6">
                      <StepTooltip
                        title={currentStepData.title}
                        description={currentStepData.tooltipDescription}
                        learnMoreLink={currentStepData.href}
                        open={tooltipOpen && isSignedIn}
                        onClick={handleClick}
                        onClickOutside={handleClickOutside}
                      />
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
              className={`flex-1 overflow-y-auto min-h-0 sm:pt-[40px] ${fullWidth ? "" : "md:px-[20%]"}`}
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
            <div className="mx-auto w-full max-w-5xl px-4 md:max-w-none md:px-[15%]">
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
      </TooltipProvider>

      {/* Auth Modal - Always shown when not signed in, cannot be closed */}
      <AuthModalDialog
        isOpen={isAuthModalOpen}
        isSignedIn={Boolean(isSignedIn)}
        userEmail={user?.primaryEmailAddress?.emailAddress}
        email={email}
        code={code}
        step={step}
        isLoading={isAuthLoading}
        isGoogleLoading={isGoogleLoading}
        error={error}
        isLoaded={isLoaded}
        onEmailChange={setEmail}
        onCodeChange={setCode}
        onEmailSubmit={handleEmailSubmit}
        onCodeVerify={handleCodeVerify}
        onGoogleSignIn={handleGoogleSignIn}
        onBack={() => setStep("start")}
      />
    </>
  );
}
