"use client";

import { MethodSelect, type HttpMethod } from "./MethodSelect";
import { PathInput } from "./PathInput";

interface MethodPathInputProps {
  method: HttpMethod;
  path: string;
  onMethodChange: (method: HttpMethod) => void;
  onPathChange: (path: string) => void;
  disabled?: boolean;
  className?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  shouldHighlight?: boolean;
  shouldHighlightMethod?: boolean;
  shouldHighlightPath?: boolean;
  highlightColor?: "red" | "yellow";
}

export function MethodPathInput({
  method,
  path,
  onMethodChange,
  onPathChange,
  disabled = false,
  className = "",
  onClose,
  showCloseButton = false,
  shouldHighlight = false,
  shouldHighlightMethod = false,
  shouldHighlightPath = false,
  highlightColor = "yellow",
}: MethodPathInputProps) {
  return (
    <div
      className={`flex flex-1 flex-wrap items-center justify-center gap-2 sm:flex-nowrap sm:gap-3 ${className}`}
    >
      <MethodSelect
        value={method}
        onChange={onMethodChange}
        disabled={disabled}
        shouldHighlight={shouldHighlight || shouldHighlightMethod}
        highlightColor={highlightColor}
      />
      <PathInput
        value={path}
        onChange={onPathChange}
        disabled={disabled}
        shouldHighlight={shouldHighlight || shouldHighlightPath}
        highlightColor={highlightColor}
      />
      {onClose && showCloseButton && (
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition hover:border-red-400 hover:text-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          aria-label="Delete endpoint"
        >
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden>
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
