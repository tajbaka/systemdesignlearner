import { useState } from "react";
import Link from "next/link";
import type { PracticeStep } from "@/lib/practice/types";
import { VoiceCaptureBridge } from "./VoiceCaptureBridge";

type PracticeFooterProps = {
  currentStep: PracticeStep;
  showBack: boolean;
  showNext: boolean;
  nextLabel: string;
  nextDisabled: boolean;
  isReadOnly: boolean;
  isVerifying: boolean;
  onBack: () => void;
  onNext: () => void;
  onBackToSandbox?: () => void;
  voiceCaptureValue?: string;
  voiceCaptureOnChange?: (value: string) => void;
  apiMobileEditing?: boolean;
};

export function PracticeFooter({
  currentStep,
  showBack,
  showNext,
  nextLabel,
  nextDisabled,
  isReadOnly,
  isVerifying,
  onBack,
  onNext,
  onBackToSandbox,
  voiceCaptureValue,
  voiceCaptureOnChange,
  apiMobileEditing,
}: PracticeFooterProps) {
  const [isRecording, setIsRecording] = useState(false);

  // Score step has special footer
  if (currentStep === "score") {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-row items-center justify-between gap-3 px-4 lg:pl-20 py-4">
        <button
          type="button"
          onClick={onBackToSandbox}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-600 text-zinc-200 transition hover:border-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
        >
          <span className="sr-only">Back to sandbox</span>
          <svg aria-hidden className="h-4 w-4" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 12l-4-4 4-4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <Link
          href="/practice"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-blue-950 transition hover:bg-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        >
          <span className="sr-only">Home</span>
          <svg aria-hidden className="h-4 w-4" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 3L3 9v8a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V9l-7-6z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto relative flex w-full max-w-5xl items-center justify-between gap-3 px-4 lg:pl-20 py-4">
      {showBack ? (
        <button
          type="button"
          onClick={onBack}
          disabled={isReadOnly}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-600 text-zinc-200 transition hover:border-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="sr-only">Back</span>
          <svg aria-hidden className="h-4 w-4" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 12l-4-4 4-4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : (
        <span className="h-11 w-11" />
      )}

      {process.env.NODE_ENV !== "production" && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <span className="text-s text-white-500/40 select-none italic font-serif font-light tracking-wide">
            systemdesignsandbox.com
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        {/* Voice Dictation Button - Only show on mobile when voiceCaptureValue is provided */}
        {voiceCaptureValue !== undefined && voiceCaptureOnChange && (
          <div className="sm:hidden">
            <VoiceCaptureBridge
              value={voiceCaptureValue}
              onChange={voiceCaptureOnChange}
              stepId={currentStep}
              disabled={isReadOnly}
              onRecordingChange={setIsRecording}
            />
          </div>
        )}

        {/* Next Button - Hide on mobile when recording or editing API endpoint */}
        {showNext && !isRecording && !apiMobileEditing ? (
          <button
            type="button"
            onClick={onNext}
            disabled={isReadOnly || nextDisabled || isVerifying}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-blue-950 transition hover:bg-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:bg-zinc-600 disabled:text-zinc-300"
          >
            <span className="sr-only">{isVerifying ? "Verifying..." : nextLabel}</span>
            {isVerifying ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg aria-hidden className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
