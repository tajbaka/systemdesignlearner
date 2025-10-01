"use client";
import React, { ReactNode, useRef, useState, useCallback } from "react";

interface MobileSimulationPanelProps {
  isCollapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
  collapsedHeader?: ReactNode;
}

export default function MobileSimulationPanel({
  isCollapsed,
  onToggle,
  children,
  collapsedHeader
}: MobileSimulationPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const COLLAPSED_HEIGHT = collapsedHeader ? 143 : 60;
  const EXPANDED_HEIGHT = 400; // Approximate max height for expanded state

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current) return;

    const touch = e.touches[0];
    setStartY(touch.clientY);
    setStartHeight(containerRef.current.offsetHeight);
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;

    e.preventDefault(); // Prevent scrolling

    const touch = e.touches[0];
    const deltaY = startY - touch.clientY; // Inverted: dragging up increases height

    // Calculate new height based on drag
    let newHeight = startHeight + deltaY;

    // Constrain height between collapsed and expanded
    newHeight = Math.max(COLLAPSED_HEIGHT, Math.min(EXPANDED_HEIGHT, newHeight));

    setDragHeight(newHeight);
  }, [isDragging, startY, startHeight, COLLAPSED_HEIGHT, EXPANDED_HEIGHT]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);

    if (dragHeight !== null) {
      // Determine if we should snap to expanded or collapsed
      // If dragged more than halfway, snap to expanded; otherwise collapsed
      const halfwayPoint = (COLLAPSED_HEIGHT + EXPANDED_HEIGHT) / 2;
      const shouldExpand = dragHeight > halfwayPoint;

      // Animate to final state
      setDragHeight(null);

      // If the final state is different from current state, toggle
      if ((shouldExpand && isCollapsed) || (!shouldExpand && !isCollapsed)) {
        onToggle();
      }
    }
  }, [isDragging, dragHeight, COLLAPSED_HEIGHT, EXPANDED_HEIGHT, isCollapsed, onToggle]);

  // Calculate current height
  const currentHeight = dragHeight !== null
    ? `${dragHeight}px`
    : (isCollapsed ? `${COLLAPSED_HEIGHT}px` : 'auto');

  return (
    <div
      ref={containerRef}
      className="flex-shrink-0 border-t border-white/10 bg-zinc-900/95 backdrop-blur-sm shadow-2xl flex flex-col lg:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        height: currentHeight,
        maxHeight: dragHeight !== null ? 'none' : (isCollapsed ? (collapsedHeader ? "200px" : "60px") : "70vh"),
        transition: isDragging ? 'none' : 'height 0.3s ease-out'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Collapsed Header - shown when collapsed */}
      {isCollapsed && collapsedHeader && (
        <div
          className="w-full px-4 py-4 bg-zinc-800/80 border-b-2 border-white/20 cursor-pointer rounded-t-lg"
          aria-label="Expand simulation panel"
        >
          {collapsedHeader}
        </div>
      )}

      {/* Collapse/Expand Button */}
      <button
        onClick={onToggle}
        className={`flex-shrink-0 w-full flex items-center justify-center gap-2 transition touch-manipulation rounded-b-lg ${
          isCollapsed && collapsedHeader
            ? 'py-3 bg-zinc-700/60 text-zinc-200 hover:bg-zinc-700/80 border-t border-white/10'
            : 'py-2 text-zinc-400 hover:text-zinc-200'
        }`}
        aria-label={isCollapsed ? "Expand simulation panel" : "Collapse simulation panel"}
      >
        <div className="w-12 h-1 rounded-full bg-white/20" />
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Scrollable Content */}
      {!isCollapsed && (
        <div
          className="flex-1 overflow-y-auto px-3 pb-3 sm:px-4 sm:pb-4 max-w-4xl mx-auto w-full min-h-0"
          onTouchStart={(e) => e.stopPropagation()} // Prevent drag when scrolling content
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </div>
  );
}

