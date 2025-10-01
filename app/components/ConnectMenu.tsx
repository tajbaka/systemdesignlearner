"use client";
import React, { useState } from "react";
import { NodeId, PlacedNode } from "./types";

function ConnectMenu({
  nodes,
  selectedId,
  onConnect,
}: {
  nodes: PlacedNode[];
  selectedId: NodeId;
  onConnect: (from: NodeId, to: NodeId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<NodeId | "">("");

  const others = nodes.filter((n) => n.id !== selectedId);

  return (
    <div className="relative">
      <button 
        className="w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 transition text-sm cursor-pointer"
        onClick={() => setOpen((v) => !v)}
      >
        Connect to…
      </button>
      {open && (
        <div className="absolute z-10 mt-2 w-56 p-3 rounded-xl bg-zinc-900 border border-white/10 shadow-xl right-0">
          <select
            className="w-full bg-zinc-800 border border-white/10 rounded-lg px-2 py-2 text-sm cursor-pointer"
            value={target}
            onChange={(e) => setTarget(e.target.value as NodeId)}
          >
            <option value="">Select target</option>
            {others.map((n) => (
              <option key={n.id} value={n.id}>
                {n.spec.label}
              </option>
            ))}
          </select>
          <div className="flex justify-end mt-3 gap-2">
            <button 
              className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 transition text-xs cursor-pointer"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
            <button
              className="px-3 py-1.5 rounded-lg border border-emerald-400/40 bg-emerald-400/10 hover:bg-emerald-400/20 transition text-xs cursor-pointer text-emerald-300"
              onClick={() => {
                if (target) onConnect(selectedId, target as NodeId);
                setOpen(false);
              }}
            >
              Connect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConnectMenu;
