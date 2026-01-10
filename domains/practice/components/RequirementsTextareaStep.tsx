"use client";

import { VoiceCaptureBridge } from "./VoiceCaptureBridge";
import { useEffect, useRef } from "react";
import { isDesktop, BREAKPOINTS } from "@/hooks/useIsMobile";

interface RequirementsTextareaStepProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  mobilePlaceholder: string;
  title: string;
  description: string;
  hintText?: string;
  showHint?: boolean;
  stepId: string;
  isReadOnly?: boolean;
  hasMinContent?: boolean;
  trimmedLength: number;
  showError?: boolean;
}

export function RequirementsTextareaStep({
  value,
  onChange,
  onBlur,
  placeholder,
  mobilePlaceholder,
  title,
  description,
  hintText,
  showHint = false,
  stepId,
  isReadOnly = false,
  hasMinContent = false,
  trimmedLength,
  showError = false,
}: RequirementsTextareaStepProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content (desktop only)
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea && isDesktop(BREAKPOINTS.sm)) {
      // sm breakpoint
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(220, textarea.scrollHeight)}px`;
    } else if (textarea) {
      // Remove inline height on mobile to allow flex-1 to work
      textarea.style.height = "";
    }
  };

  // Auto-focus on load and adjust height for pre-filled content (desktop only)
  useEffect(() => {
    if (textareaRef.current) {
      adjustTextareaHeight();
      if (!isReadOnly) {
        const timer = setTimeout(() => {
          // Only auto-focus on desktop (sm breakpoint and above) to prevent keyboard opening on mobile
          if (isDesktop(BREAKPOINTS.sm)) {
            textareaRef.current?.focus();
          }
        }, 400);
        return () => clearTimeout(timer);
      }
    }
  }, [isReadOnly]);

  // Adjust height when content changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [value]);

  return (
    <div className="relative h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Desktop layout */}
      <div className="hidden sm:block space-y-8">
        <section className="rounded-3xl border border-zinc-800/60 bg-zinc-900/50 shadow-xl shadow-black/20 p-6 sm:p-8 mx-4 pb-8 sm:mx-6 lg:mx-auto lg:max-w-3xl">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-zinc-200">{title}</h3>
                  {hasMinContent && (
                    <svg
                      viewBox="0 0 16 16"
                      className="h-4 w-4 text-emerald-400 animate-in fade-in zoom-in duration-300"
                      fill="currentColor"
                    >
                      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm3.293 4.293a1 1 0 0 0-1.414 0L7 7.172 5.121 5.293a1 1 0 1 0-1.414 1.414l2.586 2.586a1 1 0 0 0 1.414 0l3.586-3.586a1 1 0 0 0 0-1.414z" />
                    </svg>
                  )}
                </div>
                {showHint && !isReadOnly && hintText && (
                  <div className="animate-in fade-in slide-in-from-right-2 duration-500">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300 border border-blue-400/20">
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
                        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm.75 4.5a.75.75 0 0 0-1.5 0v3.69L5.03 6.97a.75.75 0 0 0-1.06 1.06l3 3a.75.75 0 0 0 1.06 0l3-3a.75.75 0 0 0-1.06-1.06L8.75 8.19V4.5z" />
                      </svg>
                      {hintText}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm text-zinc-400">{description}</p>
            </div>

            <div
              className={`relative rounded-2xl border transition-all duration-300 ${
                showError && !isReadOnly
                  ? "border-white-300/50"
                  : "border-zinc-700/60 bg-zinc-950/40 focus-within:border-blue-400/50 focus-within:bg-zinc-950/60 focus-within:shadow-lg focus-within:shadow-blue-500/10"
              }`}
            >
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onBlur={onBlur}
                placeholder={placeholder}
                className="min-h-[220px] w-full resize-none rounded-2xl border-none bg-transparent px-6 pb-5 pr-14 pt-5 text-base leading-7 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-0"
                disabled={isReadOnly}
              />
              <div className="absolute bottom-4 right-4">
                <VoiceCaptureBridge
                  value={value}
                  onChange={onChange}
                  stepId={stepId}
                  disabled={isReadOnly}
                />
              </div>
            </div>

            {!isReadOnly && trimmedLength < 50 && (
              <div className="flex items-center justify-start">
                <span className={`text-xs text-white/50`}>
                  {`Remaining characters needed: ${50 - trimmedLength}`}
                </span>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Mobile fullscreen layout */}
      <div
        className="sm:hidden h-full flex flex-col overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        <div className="relative flex-1 min-h-full">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            placeholder={mobilePlaceholder}
            className="w-full min-h-full resize-none border-none bg-transparent px-4 pb-16 pt-4 text-base leading-7 text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus-visible:ring-0"
            disabled={isReadOnly}
          />
        </div>
      </div>
    </div>
  );
}

export default RequirementsTextareaStep;
