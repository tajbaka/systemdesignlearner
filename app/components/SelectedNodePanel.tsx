"use client";
import React from "react";
import { NodeId, PlacedNode } from "./types";
import ConnectMenu from "./ConnectMenu";

interface SelectedNodePanelProps {
  selectedNode: PlacedNode | null;
  nodes: PlacedNode[];
  onDelete: () => void;
  onConnect: (from: NodeId, to: NodeId) => void;
  onUpdateReplicas: (nodeId: NodeId, replicas: number) => void;
}

export default function SelectedNodePanel({
  selectedNode,
  nodes,
  onDelete,
  onConnect,
  onUpdateReplicas,
}: SelectedNodePanelProps) {
  if (!selectedNode) return null;

  return (
    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col gap-3 text-zinc-300">
      <h2 className="text-base text-zinc-300 font-semibold">Selected</h2>
      <div className="text-sm">
        <div className="font-medium">{selectedNode.spec.label}</div>
        <div className="text-zinc-400 text-xs mt-0.5">
          {selectedNode.spec.baseLatencyMs}ms · {selectedNode.spec.capacityRps} rps
        </div>
      </div>

      {/* Replica Controls */}
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-zinc-400 text-xs">Replicas:</span>
        <div className="flex items-center gap-2">
          <button
            className="w-7 h-7 rounded bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-sm cursor-pointer transition-colors"
            onClick={() => {
              const current = selectedNode.replicas || 1;
              if (current > 1) {
                onUpdateReplicas(selectedNode.id, current - 1);
              }
            }}
          >
            -
          </button>
          <span className="w-8 text-center text-zinc-200 font-mono text-sm">
            {selectedNode.replicas || 1}
          </span>
          <button
            className="w-7 h-7 rounded bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-sm cursor-pointer transition-colors"
            onClick={() => {
              const current = selectedNode.replicas || 1;
              if (current < 10) { // reasonable max
                onUpdateReplicas(selectedNode.id, current + 1);
              }
            }}
          >
            +
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <button 
          className="flex-1 px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 transition text-sm cursor-pointer" 
          onClick={onDelete}
        >
          Delete
        </button>
        <div className="flex-1">
          <ConnectMenu nodes={nodes} selectedId={selectedNode.id} onConnect={onConnect} />
        </div>
      </div>
    </div>
  );
}
