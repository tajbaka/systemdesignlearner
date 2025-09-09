"use client";
import React, { useState } from "react";
import { NodeId, PlacedNode } from "./types";
import { buttonBase } from "./styles";

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
      <button className={buttonBase} onClick={() => setOpen((v) => !v)}>
        Connect to…
      </button>
      {open && (
        <div className="absolute z-10 mt-2 w-56 p-2 rounded-xl bg-zinc-900 border border-white/10 shadow-xl">
          <select
            className="w-full bg-zinc-800 border border-white/10 rounded-lg px-2 py-1 text-sm"
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
          <div className="flex justify-end mt-2 gap-2">
            <button className={buttonBase} onClick={() => setOpen(false)}>
              Close
            </button>
            <button
              className={buttonBase}
              onClick={() => {
                if (target) onConnect(selectedId, target as NodeId);
                setOpen(false);
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConnectMenu;
