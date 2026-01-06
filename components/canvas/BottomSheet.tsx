"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);
  const lastDragHeightRef = useRef<number | null>(null);
  const wasMagneticallySnappedRef = useRef(false);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("bottom-sheet-open");
    } else {
      document.body.style.overflow = "";
      document.body.classList.remove("bottom-sheet-open");
    }
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("bottom-sheet-open");
    };
  }, [isOpen]);

  // Reset drag state when closed
  useEffect(() => {
    if (!isOpen) {
      setIsDragging(false);
      setDragHeight(null);
      lastDragHeightRef.current = null;
      wasMagneticallySnappedRef.current = false;
    }
  }, [isOpen]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Don't start dragging if the touch is on an interactive element
    const target = e.target as HTMLElement;
    if (
      target.tagName === "BUTTON" ||
      target.closest("button") ||
      target.closest('[role="button"]') ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest("textarea")
    ) {
      return; // Let the interactive element handle the touch
    }
    if (!sheetRef.current) return;
    if (e.touches.length > 1) {
      setIsDragging(false);
      lastDragHeightRef.current = null;
      return;
    }
    const touch = e.touches[0];
    setStartY(touch.clientY);
    setStartHeight(sheetRef.current.offsetHeight);
    setIsDragging(true);
    wasMagneticallySnappedRef.current = false;
    // Prevent page scroll when dragging panel
    if (typeof document !== "undefined") {
      document.body.classList.add("bottom-sheet-interacting");
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || e.touches.length > 1) return;
      const touch = e.touches[0];
      const deltaY = startY - touch.clientY;
      let newHeight = startHeight + deltaY;
      // Allow dragging up to expand, but down to collapse
      newHeight = Math.max(0, newHeight);
      lastDragHeightRef.current = newHeight;
      setDragHeight(newHeight);
    },
    [isDragging, startY, startHeight]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    const finalHeight = lastDragHeightRef.current;
    if (finalHeight !== null) {
      // If dragged down significantly, close the sheet
      if (finalHeight < startHeight * 0.3) {
        onClose();
      } else {
        setDragHeight(null);
      }
    }
    wasMagneticallySnappedRef.current = false;
    lastDragHeightRef.current = null;
    // Re-enable page scroll after dragging
    if (typeof document !== "undefined") {
      document.body.classList.remove("bottom-sheet-interacting");
    }
  }, [isDragging, startHeight, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: "100%" }}
            animate={dragHeight !== null ? { y: 0 } : { y: 0 }}
            exit={{ y: "100%" }}
            transition={
              dragHeight !== null
                ? { duration: 0 }
                : { type: "spring", damping: 30, stiffness: 300 }
            }
            className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-white/10 rounded-t-3xl shadow-2xl flex flex-col"
            style={{
              paddingBottom: "env(safe-area-inset-bottom)",
              height: dragHeight !== null ? `${dragHeight}px` : "auto",
              maxHeight: dragHeight !== null ? "none" : "85vh",
              transform: isDragging ? "none" : undefined,
              transition: isDragging ? "none" : "transform 0.3s ease-out",
              willChange: isDragging ? "height" : "auto",
              touchAction: isDragging ? "none" : "pan-y pinch-zoom",
              WebkitTouchCallout: "none",
              WebkitUserSelect: "none",
              userSelect: "none",
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Grabber */}
            <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-manipulation">
              <div className="w-12 h-1.5 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="px-4 pb-3 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-300 touch-manipulation"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div
              className="flex-1 overflow-y-auto px-4 pb-4 min-h-0"
              onTouchStart={(e) => {
                // Stop propagation to prevent sheet drag when scrolling content
                if (e.touches.length === 1) {
                  e.stopPropagation();
                }
              }}
              onTouchMove={(e) => {
                // Stop propagation to prevent sheet drag when scrolling content
                if (e.touches.length === 1) {
                  e.stopPropagation();
                }
              }}
              onTouchEnd={(e) => {
                // Stop propagation to prevent sheet drag when scrolling content
                if (e.changedTouches.length === 1) {
                  e.stopPropagation();
                }
              }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
