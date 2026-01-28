"use client";
import React, { useRef, useEffect, useState, memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import { DesignNode as DesignNodeType } from "./types";
import { isMobile } from "./utils";

// 2.5D card style
export const isoClass =
  "rounded-2xl shadow-lg border border-white/10 bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-100 " +
  "[transform-style:preserve-3d] [transform:perspective(900px)_rotateX(12deg)]";

export const handleClass =
  "absolute -top-2 -left-2 px-2 py-0.5 text-[10px] rounded-full bg-white/10 backdrop-blur border border-white/20";

export const buttonBase =
  "px-3 py-2 sm:py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition min-h-[44px] touch-manipulation";

interface DesignNodeProps extends NodeProps<DesignNodeType> {
  isInPath?: boolean;
  isConnectMode?: boolean;
  isDeleting?: boolean;
  onDelete?: (id: string) => void;
  nodeId?: string;
  onNodeTouchStart?: (nodeId: string) => void;
  onNodeTouchEnd?: () => void;
  onUpdateReplicas?: (id: string, replicas: number) => void;
}

const DesignNodeComponent = ({
  id,
  data,
  selected = false,
  isInPath = false,
  isConnectMode = false,
  isDeleting = false,
  onNodeTouchStart,
  onNodeTouchEnd,
  onUpdateReplicas: onUpdateReplicasProp,
}: DesignNodeProps) => {
  const { setNodes } = useReactFlow();
  const onDelete = data.onDelete;
  const onRename = data.onRename;
  const _onUpdateReplicas = data.onUpdateReplicas ?? onUpdateReplicasProp;
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const hasMoved = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = useCallback(() => {
    setIsEditing(true);
    setEditValue(data.name || "");
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [data.name]);

  const handleRename = useCallback(
    (newLabel: string) => {
      const trimmedLabel = newLabel.trim();
      const currentDisplayLabel = data.name || "";
      if (trimmedLabel && trimmedLabel !== currentDisplayLabel) {
        onRename?.(id, trimmedLabel);
      }
      setIsEditing(false);
    },
    [data.name, onRename, id]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleRename(editValue);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsEditing(false);
      }
    },
    [editValue, handleRename]
  );

  const handleTouchStart = () => {
    hasMoved.current = false;
    onNodeTouchStart?.(id);

    // Long press for delete mode (mobile only)
    longPressTimer.current = setTimeout(() => {
      if (!hasMoved.current) {
        if ("vibrate" in navigator) {
          navigator.vibrate([100, 50, 100, 50, 100]); // iOS-style vibration
        }
        // Trigger delete mode - this will be handled by parent component
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

  const handleTouchEnd = () => {
    onNodeTouchEnd?.();
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const _updateLocalReplicas = useCallback(
    (nextReplicas: number) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  replicas: nextReplicas,
                },
              }
            : node
        )
      );
    },
    [id, setNodes]
  );

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const mobile = isMobile();
  const isDraggable = !mobile || selected; // On mobile, only draggable when selected

  return (
    <motion.div
      className={`${isoClass} relative select-none cursor-grab active:cursor-grabbing touch-none ${
        selected ? "ring-2 ring-blue-400/60 shadow-xl" : ""
      } ${isConnectMode ? "ring-2 ring-emerald-400/60 animate-pulse" : ""} ${
        isDeleting ? "animate-shake" : ""
      } ${!isDraggable ? "nodrag" : ""}`}
      style={{ width: 190, height: 90 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      whileHover={{ translateZ: 20 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* React Flow Handles - with higher z-index and nodrag class for better touch handling */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className={`nodrag w-8 h-8 lg:w-2.5 lg:h-2.5 p-2 lg:p-0 rounded-full bg-emerald-400/80 ring-1 lg:ring-1 ring-emerald-300/40 shadow cursor-crosshair transition-all z-50 ${
          isHovered || selected || isConnectMode ? "opacity-100 scale-150" : "opacity-0"
        }`}
        title="Drag to connect (N)"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={`nodrag w-8 h-8 lg:w-2.5 lg:h-2.5 p-2 lg:p-0 rounded-full bg-emerald-400/80 ring-1 lg:ring-1 ring-emerald-300/40 shadow cursor-crosshair transition-all z-50 ${
          isHovered || selected || isConnectMode ? "opacity-100 scale-150" : "opacity-0"
        }`}
        title="Drag to connect (E)"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={`nodrag w-8 h-8 lg:w-2.5 lg:h-2.5 p-2 lg:p-0 rounded-full bg-emerald-400/80 ring-1 lg:ring-1 ring-emerald-300/40 shadow cursor-crosshair transition-all z-50 ${
          isHovered || selected || isConnectMode ? "opacity-100 scale-150" : "opacity-0"
        }`}
        title="Drag to connect (S)"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className={`nodrag w-8 h-8 lg:w-2.5 lg:h-2.5 p-2 lg:p-0 rounded-full bg-emerald-400/80 ring-1 lg:ring-1 ring-emerald-300/40 shadow cursor-crosshair transition-all z-50 ${
          isHovered || selected || isConnectMode ? "opacity-100 scale-150" : "opacity-0"
        }`}
        title="Drag to connect (W)"
      />

      {/* Target handles (for incoming connections) */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={`nodrag w-8 h-8 lg:w-2.5 lg:h-2.5 p-2 lg:p-0 rounded-full bg-emerald-400/80 ring-1 lg:ring-1 ring-emerald-300/40 shadow cursor-crosshair transition-all z-50 ${
          isHovered || selected || isConnectMode ? "opacity-100 scale-150" : "opacity-0"
        }`}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className={`nodrag w-8 h-8 lg:w-2.5 lg:h-2.5 p-2 lg:p-0 rounded-full bg-emerald-400/80 ring-1 lg:ring-1 ring-emerald-300/40 shadow cursor-crosshair transition-all z-50 ${
          isHovered || selected || isConnectMode ? "opacity-100 scale-150" : "opacity-0"
        }`}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        className={`nodrag w-8 h-8 lg:w-2.5 lg:h-2.5 p-2 lg:p-0 rounded-full bg-emerald-400/80 ring-1 lg:ring-1 ring-emerald-300/40 shadow cursor-crosshair transition-all z-50 ${
          isHovered || selected || isConnectMode ? "opacity-100 scale-150" : "opacity-0"
        }`}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={`nodrag w-8 h-8 lg:w-2.5 lg:h-2.5 p-2 lg:p-0 rounded-full bg-emerald-400/80 ring-1 lg:ring-1 ring-emerald-300/40 shadow cursor-crosshair transition-all z-50 ${
          isHovered || selected || isConnectMode ? "opacity-100 scale-150" : "opacity-0"
        }`}
      />

      <div className="h-full w-full flex items-center justify-center p-4">
        <div className="flex items-center justify-center gap-3">
          {data.icon ? (
            <data.icon className="text-zinc-200" size={60} />
          ) : (
            <div className="w-[60px] h-[60px]" />
          )}
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={(e) => {
                e.preventDefault();
                handleRename(editValue);
              }}
              className="bg-zinc-700 border border-zinc-500 rounded px-1 py-0 text-sm font-semibold tracking-wide text-zinc-100 focus:outline-none focus:border-blue-400 min-w-0 flex-1"
              style={{ maxWidth: "90px" }}
              maxLength={20}
            />
          ) : (
            <div
              className="text-sm font-semibold tracking-wide text-zinc-100 cursor-text hover:text-zinc-200 select-none truncate max-w-[90px]"
              onDoubleClick={startEditing}
            >
              {data.name}
            </div>
          )}
        </div>
      </div>

      {/* Glow if last simulated path used this node */}
      {isInPath && (
        <div className="absolute inset-0 rounded-2xl ring-2 ring-emerald-400/40 pointer-events-none" />
      )}

      {/* Delete button overlay */}
      {(selected || isHovered) && onDelete && (
        <button
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-500 border-2 border-red-400 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors z-10"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(id);
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            onDelete(id);
          }}
          title="Delete component (or press Delete key)"
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
};

// Memoize to prevent unnecessary re-renders
export default memo(DesignNodeComponent, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.isInPath === nextProps.isInPath &&
    prevProps.isConnectMode === nextProps.isConnectMode &&
    prevProps.isDeleting === nextProps.isDeleting &&
    prevProps.data.onDelete === nextProps.data.onDelete &&
    prevProps.data.onRename === nextProps.data.onRename &&
    prevProps.data.type === nextProps.data.type &&
    prevProps.data.name === nextProps.data.name
  );
});
