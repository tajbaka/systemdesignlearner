"use client";

import { useRef, useCallback } from "react";
import ReactFlowBoard, { type ReactFlowBoardRef } from "./ReactFlowBoard";
import { DesignBoardList, type PaletteListItem } from "./DesignBoardList";
import type { BoardNode, BoardEdge } from "./types";

type DesignBoardProps = {
  // Design state - using generic types
  nodes: BoardNode[];
  edges: BoardEdge[];
  editingLocked: boolean;
  lockMessage: string | null;
  hideLockOverlay?: boolean;

  // Palette state
  mobilePaletteOpen: boolean;
  onPaletteClose: () => void;
  paletteItems: PaletteListItem[];
  onSpawn: (type: string) => string | undefined;
  isReadOnly: boolean;

  // Event handlers - using generic types
  onConnect: (edge: BoardEdge) => void;
  onDrop: (type: string, position: { x: number; y: number }) => string | undefined;
  onNodesChange: (nodes: BoardNode[]) => void;
  onEdgesChange: (edges: BoardEdge[]) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onRenameNode: (nodeId: string, newLabel: string) => void;
  onUpdateReplicas: (nodeId: string, replicas: number) => void;
  onNodeTouchStart: (nodeId: string) => void;
  onNodeTouchEnd: () => void;
  onEdgeSelect: (edgeId: string | null) => void;
  onNodeSelect: (nodeId: string | null) => void;
  onOpenPalette: () => void;
};

export function DesignBoard({
  nodes,
  edges,
  editingLocked,
  lockMessage,
  hideLockOverlay = false,
  mobilePaletteOpen,
  onPaletteClose,
  paletteItems,
  onSpawn,
  isReadOnly,
  onConnect,
  onDrop,
  onNodesChange,
  onEdgesChange,
  onDeleteNode,
  onDeleteEdge,
  onRenameNode,
  onUpdateReplicas,
  onNodeTouchStart,
  onNodeTouchEnd,
  onEdgeSelect,
  onNodeSelect,
  onOpenPalette,
}: DesignBoardProps) {
  const boardRef = useRef<ReactFlowBoardRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type =
        event.dataTransfer.getData("application/x-sds-type") ||
        event.dataTransfer.getData("text/plain");

      if (!type || !boardRef.current || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const position = boardRef.current.screenToFlowPosition(
        event.clientX,
        event.clientY,
        containerRect
      );

      onDrop(type, position);
    },
    [onDrop]
  );

  const handleSpawn = useCallback(
    (type: string) => {
      const newNodeId = onSpawn(type);

      // Always pan to spawned nodes (they appear at a fixed position which might be offscreen)
      if (newNodeId && boardRef.current) {
        // Wait a tick for the node to be added to ReactFlow's internal state
        setTimeout(() => {
          if (boardRef.current) {
            boardRef.current.panToNode(newNodeId, { offsetY: 0 });
          }
        }, 100);
      }
    },
    [onSpawn]
  );

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {lockMessage && !hideLockOverlay ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm text-sm text-zinc-300">
            {lockMessage}
          </div>
        ) : null}

        <ReactFlowBoard
          ref={boardRef}
          nodes={nodes}
          edges={edges}
          onConnect={onConnect}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onDeleteNode={onDeleteNode}
          onDeleteEdge={onDeleteEdge}
          onRenameNode={onRenameNode}
          onUpdateReplicas={onUpdateReplicas}
          onNodeTouchStart={onNodeTouchStart}
          onNodeTouchEnd={onNodeTouchEnd}
          onEdgeSelect={onEdgeSelect}
          onNodeSelect={onNodeSelect}
          miniMapBottomOffset={20}
          className={editingLocked && !hideLockOverlay ? "pointer-events-none opacity-60" : ""}
        />
      </div>
      {/* Component Palette */}
      <div className="pointer-events-none absolute bottom-0 right-0 z-40 w-full h-full lg:h-auto lg:w-96">
        <DesignBoardList
          isOpen={mobilePaletteOpen}
          paletteItems={paletteItems}
          onClose={onPaletteClose}
          onSpawn={handleSpawn}
        />
      </div>

      {/* Button to open palette */}
      {!isReadOnly && !mobilePaletteOpen && (
        <button
          type="button"
          onClick={onOpenPalette}
          className="absolute bottom-10 right-10 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/20 text-blue-100 transition hover:bg-blue-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Open component palette"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M10 4v12M4 10h12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
