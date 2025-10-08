"use client";
import React, { ReactNode, useRef, useState, useCallback, useEffect } from "react";

interface MobileSimulationPanelProps {
  isCollapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
  collapsedHeader?: ReactNode;
  onRunSimulation?: () => void;
}

export default function MobileSimulationPanel({
  isCollapsed,
  onToggle,
  children,
  collapsedHeader,
  onRunSimulation
}: MobileSimulationPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const [dragScaleY, setDragScaleY] = useState<number | null>(null);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wasMagneticallySnappedRef = useRef(false);
  const lastDragHeightRef = useRef<number | null>(null);
  const [topOffset, setTopOffset] = useState(0);

  const COLLAPSED_HEIGHT = collapsedHeader ? 143 : 60;
  const MAGNETIC_THRESHOLD = 100;

  const getViewportHeight = useCallback(() => {
    if (typeof window === "undefined") {
      return 600;
    }
    // Use visualViewport for better Safari support, fallback to innerHeight
    const visualViewportHeight = window.visualViewport?.height;
    const innerHeight = window.innerHeight;

    // On Safari, visualViewport might be more reliable, but we need to account for safe areas
    if (visualViewportHeight) {
      // Add some buffer for safe areas and ensure minimum height
      return Math.max(visualViewportHeight, innerHeight * 0.8);
    }

    return innerHeight;
  }, []);

  const [expandedHeight, setExpandedHeight] = useState<number>(() => getViewportHeight());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateHeight = () => {
      setExpandedHeight(getViewportHeight());
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener("resize", updateHeight);

    return () => {
      window.removeEventListener("resize", updateHeight);
      visualViewport?.removeEventListener("resize", updateHeight);
    };
  }, [getViewportHeight]);

  useEffect(() => {
    if (isCollapsed) {
      setIsFullScreen(false);
      setDragHeight(null);
      setDragScaleY(null);
    }
  }, [isCollapsed]);

  const measureTopBarOffset = useCallback(() => {
    if (typeof window === "undefined") {
      setTopOffset(0);
      return;
    }
    const topBar = document.getElementById("mobile-top-bar");
    if (!topBar) {
      setTopOffset(0);
      return;
    }
    const rect = topBar.getBoundingClientRect();
    setTopOffset(Math.max(rect.bottom, 0));
  }, []);

  useEffect(() => {
    measureTopBarOffset();
    if (typeof window === "undefined") return;
    window.addEventListener("resize", measureTopBarOffset);
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener("resize", measureTopBarOffset);
    return () => {
      window.removeEventListener("resize", measureTopBarOffset);
      visualViewport?.removeEventListener("resize", measureTopBarOffset);
    };
  }, [measureTopBarOffset]);

  const effectiveExpandedHeight = Math.max(expandedHeight - topOffset, COLLAPSED_HEIGHT);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Don't start dragging if the touch is on an interactive element
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' ||
        target.closest('button') ||
        target.closest('[role="button"]') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('textarea')) {
      return; // Let the interactive element handle the touch
    }

    if (!containerRef.current) return;
    if (e.touches.length > 1) {
      setIsDragging(false);
      lastDragHeightRef.current = null;
      return;
    }

    const touch = e.touches[0];
    setStartY(touch.clientY);
    setStartHeight(containerRef.current.offsetHeight);
    setIsDragging(true);
    setDragScaleY(1); // Initialize scale to full size
    wasMagneticallySnappedRef.current = false;

    // Prevent page scroll when dragging panel
    if (typeof document !== "undefined") {
      document.body.classList.add("mobile-panel-interacting");
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || e.touches.length > 1) return;

    const touch = e.touches[0];
    const deltaY = startY - touch.clientY;

    let newHeight = startHeight + deltaY;

    if (newHeight >= effectiveExpandedHeight - MAGNETIC_THRESHOLD) {
      newHeight = effectiveExpandedHeight;
      wasMagneticallySnappedRef.current = true;
    } else if (wasMagneticallySnappedRef.current) {
      wasMagneticallySnappedRef.current = false;
    }

    const maxHeight = Math.max(effectiveExpandedHeight, startHeight);
    newHeight = Math.max(COLLAPSED_HEIGHT, Math.min(maxHeight, newHeight));

    lastDragHeightRef.current = newHeight;

    // Calculate scale factor for smooth collapse from top
    // Scale factor = newHeight / startHeight
    const newScaleY = newHeight / startHeight;

    setDragHeight(newHeight);
    setDragScaleY(newScaleY);
  }, [isDragging, startY, startHeight, effectiveExpandedHeight, MAGNETIC_THRESHOLD, COLLAPSED_HEIGHT]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    setDragScaleY(null); // Reset scale

    const finalHeight = lastDragHeightRef.current;
    if (finalHeight !== null) {
      const magneticallySnapped = wasMagneticallySnappedRef.current || finalHeight >= effectiveExpandedHeight - 1;
      const halfwayPoint = (COLLAPSED_HEIGHT + effectiveExpandedHeight) / 2;
      const shouldExpand = magneticallySnapped || finalHeight > halfwayPoint;

      setDragHeight(null);

      const shouldStickToTop = shouldExpand && magneticallySnapped;
      setIsFullScreen(shouldStickToTop);

      if ((shouldExpand && isCollapsed) || (!shouldExpand && !isCollapsed)) {
        onToggle();
      }

      if (!shouldExpand) {
        setIsFullScreen(false);
      }
    }

    wasMagneticallySnappedRef.current = false;
    lastDragHeightRef.current = null;

    // Re-enable page scroll after dragging
    if (typeof document !== "undefined") {
      document.body.classList.remove("mobile-panel-interacting");
    }
  }, [isDragging, COLLAPSED_HEIGHT, effectiveExpandedHeight, isCollapsed, onToggle]);

  const currentHeightValue = dragHeight !== null
    ? dragHeight
    : (isCollapsed
      ? COLLAPSED_HEIGHT
      : isFullScreen
        ? effectiveExpandedHeight
        : Math.min(effectiveExpandedHeight * 0.75, window.innerHeight * 0.7));

  const currentHeight = `${currentHeightValue}px`;

  const sheetStyle: React.CSSProperties = {
    // Safe area padding for expanded/fullscreen states
    paddingBottom: isCollapsed ? 0 : "max(env(safe-area-inset-bottom), 24px)",
    height: currentHeight,
    transition: isDragging ? "none" : "height 0.3s ease-out, transform 0.3s ease-out",
    touchAction: isDragging ? "none" : "pan-y pinch-zoom",
    // Use sticky positioning with scale transform for smooth top-down collapse
    position: "sticky",
    bottom: 0,
    left: 0,
    right: 0,
    transformOrigin: "top",
    transform: isDragging && dragScaleY !== null ? `scaleY(${dragScaleY})` : "scaleY(1)",
    // Prevent any layout shifts
    willChange: isDragging ? "height, transform" : "auto",
  };

  if (isFullScreen) {
    // Override for fullscreen
    sheetStyle.position = "fixed";
    sheetStyle.top = topOffset;
    sheetStyle.bottom = 0;
    sheetStyle.left = 0;
    sheetStyle.right = 0;
    sheetStyle.zIndex = 60;
    sheetStyle.transform = "scaleY(1)";
    sheetStyle.height = `${effectiveExpandedHeight}px`;
    // Add extra padding for safe areas in fullscreen
    sheetStyle.paddingBottom = "max(env(safe-area-inset-bottom), 34px)";
  }

  return (
    <div
      ref={containerRef}
      className={`mobile-simulation-panel flex-shrink-0 border-t border-white/10 bg-zinc-900/95 backdrop-blur-sm shadow-2xl flex flex-col lg:hidden overflow-hidden ${isCollapsed ? 'mobile-panel-collapsed' : ''}`}
      style={{
        ...sheetStyle,
        // Safari-specific fixes
        WebkitTransform: 'translateZ(0)', // Force hardware acceleration
        transform: 'translateZ(0)',
        // Ensure panel doesn't cause page scroll
        maxHeight: '100vh',
        // Better touch handling for Safari
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {isCollapsed && collapsedHeader && (
        <div className="w-full px-4 py-4 bg-zinc-800/80 border-b-2 border-white/20 rounded-t-lg" style={{ marginBottom: "max(env(safe-area-inset-bottom), 0px)" }}>
          <div className="flex items-center justify-between">
            <div
              className="flex-1 cursor-pointer"
              onClick={onToggle}
              aria-label="Expand simulation panel"
            >
              {collapsedHeader}
            </div>
            {onRunSimulation && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRunSimulation();
                  if ('vibrate' in navigator) navigator.vibrate(50);
                }}
                className="ml-3 w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center hover:bg-emerald-500/30 transition-colors touch-manipulation"
                aria-label="Run simulation"
                title="Run simulation"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Only show toggle button when collapsed - expanded panels use the drag handle at the top */}
      {isCollapsed && (
        <button
          onClick={onToggle}
          className={`flex-shrink-0 w-full flex items-center justify-center gap-2 transition touch-manipulation rounded-b-lg ${
            collapsedHeader
              ? "py-3 bg-zinc-700/60 text-zinc-200 hover:bg-zinc-700/80 border-t border-white/10"
              : "py-2 text-zinc-400 hover:text-zinc-200"
          }`}
          style={!collapsedHeader ? { marginBottom: "max(env(safe-area-inset-bottom), 16px)" } : undefined}
          aria-label="Expand simulation panel"
        >
          <div className="w-12 h-1 rounded-full bg-white/20" />
        </button>
      )}

      {!isCollapsed && (
        <>
          {/* Drag handle for expanded panel */}
          <div className="flex-shrink-0 w-full flex items-center justify-center py-2 cursor-grab active:cursor-grabbing touch-manipulation">
            <div className="w-12 h-1 rounded-full bg-white/20" />
          </div>

          {/* Content area */}
          <div
            className="flex-1 overflow-y-auto px-3 pb-3 sm:px-4 sm:pb-4 max-w-4xl mx-auto w-full"
            onTouchStart={(e) => {
              // Stop propagation to prevent panel drag when scrolling content
              if (e.touches.length === 1) {
                e.stopPropagation();
              }
            }}
            onTouchMove={(e) => {
              // Stop propagation to prevent panel drag when scrolling content
              if (e.touches.length === 1) {
                e.stopPropagation();
              }
            }}
            onTouchEnd={(e) => {
              // Stop propagation to prevent panel drag when scrolling content
              if (e.changedTouches.length === 1) {
                e.stopPropagation();
              }
            }}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}
