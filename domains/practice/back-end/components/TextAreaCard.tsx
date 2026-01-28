"use client";

import { TextArea } from "./TextArea";
import { forwardRef } from "react";

interface TextAreaCardProps {
  title: string;
  description: string;
  bottomText?: string;
  placeholder?: string;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  shouldHighlight?: boolean;
  highlightColor?: "red" | "yellow";
  /** Optional element to render in the bottom-right corner of the textarea */
  bottomRightSlot?: React.ReactNode;
}

export const TextAreaCard = forwardRef<HTMLTextAreaElement, TextAreaCardProps>(
  (
    {
      title,
      description,
      bottomText,
      placeholder,
      value,
      onChange,
      disabled = false,
      shouldHighlight = false,
      highlightColor = "yellow",
      bottomRightSlot,
    },
    ref
  ) => {
    const getBorderClass = () => {
      if (!shouldHighlight) {
        return "border border-zinc-700/60 bg-zinc-950/40 focus-within:border-blue-400/50 focus-within:bg-zinc-950/60 focus-within:shadow-lg focus-within:shadow-blue-500/10";
      }
      switch (highlightColor) {
        case "red":
          return "border border-red-400/50 bg-red-950/20 ring-2 ring-red-400/30 focus-within:border-blue-400/50 focus-within:bg-zinc-950/60 focus-within:shadow-lg focus-within:shadow-blue-500/10 focus-within:ring-0";
        case "yellow":
          return "border border-amber-400/50 bg-amber-950/20 ring-2 ring-amber-400/30 focus-within:border-blue-400/50 focus-within:bg-zinc-950/60 focus-within:shadow-lg focus-within:shadow-blue-500/10 focus-within:ring-0";
      }
    };

    return (
      <div className="relative h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
        {/* Desktop layout */}
        <div className="hidden sm:block space-y-8">
          <section className="rounded-3xl border border-zinc-800/60 bg-zinc-900/50 shadow-xl shadow-black/20 p-6 sm:p-8 pb-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-zinc-200">{title}</h3>
                <p className="text-sm text-zinc-400">{description}</p>
              </div>

              <div
                className={`relative rounded-2xl transition-all duration-300 ${getBorderClass()}`}
              >
                <TextArea
                  ref={ref}
                  value={value}
                  onChange={onChange}
                  placeholder={placeholder}
                  disabled={disabled}
                  className="min-h-[220px]"
                />
                {bottomRightSlot && (
                  <div className="absolute bottom-4 right-4">{bottomRightSlot}</div>
                )}
              </div>

              {bottomText && (
                <div className="flex items-center justify-start">
                  <span className="text-xs text-white/50">{bottomText}</span>
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
          <div className="relative flex-1 min-h-full transition-all duration-300">
            <TextArea
              ref={ref}
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full min-h-full border-none bg-transparent px-4 pb-16 pt-4 placeholder:text-zinc-400"
            />
            {bottomRightSlot && <div className="absolute bottom-4 right-4">{bottomRightSlot}</div>}
            {bottomText && !bottomRightSlot && (
              <div className="absolute bottom-4 right-4">
                <span className="text-xs text-white/50">{bottomText}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

TextAreaCard.displayName = "TextAreaCard";
