"use client";
import React from "react";
import { motion } from "framer-motion";
import { NodeId, PlacedNode } from "./types";
import { handleClass, isoClass } from "./styles";

interface NodeCardProps {
  node: PlacedNode;
  isInPath: boolean;
  onMouseDown: (e: React.MouseEvent, id: NodeId) => void;
  onMouseUp: (e: React.MouseEvent, id: NodeId) => void;
  onPortMouseDown: (e: React.MouseEvent, id: NodeId) => void;
}

export default function NodeCard({
  node,
  isInPath,
  onMouseDown,
  onMouseUp,
  onPortMouseDown,
}: NodeCardProps) {
  return (
    <motion.div
      key={node.id}
      className={`${isoClass} absolute select-none cursor-grab active:cursor-grabbing`}
      style={{ width: 190, height: 90, left: node.x - 95, top: node.y - 45 }}
      onMouseDown={(e) => onMouseDown(e, node.id)}
      whileHover={{ translateZ: 20 }}
      onMouseUp={(e) => onMouseUp(e, node.id)}
    >
      <div className={handleClass}>{node.spec.kind}</div>
      <div className="p-4">
        <div className="text-sm font-semibold tracking-wide">{node.spec.label}</div>
        <div className="text-[11px] text-zinc-300 mt-1">
          {node.spec.baseLatencyMs}ms · {node.spec.capacityRps} rps
        </div>
      </div>
      {/* Port handle for connecting */}
            <div
              className="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-400/80 ring-2 ring-emerald-300/40 shadow cursor-crosshair"
              title="Drag to another node to connect"
              onMouseDown={(e) => {
                e.stopPropagation();
                onPortMouseDown(e, node.id);
              }}
            />
      {/* Glow if last simulated path used this node */}
      {isInPath && (
        <div className="absolute inset-0 rounded-2xl ring-2 ring-emerald-400/40 pointer-events-none" />
      )}
    </motion.div>
  );
}
