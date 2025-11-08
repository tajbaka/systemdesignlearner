"use client";

import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import { VoiceCaptureBridge } from "@/components/practice/VoiceCaptureBridge";
import { useEffect, useRef, useState } from "react";

export function FunctionalRequirementsStep() {
  const { state, setRequirements, setStepScore, isReadOnly } = usePracticeSession();
  const requirements = state.requirements;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showHint, setShowHint] = useState(true);
  const [touched, setTouched] = useState(false);

  const trimmedLength = requirements.functionalSummary.trim().length;
  const isEmpty = trimmedLength === 0;
  const isTooShort = trimmedLength > 0 && trimmedLength < 50;
  const hasError = isEmpty || isTooShort;
  const hasMinContent = trimmedLength >= 15;
  const shouldShowError = hasError && touched;

  // Auto-resize textarea based on content
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(220, textarea.scrollHeight)}px`;
    }
  };

  // Auto-focus on load and adjust height for pre-filled content
  useEffect(() => {
    if (textareaRef.current) {
      adjustTextareaHeight();
      if (!isReadOnly) {
        const timer = setTimeout(() => {
          textareaRef.current?.focus();
        }, 400);
        return () => clearTimeout(timer);
      }
    }
  }, [isReadOnly]);

  // Adjust height when content changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [requirements.functionalSummary]);

  const handleSummaryChange = (summary: string) => {
    setRequirements({
      ...requirements,
      functionalSummary: summary,
    });
    // Mark as touched when user starts typing
    if (!touched) {
      setTouched(true);
    }
    // Hide hint when user starts typing
    if (summary.length > 0 && showHint) {
      setShowHint(false);
    }
    // Clear the score when user changes their answer
    if (state.scores?.functional) {
      setStepScore("functional", undefined);
    }
  };

  // Helper text that updates based on typing
  const getHelperText = () => {
    if (trimmedLength === 0) {
      return "Need ideas? Think about what the user wants to achieve.";
    }
    if (trimmedLength >= 50) {
      return "Looks good. Ready when you are.";
    }
    return "Keep going, you're on the right track.";
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="px-4 text-center sm:px-6">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            URL Shortener
          </h2>
        </div>
      </div>

      <section className="rounded-3xl border border-zinc-800/60 bg-zinc-900/50 shadow-xl shadow-black/20 p-6 sm:p-8 lg:mx-auto lg:max-w-3xl">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-zinc-200">
                  Tell us what the system should do
                </h3>
                {hasMinContent && (
                  <svg
                    viewBox="0 0 16 16"
                    className="h-4 w-4 text-emerald-400 animate-in fade-in zoom-in duration-300"
                    fill="currentColor"
                  >
                    <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm3.293 4.293a1 1 0 0 0-1.414 0L7 7.172 5.121 5.293a1 1 0 1 0-1.414 1.414l2.586 2.586a1 1 0 0 0 1.414 0l3.586-3.586a1 1 0 0 0 0-1.414z"/>
                  </svg>
                )}
              </div>
              {showHint && !isReadOnly && (
                <div className="animate-in fade-in slide-in-from-right-2 duration-500">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300 border border-blue-400/20">
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
                      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm.75 4.5a.75.75 0 0 0-1.5 0v3.69L5.03 6.97a.75.75 0 0 0-1.06 1.06l3 3a.75.75 0 0 0 1.06 0l3-3a.75.75 0 0 0-1.06-1.06L8.75 8.19V4.5z"/>
                    </svg>
                    Tip: You can write in plain language
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm text-zinc-400">
              One or two sentences is enough. You can refine later.
            </p>
          </div>

          <div className={`relative rounded-2xl border transition-all duration-300 ${
            shouldShowError && !isReadOnly
              ? 'border-red-500/50 bg-red-950/20'
              : 'border-zinc-700/60 bg-zinc-950/40 focus-within:border-blue-400/50 focus-within:bg-zinc-950/60 focus-within:shadow-lg focus-within:shadow-blue-500/10'
          }`}>
            <textarea
              ref={textareaRef}
              value={requirements.functionalSummary}
              onChange={(event) => handleSummaryChange(event.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Example: Users submit URLs and receive shorter versions they can share."
              className="min-h-[220px] w-full resize-none rounded-2xl border-none bg-transparent px-6 pb-5 pr-14 pt-5 text-base leading-7 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-0"
              disabled={isReadOnly}
            />
            <div className="absolute bottom-4 right-4">
              <VoiceCaptureBridge
                value={requirements.functionalSummary}
                onChange={handleSummaryChange}
                stepId="functional"
                disabled={isReadOnly}
              />
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex items-center justify-between">
              <p className={`text-sm transition-colors duration-300 ${
                trimmedLength === 0
                  ? 'text-zinc-500'
                  : trimmedLength >= 50
                    ? 'text-emerald-400'
                    : 'text-blue-400'
              }`}>
                {getHelperText()}
              </p>
              <span className={`text-xs font-medium ${
                trimmedLength >= 50 ? 'text-emerald-400' : trimmedLength > 0 ? 'text-amber-400' : 'text-zinc-500'
              }`}>
                {trimmedLength}/50
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default FunctionalRequirementsStep;
