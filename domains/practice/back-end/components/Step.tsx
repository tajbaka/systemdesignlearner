"use client";

import { cn } from "@/lib/utils";

export interface StepProps {
  number: number;
  title: string;
  description: string;
  isActive?: boolean;
  isCompleted?: boolean;
  className?: string;
}

export function Step({
  number,
  title,
  description,
  isActive = false,
  isCompleted = false,
  className,
}: StepProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all duration-300",
          isActive
            ? "bg-blue-500/80 text-blue-50 ring-2 ring-blue-400/30 scale-110"
            : isCompleted
              ? "bg-emerald-500/60 text-emerald-50 scale-100"
              : "bg-zinc-800/40 text-zinc-500 scale-90"
        )}
      >
        {isCompleted && !isActive ? (
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
            <circle cx="8" cy="8" r="2.5" />
          </svg>
        ) : (
          number
        )}
      </span>
      <span className="text-center">
        <span
          className={cn(
            "block text-[11px] font-medium uppercase tracking-wider",
            isActive ? "text-blue-300" : isCompleted ? "text-emerald-300" : "text-zinc-500"
          )}
        >
          {title}
        </span>
        <span
          className={cn(
            "mt-0.5 block text-[10px]",
            isActive ? "text-blue-400/80" : isCompleted ? "text-emerald-400/80" : "text-zinc-600"
          )}
        >
          {description}
        </span>
      </span>
    </div>
  );
}
