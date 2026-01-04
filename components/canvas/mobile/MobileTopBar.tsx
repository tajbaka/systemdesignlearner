"use client";
import React, { useState } from "react";
import type { Scenario } from "@/lib/scenarios";

interface MobileTopBarProps {
  componentCount: number;
  isReadOnly: boolean;
  selectedNode: string | null;
  selectedScenario?: Scenario;
  onAddComponent?: () => void;
  onResetView?: () => void;
  onShare?: () => void;
  onFork?: () => void;
  canDelete?: boolean;
  onDelete?: () => void;
}

export default function MobileTopBar({
  componentCount,
  isReadOnly,
  selectedNode: _selectedNode,
  selectedScenario,
  onAddComponent,
  onResetView,
  onShare,
  onFork,
  canDelete = false,
  onDelete,
}: MobileTopBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    if ("vibrate" in navigator) navigator.vibrate(30);
  };

  return (
    <div
      id="mobile-bottom-bar"
      className="z-50 bg-zinc-900 border-t-2 border-white/30 absolute bottom-0 left-0 right-0 flex flex-col-reverse"
    >
      {/* Collapsed Header Bar */}
      <div className="px-3 py-3 min-h-[64px] flex items-center">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Title + Expand Button */}
          <button
            onClick={toggleExpand}
            className="flex items-center gap-2 min-w-0 flex-1 text-left touch-manipulation"
          >
            <div className="flex flex-col min-w-0 flex-1">
              <h1 className="text-sm font-semibold text-zinc-100 truncate">
                {selectedScenario?.title}
              </h1>
              <p className="text-xs text-zinc-400">
                {componentCount} component{componentCount !== 1 ? "s" : ""}
              </p>
            </div>
            <svg
              className={`w-5 h-5 text-zinc-400 transition-transform flex-shrink-0 ${
                isExpanded ? "" : "rotate-180"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Delete Button */}
            {onDelete && (
              <button
                onClick={() => {
                  if (isReadOnly || !canDelete) return;
                  onDelete();
                  if ("vibrate" in navigator) navigator.vibrate(30);
                }}
                disabled={isReadOnly || !canDelete}
                className="w-9 h-9 rounded-full bg-red-500/15 border border-red-400/40 text-red-200 flex items-center justify-center hover:bg-red-500/25 transition touch-manipulation disabled:opacity-40"
                aria-label="Delete selected"
                title="Delete selected"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}

            {/* Reset View Button */}
            {onResetView && (
              <button
                onClick={() => {
                  onResetView();
                  if ("vibrate" in navigator) navigator.vibrate(50);
                }}
                className="w-9 h-9 rounded-full bg-white/10 border border-white/15 text-zinc-300 flex items-center justify-center hover:bg-white/20 transition touch-manipulation"
                aria-label="Reset view"
                title="Reset view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            )}

            {/* Share Button */}
            {onShare && (
              <button
                onClick={() => {
                  onShare();
                  if ("vibrate" in navigator) navigator.vibrate(50);
                }}
                className="w-9 h-9 rounded-full bg-white/10 border border-white/15 text-zinc-300 flex items-center justify-center hover:bg-white/20 transition touch-manipulation"
                aria-label="Share design"
                title="Share design"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                  />
                </svg>
              </button>
            )}

            {/* Fork Button - only shown in read-only mode */}
            {onFork && isReadOnly && (
              <button
                onClick={() => {
                  onFork();
                  if ("vibrate" in navigator) navigator.vibrate(50);
                }}
                className="w-9 h-9 rounded-full bg-emerald-400/10 border border-emerald-400/40 text-emerald-300 flex items-center justify-center hover:bg-emerald-400/20 transition touch-manipulation"
                aria-label="Fork design"
                title="Fork design"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </button>
            )}

            {/* Add Component Button */}
            {onAddComponent && !isReadOnly && (
              <button
                onClick={onAddComponent}
                className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 flex items-center justify-center hover:bg-blue-500/30 transition touch-manipulation"
                aria-label="Add component"
                title="Add component"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-[70vh]" : "max-h-0"
        }`}
      >
        {selectedScenario && (
          <div className="px-4 pt-4 border-b border-white/10 overflow-y-auto max-h-[calc(70vh-4rem)]">
            <div className="flex flex-col gap-4 pb-4">
              {/* Metadata */}
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 text-xs font-medium rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  {selectedScenario.category}
                </span>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-md border ${
                    selectedScenario.difficulty === "easy"
                      ? "bg-green-500/10 text-green-300 border-green-500/20"
                      : selectedScenario.difficulty === "medium"
                        ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/20"
                        : "bg-red-500/10 text-red-300 border-red-500/20"
                  }`}
                >
                  {selectedScenario.difficulty}
                </span>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-zinc-300">Description</h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {selectedScenario.description}
                </p>
              </div>

              {/* Hints if available */}
              {selectedScenario.hints && selectedScenario.hints.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h2 className="text-sm font-semibold text-zinc-300">Hints</h2>
                  <ul className="flex flex-col gap-1.5 text-sm text-zinc-400">
                    {selectedScenario.hints.map((hint, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">💡</span>
                        <span>{hint}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
