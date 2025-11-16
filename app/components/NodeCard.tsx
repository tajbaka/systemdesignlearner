"use client";
import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { NodeId, PlacedNode } from "./types";
import { handleClass, isoClass } from "./styles";
import { iconFor } from "./icons";

type PortSide = "N" | "E" | "S" | "W";

interface NodeCardProps {
  node: PlacedNode;
  isInPath: boolean;
  isSelected?: boolean;
  isConnectMode?: boolean;
  isDeleting?: boolean;
  onMouseDown: (e: React.MouseEvent, id: NodeId) => void;
  onMouseUp: (e: React.MouseEvent, id: NodeId) => void;
  onTouchStart?: (e: React.TouchEvent, id: NodeId) => void;
  onTouchEnd?: (e: React.TouchEvent, id: NodeId) => void;
  onPortMouseDown: (e: React.MouseEvent, id: NodeId, side: PortSide) => void;
  onPortTouchStart?: (e: React.TouchEvent, id: NodeId, side: PortSide) => void;
  onDelete?: (id: NodeId) => void;
}

export default function NodeCard({
  node,
  isInPath,
  isSelected = false,
  isConnectMode = false,
  isDeleting = false,
  onMouseDown,
  onMouseUp,
  onTouchStart,
  onTouchEnd,
  onPortMouseDown,
  onPortTouchStart,
  onDelete,
}: NodeCardProps) {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const hasMoved = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    hasMoved.current = false;

    // Tap in connect mode
    if (isConnectMode) {
      e.preventDefault();
      onTouchStart?.(e, node.id);
      return;
    }

    // Long press for delete mode (mobile only)
    longPressTimer.current = setTimeout(() => {
      if (!hasMoved.current) {
        if ("vibrate" in navigator) {
          navigator.vibrate([100, 50, 100, 50, 100]); // iOS-style vibration
        }
        // Trigger delete mode instead of drag
        onTouchStart?.(e, node.id);
      }
    }, 500); // Slightly longer for delete vs drag
  };

  const handleTouchMove = () => {
    hasMoved.current = true;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Simple tap (not long press, not moved)
    if (!hasMoved.current) {
      onTouchEnd?.(e, node.id);
    }
  };

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  return (
    <motion.div
      key={node.id}
      className={`${isoClass} absolute select-none cursor-grab active:cursor-grabbing touch-none ${
        isSelected ? "ring-2 ring-blue-400/60 shadow-xl" : ""
      } ${isConnectMode ? "ring-2 ring-emerald-400/60 animate-pulse" : ""} ${
        isDeleting ? "animate-shake" : ""
      }`}
      style={{ width: 190, height: 90, left: node.x - 95, top: node.y - 45 }}
      onMouseDown={(e) => onMouseDown(e, node.id)}
      onMouseUp={(e) => onMouseUp(e, node.id)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      whileHover={{ translateZ: 20 }}
    >
      <div className={`${handleClass} text-zinc-200`}>{node.spec.kind}</div>
      <div className="p-4">
        <div className="flex items-center gap-2">
          {(() => {
            const Icon = iconFor(node.spec.kind);
            return <Icon className="text-zinc-200" size={18} />;
          })()}
          <div className="text-sm font-semibold tracking-wide text-zinc-100">{node.spec.label}</div>
        </div>
        <div className="text-[11px] text-zinc-300 mt-1">
          {node.spec.baseLatencyMs}ms · {node.spec.capacityRps} rps
        </div>
      </div>
      {/* Port handles: N / E / S / W - larger on mobile for touch, small on desktop */}
      <div
        className="absolute left-1/2 -translate-x-1/2 -top-1 w-5 h-5 lg:w-2.5 lg:h-2.5 rounded-full bg-emerald-400/80 ring-1 lg:ring-1 ring-emerald-300/40 shadow cursor-crosshair opacity-0 lg:opacity-100 lg:hover:opacity-100 lg:hover:scale-150 transition-all"
        title="Drag to connect (N)"
        onMouseDown={(e) => {
          e.stopPropagation();
          onPortMouseDown(e, node.id, "N");
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          onPortTouchStart?.(e, node.id, "N");
        }}
      />
      <div
        className="absolute -right-1 top-1/2 -translate-y-1/2 w-5 h-5 lg:w-2.5 lg:h-2.5 rounded-full bg-emerald-400/80 ring-1 lg:ring-1 ring-emerald-300/40 shadow cursor-crosshair opacity-0 lg:opacity-100 lg:hover:opacity-100 lg:hover:scale-150 transition-all"
        title="Drag to connect (E)"
        onMouseDown={(e) => {
          e.stopPropagation();
          onPortMouseDown(e, node.id, "E");
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          onPortTouchStart?.(e, node.id, "E");
        }}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-5 h-5 lg:w-2.5 lg:h-2.5 rounded-full bg-emerald-400/80 ring-1 lg:ring-1 ring-emerald-300/40 shadow cursor-crosshair opacity-0 lg:opacity-100 lg:hover:opacity-100 lg:hover:scale-150 transition-all"
        title="Drag to connect (S)"
        onMouseDown={(e) => {
          e.stopPropagation();
          onPortMouseDown(e, node.id, "S");
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          onPortTouchStart?.(e, node.id, "S");
        }}
      />
      <div
        className="absolute -left-1 top-1/2 -translate-y-1/2 w-5 h-5 lg:w-2.5 lg:h-2.5 rounded-full bg-emerald-400/80 ring-1 lg:ring-1 ring-emerald-300/40 shadow cursor-crosshair opacity-0 lg:opacity-100 lg:hover:opacity-100 lg:hover:scale-150 transition-all"
        title="Drag to connect (W)"
        onMouseDown={(e) => {
          e.stopPropagation();
          onPortMouseDown(e, node.id, "W");
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          onPortTouchStart?.(e, node.id, "W");
        }}
      />
      {/* Glow if last simulated path used this node */}
      {isInPath && (
        <div className="absolute inset-0 rounded-2xl ring-2 ring-emerald-400/40 pointer-events-none" />
      )}

      {/* Delete button overlay (mobile) */}
      {isDeleting && (
        <button
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-500 border-2 border-red-400 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors z-10"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(node.id);
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            onDelete?.(node.id);
          }}
          title="Delete component"
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
    </motion.div>
  );
}
