"use client";
import React, { useRef } from "react";
import { Edge, NodeId, PlacedNode } from "./types";
import { findNode, linePath } from "./utils";
import NodeCard from "./NodeCard";

interface BoardProps {
  nodes: PlacedNode[];
  edges: Edge[];
  lastPath: NodeId[];
  linkingFrom: NodeId | null;
  cursor: { x: number; y: number } | null;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onMouseDown: () => void;
  onNodeMouseDown: (e: React.MouseEvent, id: NodeId) => void;
  onNodeMouseUp: (e: React.MouseEvent, id: NodeId) => void;
  onPortMouseDown: (e: React.MouseEvent, id: NodeId) => void;
}

export default function Board({
  nodes,
  edges,
  lastPath,
  linkingFrom,
  cursor,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onMouseDown,
  onNodeMouseDown,
  onNodeMouseUp,
  onPortMouseDown,
}: BoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={boardRef}
      data-board
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onMouseDown={onMouseDown}
      className="relative rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800 via-zinc-900 to-black overflow-hidden"
      style={{ minHeight: 560 }}
    >
      {/* Grid */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <defs>
          <pattern id="smallGrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          </pattern>
          <pattern id="grid" width="120" height="120" patternUnits="userSpaceOnUse">
            <rect width="120" height="120" fill="url(#smallGrid)" />
            <path d="M 120 0 L 0 0 0 120" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Edges underneath nodes */}
        {edges.map((e) => {
          const from = findNode(nodes, e.from);
          const to = findNode(nodes, e.to);
          if (!from || !to) return null;
          return (
            <path
              key={e.id}
              d={linePath(from.x, from.y, to.x, to.y)}
              stroke="rgba(255,255,255,0.22)"
              strokeWidth={2}
              markerEnd="url(#arrow)"
              fill="none"
            />
          );
        })}

        {/* Temp linking line (during connect drag) */}
        {linkingFrom && cursor && (() => {
          const from = findNode(nodes, linkingFrom);
          if (!from) return null;
          return (
            <path
              d={linePath(from.x, from.y, cursor.x, cursor.y)}
              stroke="rgba(16,185,129,0.6)"
              strokeWidth={2}
              strokeDasharray="6 6"
              fill="none"
            />
          );
        })()}

        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="rgba(255,255,255,0.35)" />
          </marker>
        </defs>
      </svg>

      {/* Nodes */}
      {nodes.map((n) => (
        <NodeCard
          key={n.id}
          node={n}
          isInPath={lastPath.includes(n.id)}
          onMouseDown={onNodeMouseDown}
          onMouseUp={onNodeMouseUp}
          onPortMouseDown={onPortMouseDown}
        />
      ))}
    </div>
  );
}
