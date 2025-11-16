"use client";

import { useEffect, useState } from "react";

type OnboardingTooltipProps = {
  title: string;
  description: string;
  position: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
    transform?: string;
  };
  arrow?: "top" | "bottom" | "left" | "right";
  onNext?: () => void;
  onSkip?: () => void;
  highlightSelector?: string;
  pulseSelector?: string;
  nextLabel?: string;
  showSkip?: boolean;
};

export function OnboardingTooltip({
  title,
  description,
  position,
  arrow = "bottom",
  onNext,
  onSkip,
  highlightSelector,
  pulseSelector,
  nextLabel = "Next",
  showSkip = true,
}: OnboardingTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Add highlight to target element
    if (highlightSelector) {
      const element = document.querySelector(highlightSelector);
      if (element) {
        element.classList.add("onboarding-highlight");
      }
      return () => {
        if (element) {
          element.classList.remove("onboarding-highlight");
        }
      };
    }
  }, [highlightSelector]);

  useEffect(() => {
    // Add pulse animation to target element
    if (pulseSelector) {
      const element = document.querySelector(pulseSelector);
      if (element) {
        element.classList.add("onboarding-pulse");
      }
      return () => {
        if (element) {
          element.classList.remove("onboarding-pulse");
        }
      };
    }
  }, [pulseSelector]);

  const arrowClasses = {
    top: "absolute left-1/2 -translate-x-1/2 -top-2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-blue-600",
    bottom:
      "absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-blue-600",
    left: "absolute top-1/2 -translate-y-1/2 -left-2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-blue-600",
    right:
      "absolute top-1/2 -translate-y-1/2 -right-2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-blue-600",
  };

  return (
    <>
      {/* Backdrop overlay - much lighter - desktop only */}
      <div className="hidden lg:block fixed inset-0 bg-black/20 z-[100] pointer-events-none" />

      {/* Tooltip - desktop only */}
      <div
        className={`hidden lg:block fixed z-[101] transition-all duration-300 ${
          isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
        style={position}
      >
        <div className="relative">
          {arrow !== "top" && <div className={arrowClasses[arrow]} />}
          <div className="rounded-lg border-2 border-blue-500 bg-blue-600 px-4 py-3 text-white shadow-xl max-w-xs">
            <h3 className="text-sm font-bold mb-1.5">{title}</h3>
            <p className="text-xs leading-relaxed mb-3">{description}</p>
            <div className="flex items-center gap-2">
              {onNext && (
                <button
                  onClick={onNext}
                  className="flex-1 h-8 rounded-md bg-white text-blue-600 font-semibold text-xs hover:bg-blue-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600"
                >
                  {nextLabel}
                </button>
              )}
              {showSkip && onSkip && (
                <button
                  onClick={onSkip}
                  className="text-xs text-blue-100 hover:text-white underline transition focus:outline-none whitespace-nowrap"
                >
                  Skip
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Global styles for highlighting */}
      <style jsx global>{`
        .onboarding-highlight {
          position: relative;
          z-index: 102 !important;
          pointer-events: auto !important;
        }

        .onboarding-pulse {
          animation: onboarding-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          position: relative;
          z-index: 102 !important;
        }

        @keyframes onboarding-pulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          50% {
            box-shadow: 0 0 0 12px rgba(59, 130, 246, 0);
          }
        }
      `}</style>
    </>
  );
}
