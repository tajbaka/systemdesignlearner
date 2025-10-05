"use client";
import React from "react";

interface MobileTopBarProps {
  componentCount: number;
  isReadOnly: boolean;
  selectedNode: string | null;
  isConnectMode: boolean;
  undoRedoToggle: "undo" | "redo";
  onConnectMode: () => void;
  onAddComponent: () => void;
  onUndoRedo: () => void;
  onResetView?: () => void;
  onShare?: () => void;
  onFork?: () => void;
  canDelete?: boolean;
  onDelete?: () => void;
}

export default function MobileTopBar({
  componentCount,
  isReadOnly,
  selectedNode,
  isConnectMode,
  undoRedoToggle,
  onConnectMode,
  onAddComponent,
  onUndoRedo,
  onResetView,
  onShare,
  onFork,
  canDelete = false,
  onDelete,
}: MobileTopBarProps) {
  return (
    <div className="flex-shrink-0 px-3 py-2 bg-zinc-900/90 border-b border-white/10 backdrop-blur-sm lg:hidden">
      <div className="flex items-center justify-between gap-2">
        {/* Left: Title + Count */}
        <div className="flex flex-col min-w-0 flex-1">
          <h1 className="text-base font-semibold text-zinc-100 truncate">System Designer</h1>
          <p className="text-xs text-zinc-400">{componentCount} component{componentCount !== 1 ? 's' : ''}</p>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Delete Button */}
          {onDelete && (
            <button
              onClick={() => {
                if (isReadOnly || !canDelete) return;
                onDelete();
                if ('vibrate' in navigator) navigator.vibrate(30);
              }}
              disabled={isReadOnly || !canDelete}
              className="w-11 h-11 rounded-full bg-red-500/15 border border-red-400/40 text-red-200 flex items-center justify-center hover:bg-red-500/25 transition touch-manipulation disabled:opacity-40"
              aria-label="Delete selected"
              title="Delete selected"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Reset View Button */}
          {onResetView && (
            <button
              onClick={() => {
                onResetView();
                if ('vibrate' in navigator) navigator.vibrate(50);
              }}
              className="w-11 h-11 rounded-full bg-white/10 border border-white/15 text-zinc-300 flex items-center justify-center hover:bg-white/20 transition touch-manipulation"
              aria-label="Reset view"
              title="Reset view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}

          {/* Connect Mode Button */}
          <button
            onClick={onConnectMode}
            disabled={!selectedNode || isReadOnly}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition touch-manipulation ${
              isConnectMode
                ? "bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300"
                : "bg-white/10 border border-white/15 text-zinc-300 disabled:opacity-40"
            }`}
            aria-label="Connect mode"
            title="Connect mode"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>

          {/* Add Component Button */}
          <button
            onClick={onAddComponent}
            disabled={isReadOnly}
            className="w-11 h-11 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 flex items-center justify-center hover:bg-blue-500/30 transition touch-manipulation disabled:opacity-40"
            aria-label="Add component"
            title="Add component"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* Undo/Redo Cycling Button */}
          <button
            onClick={onUndoRedo}
            disabled={isReadOnly}
            className="w-11 h-11 rounded-full bg-white/10 border border-white/15 text-zinc-300 flex items-center justify-center hover:bg-white/20 transition touch-manipulation disabled:opacity-40"
            aria-label={undoRedoToggle === "undo" ? "Undo" : "Redo"}
            title={undoRedoToggle === "undo" ? "Undo" : "Redo"}
          >
            {undoRedoToggle === "undo" ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
              </svg>
            )}
          </button>

          {/* Share Button */}
          {onShare && (
            <button
              onClick={() => {
                onShare();
                if ('vibrate' in navigator) navigator.vibrate(50);
              }}
              className="w-11 h-11 rounded-full bg-white/10 border border-white/15 text-zinc-300 flex items-center justify-center hover:bg-white/20 transition touch-manipulation"
              aria-label="Share design"
              title="Share design"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </button>
          )}

          {/* Fork Button - only shown in read-only mode */}
          {onFork && isReadOnly && (
            <button
              onClick={() => {
                onFork();
                if ('vibrate' in navigator) navigator.vibrate(50);
              }}
              className="w-11 h-11 rounded-full bg-emerald-400/10 border border-emerald-400/40 text-emerald-300 flex items-center justify-center hover:bg-emerald-400/20 transition touch-manipulation"
              aria-label="Fork design"
              title="Fork design"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
