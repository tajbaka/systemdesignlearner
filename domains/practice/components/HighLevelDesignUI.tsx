"use client";

import type { PlacedNode, Edge } from "@/domains/practice/types";
import ReactFlowBoard from "./ReactFlowBoard";
import type { PracticeDesignState } from "@/domains/practice/types";
import { TooltipProvider } from "@/components/ui/tooltip";

type HighLevelDesignUIProps = {
  // Design state
  design: PracticeDesignState;
  editingLocked: boolean;
  lockMessage: string | null;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  hideLockOverlay?: boolean; // Hide the lock message overlay (for view-only pages)

  // Event handlers
  onConnect: (edge: Edge) => void;
  onDrop: (kind: string, position: { x: number; y: number }) => void;
  onNodesChange: (nodes: PlacedNode[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onDeleteNode: (nodeId: string) => void;
  onRenameNode: (nodeId: string, newLabel: string) => void;
  onUpdateReplicas: (nodeId: string, replicas: number) => void;
  onNodeTouchStart: (nodeId: string) => void;
  onNodeTouchEnd: () => void;
  onEdgeSelect: (edgeId: string | null) => void;
  onNodeSelect: (nodeId: string | null) => void;
  onDeleteSelection: () => void;
};

export function HighLevelDesignUI({
  design,
  editingLocked,
  lockMessage,
  selectedNodeId,
  selectedEdgeId,
  hideLockOverlay = false,
  onConnect,
  onDrop,
  onNodesChange,
  onEdgesChange,
  onDeleteNode,
  onRenameNode,
  onUpdateReplicas,
  onNodeTouchStart,
  onNodeTouchEnd,
  onEdgeSelect,
  onNodeSelect,
  onDeleteSelection,
}: HighLevelDesignUIProps) {
  return (
    <TooltipProvider>
      <div className="relative h-full w-full">
        <div className="relative flex h-full w-full flex-col overflow-hidden bg-zinc-950">
          <div className="absolute inset-0 overflow-hidden">
            {!editingLocked && (selectedNodeId || selectedEdgeId) ? (
              <div className="absolute right-4 top-4 z-30 sm:left-4 sm:right-auto">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteSelection();
                    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                      navigator.vibrate(30);
                    }
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-rose-400/40 bg-rose-500/15 text-rose-200 shadow-lg transition hover:bg-rose-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 touch-manipulation"
                  aria-label="Delete selected"
                  title="Delete selected"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ) : null}

            {lockMessage && !hideLockOverlay ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm text-sm text-zinc-300">
                {lockMessage}
              </div>
            ) : null}

            <ReactFlowBoard
              nodes={design.nodes}
              edges={design.edges}
              onConnect={onConnect}
              onDrop={onDrop}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onDeleteNode={onDeleteNode}
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
        </div>
      </div>
    </TooltipProvider>
  );
}
