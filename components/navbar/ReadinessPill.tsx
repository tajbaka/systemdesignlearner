"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useReadiness } from "./useReadiness";
import { ReadinessRing } from "./ReadinessRing";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

function useAnimatedCount(target: number, duration = 700) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const from = prevTarget.current;
    prevTarget.current = target;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}

interface ReadinessPillProps {
  variant: "desktop" | "mobile";
  theme?: "dark" | "light";
}

export function ReadinessPill({ variant, theme = "dark" }: ReadinessPillProps) {
  const { data, isLoading } = useReadiness();
  const [mobileTooltipOpen, setMobileTooltipOpen] = useState(false);
  const displayPercent = useAnimatedCount(data?.percentage ?? 0);

  if (isLoading || !data) return null;

  const shouldPulse = data.percentage > 0 && data.percentage < 100;

  if (variant === "mobile") {
    return (
      <TooltipProvider>
        <Tooltip open={mobileTooltipOpen} onOpenChange={setMobileTooltipOpen}>
          <TooltipTrigger asChild>
            <Link
              href="/practice"
              className="touch-manipulation"
              onClick={(e) => {
                e.preventDefault();
                setMobileTooltipOpen((prev) => !prev);
              }}
            >
              <div className={shouldPulse ? "animate-pulse" : ""}>
                <ReadinessRing
                  percentage={data.percentage}
                  size={32}
                  strokeWidth={3}
                  theme={theme}
                />
              </div>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-center">
            <p className="font-medium">{data.percentage}% Readiness</p>
            <p className="text-zinc-400">
              {data.completedSteps} of {data.totalSteps} steps &middot; {data.masteryLevel}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const isLight = theme === "light";
  const pillClasses = isLight
    ? "bg-zinc-100 border border-zinc-300 hover:bg-zinc-200 hover:border-zinc-400"
    : "bg-zinc-800/60 border border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600";
  const textClasses = isLight ? "text-zinc-700" : "text-zinc-300";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/practice"
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors ${pillClasses}`}
          >
            <div className={shouldPulse ? "animate-pulse" : ""}>
              <ReadinessRing percentage={data.percentage} size={24} strokeWidth={3} theme={theme} />
            </div>
            <span className={`text-sm font-medium ${textClasses}`}>
              {displayPercent}% Readiness
            </span>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {data.completedSteps} of {data.totalSteps} steps completed &middot; {data.masteryLevel}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
