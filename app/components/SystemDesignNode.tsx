"use client";
import React, { useRef, useEffect, useState, memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import { SystemDesignNode as SystemDesignNodeType } from "./types";
import { handleClass, isoClass } from "./styles";
import { iconFor } from "./icons";

interface SystemDesignNodeProps extends NodeProps<SystemDesignNodeType> {
  isInPath?: boolean;
  isConnectMode?: boolean;
  isDeleting?: boolean;
  onDelete?: (id: string) => void;
  nodeId?: string;
  onNodeTouchStart?: (nodeId: string) => void;
  onNodeTouchEnd?: () => void;
  onUpdateReplicas?: (id: string, replicas: number) => void;
}

const SystemDesignNodeComponent = ({
  id,
  data,
  selected = false,
  isInPath = false,
  isConnectMode = false,
  isDeleting = false,
  onNodeTouchStart,
  onNodeTouchEnd,
  onUpdateReplicas: onUpdateReplicasProp,
}: SystemDesignNodeProps) => {
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
    setEditValue(data.customLabel || data.spec.label);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [data.customLabel, data.spec.label]);

  const handleRename = useCallback(
    (newLabel: string) => {
      const trimmedLabel = newLabel.trim();
      const currentDisplayLabel = data.customLabel || data.spec.label;
      if (trimmedLabel && trimmedLabel !== currentDisplayLabel) {
        onRename?.(id, trimmedLabel);
      }
      setIsEditing(false);
    },
    [data.customLabel, data.spec.label, onRename, id]
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

  return (
    <motion.div
      className={`${isoClass} relative select-none cursor-grab active:cursor-grabbing touch-none ${
        selected ? "ring-2 ring-blue-400/60 shadow-xl" : ""
      } ${isConnectMode ? "ring-2 ring-emerald-400/60 animate-pulse" : ""} ${
        isDeleting ? "animate-shake" : ""
      }`}
      style={{ width: 190, height: 90 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      whileHover={{ translateZ: 20 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* React Flow Handles */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className={`w-8 h-8 lg:w-2.5 lg:h-2.5 p-2 lg:p-0 rounded-full bg-emerald-400/80 ring-1 lg:ring-1 ring-emerald-300/40 shadow cursor-crosshair transition-all ${
          isHovered || selected || isConnectMode ? "opacity-100 scale-150" : "opacity-0"
        }`}
        title="Drag to connect (N)"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={`w-8 h-8 lg:w-2.5 lg:h-2.5 p-2 lg:p-0 rounded-full bg-emerald-400/80 ring-1 lg:ring-1 ring-emerald-300/40 shadow cursor-crosshair transition-all ${
          isHovered || selected || isConnectMode ? "opacity-100 scale-150" : "opacity-0"
        }`}
        title="Drag to connect (E)"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={`w-8 h-8 lg:w-2.5 lg:h-2.5 p-2 lg:p-0 rounded-full bg-emerald-400/80 ring-1 lg:ring-1 ring-emerald-300/40 shadow cursor-crosshair transition-all ${
          isHovered || selected || isConnectMode ? "opacity-100 scale-150" : "opacity-0"
        }`}
        title="Drag to connect (S)"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className={`w-8 h-8 lg:w-2.5 lg:h-2.5 p-2 lg:p-0 rounded-full bg-emerald-400/80 ring-1 lg:ring-1 ring-emerald-300/40 shadow cursor-crosshair transition-all ${
          isHovered || selected || isConnectMode ? "opacity-100 scale-150" : "opacity-0"
        }`}
        title="Drag to connect (W)"
      />

      {/* Target handles (for incoming connections) */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={`w-8 h-8 lg:w-2.5 lg:h-2.5 p-2 lg:p-0 rounded-full bg-emerald-400/80 ring-1 lg:ring-1 ring-emerald-300/40 shadow cursor-crosshair transition-all ${
          isHovered || selected || isConnectMode ? "opacity-100 scale-150" : "opacity-0"
        }`}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className={`w-8 h-8 lg:w-2.5 lg:h-2.5 p-2 lg:p-0 rounded-full bg-emerald-400/80 ring-1 lg:ring-1 ring-emerald-300/40 shadow cursor-crosshair transition-all ${
          isHovered || selected || isConnectMode ? "opacity-100 scale-150" : "opacity-0"
        }`}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        className={`w-8 h-8 lg:w-2.5 lg:h-2.5 p-2 lg:p-0 rounded-full bg-emerald-400/80 ring-1 lg:ring-1 ring-emerald-300/40 shadow cursor-crosshair transition-all ${
          isHovered || selected || isConnectMode ? "opacity-100 scale-150" : "opacity-0"
        }`}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={`w-8 h-8 lg:w-2.5 lg:h-2.5 p-2 lg:p-0 rounded-full bg-emerald-400/80 ring-1 lg:ring-1 ring-emerald-300/40 shadow cursor-crosshair transition-all ${
          isHovered || selected || isConnectMode ? "opacity-100 scale-150" : "opacity-0"
        }`}
      />

      <div className={`${handleClass} text-zinc-200`}>{data.spec.kind}</div>
      <div className="h-full w-full flex items-center justify-center p-4">
        <div className="flex items-center justify-center gap-3">
          {(() => {
            const Icon = iconFor(data.spec.kind);
            return <Icon className="text-zinc-200" size={60} />;
          })()}
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
              style={{ maxWidth: "120px" }}
            />
          ) : (
            <div
              className="text-sm font-semibold tracking-wide text-zinc-100 cursor-text hover:text-zinc-200 select-none"
              onDoubleClick={startEditing}
              title="Double-click to rename"
            >
              {data.customLabel || data.spec.label}
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
export default memo(SystemDesignNodeComponent, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.isInPath === nextProps.isInPath &&
    prevProps.isConnectMode === nextProps.isConnectMode &&
    prevProps.isDeleting === nextProps.isDeleting &&
    prevProps.data.onDelete === nextProps.data.onDelete &&
    prevProps.data.onRename === nextProps.data.onRename &&
    prevProps.data.replicas === nextProps.data.replicas &&
    prevProps.data.spec.kind === nextProps.data.spec.kind &&
    prevProps.data.spec.label === nextProps.data.spec.label &&
    prevProps.data.customLabel === nextProps.data.customLabel
  );
});
