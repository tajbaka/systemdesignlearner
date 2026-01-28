"use client";

import { forwardRef, useState } from "react";
import { type HttpMethod } from "./MethodSelect";
import { MethodPathInput } from "./MethodPathInput";
import { TextArea } from "../../components/TextArea";

interface TextAreaInputCardProps {
  method: HttpMethod;
  path: string;
  notes: string;
  onMethodChange: (method: HttpMethod) => void;
  onPathChange: (path: string) => void;
  onNotesChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  showCloseButton?: boolean;
  onClose?: () => void;
  placeholder?: string;
  bottomText?: string[];
  disabled?: boolean;
  shouldHighlightSelectBox?: boolean;
  shouldHighlightInput?: boolean;
  shouldHighlightTextArea?: boolean;
  highlightColor?: "red" | "yellow";
  /** Optional element to render in the bottom-right corner of the textarea */
  bottomRightSlot?: React.ReactNode;
}

export const TextAreaInputCard = forwardRef<HTMLTextAreaElement, TextAreaInputCardProps>(
  (
    {
      method,
      path,
      notes,
      onMethodChange,
      onPathChange,
      onNotesChange,
      onClose,
      showCloseButton = true,
      placeholder,
      bottomText,
      disabled = false,
      shouldHighlightSelectBox = false,
      shouldHighlightInput = false,
      shouldHighlightTextArea = false,
      highlightColor = "yellow",
      bottomRightSlot,
    },
    ref
  ) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
      <div className="relative animate-in fade-in slide-in-from-bottom-2 duration-500">
        {/* Desktop layout */}
        <div className="hidden sm:block space-y-8">
          <section className="rounded-3xl border border-zinc-800/60 bg-zinc-900/50 shadow-xl shadow-black/20 px-6">
            <div className="flex flex-1 flex-wrap items-center justify-center gap-2 py-6 sm:flex-nowrap sm:gap-3">
              <MethodPathInput
                method={method}
                path={path}
                onMethodChange={onMethodChange}
                onPathChange={onPathChange}
                disabled={disabled}
                onClose={onClose}
                showCloseButton={showCloseButton}
                shouldHighlightMethod={shouldHighlightSelectBox}
                shouldHighlightPath={shouldHighlightInput}
                highlightColor={highlightColor}
              />
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition hover:border-blue-400 hover:text-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-expanded={isExpanded}
                aria-label={isExpanded ? "Collapse endpoint" : "Expand endpoint"}
              >
                <svg
                  viewBox="0 0 16 16"
                  className={`h-3 w-3 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M4 6l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div
              className={`overflow-hidden transition-[max-height,opacity] duration-300 ${
                isExpanded ? "max-h-[999px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="space-y-6 p-1">
                <div
                  className={`relative rounded-2xl transition-all duration-300 ${
                    shouldHighlightTextArea
                      ? highlightColor === "red"
                        ? "border border-red-400/50 bg-red-950/20 ring-2 ring-red-400/30 focus-within:border-blue-400/50 focus-within:bg-zinc-950/60 focus-within:shadow-lg focus-within:shadow-blue-500/10 focus-within:ring-0"
                        : "border border-amber-400/50 bg-amber-950/20 ring-2 ring-amber-400/30 focus-within:border-blue-400/50 focus-within:bg-zinc-950/60 focus-within:shadow-lg focus-within:shadow-blue-500/10 focus-within:ring-0"
                      : "border border-zinc-700/60 bg-zinc-950/40 focus-within:border-blue-400/50 focus-within:bg-zinc-950/60 focus-within:shadow-lg focus-within:shadow-blue-500/10"
                  }`}
                >
                  <TextArea
                    ref={ref}
                    value={notes}
                    onChange={onNotesChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="min-h-[220px]"
                  />
                  {bottomRightSlot && (
                    <div className="absolute bottom-4 right-4">{bottomRightSlot}</div>
                  )}
                </div>

                {bottomText && bottomText.length > 0 && (
                  <div className="flex flex-col pb-4 items-start gap-1">
                    {bottomText.map((text, index) => (
                      <span key={index} className="text-xs text-white/50">
                        {text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Mobile fullscreen layout */}
        <div
          className="sm:hidden h-full flex flex-col overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          <div className="relative flex-1 min-h-full">
            <div className="p-4 space-y-4">
              <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:flex-nowrap sm:justify-between sm:gap-3">
                <MethodPathInput
                  method={method}
                  path={path}
                  onMethodChange={onMethodChange}
                  onPathChange={onPathChange}
                  disabled={disabled}
                  onClose={onClose}
                  showCloseButton={!!onClose}
                  shouldHighlightMethod={false}
                  shouldHighlightPath={false}
                  highlightColor={highlightColor}
                />
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition hover:border-blue-400 hover:text-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? "Collapse endpoint" : "Expand endpoint"}
                >
                  <svg
                    viewBox="0 0 16 16"
                    className={`h-3 w-3 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M4 6l4 4 4-4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <div
                className={`overflow-hidden transition-[max-height,opacity] duration-300 ${
                  isExpanded ? "max-h-[999px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="space-y-4 p-1">
                  <div className="relative transition-all duration-300">
                    <TextArea
                      ref={ref}
                      value={notes}
                      onChange={onNotesChange}
                      placeholder={placeholder}
                      disabled={disabled}
                      className="w-full min-h-full border-none bg-transparent px-4 pb-16 pt-4 placeholder:text-zinc-400"
                    />
                  </div>
                  {bottomText && bottomText.length > 0 && (
                    <div className="px-4 pb-4 flex flex-col gap-1">
                      {bottomText.map((text, index) => (
                        <span key={index} className="text-xs text-white/50">
                          {text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

TextAreaInputCard.displayName = "TextAreaInputCard";
