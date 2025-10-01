"use client";
import React from "react";
import { ComponentKind, ComponentSpec } from "./types";
import { iconFor } from "./icons";

interface PaletteProps {
  componentLibrary: ComponentSpec[];
  onSpawn: (kind: ComponentKind) => void;
}

export default function Palette({ componentLibrary, onSpawn }: PaletteProps) {
  return (
    <div className="flex flex-col gap-3 h-80">
      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col h-full">
        <h2 className="text-base text-zinc-300 font-semibold">Components</h2>
        <p className="text-xs text-zinc-400 mt-1">Drag to board or click to spawn at center.</p>
        <div className="mt-3 grid grid-cols-1 gap-1.5 overflow-y-auto min-h-0 flex-1 scrollbar-hide">
          {componentLibrary.map((c) => {
            const Icon = iconFor(c.kind);
            return (
              <button
                key={c.kind}
                className="px-2.5 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition text-left flex-shrink-0 cursor-pointer"
                onClick={() => onSpawn(c.kind)}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-sds-kind", c.kind);
                  e.dataTransfer.setData("text/plain", c.kind);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                title={`latency ~${c.baseLatencyMs}ms, cap ~${c.capacityRps} rps`}
              >
                <div className="flex items-center justify-between min-w-0">
                  <span className="text-zinc-300 flex items-center gap-2 min-w-0 flex-1 text-sm">
                    <Icon className="text-zinc-200 flex-shrink-0" size={14} />
                    <span className="truncate">{c.label}</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 flex-shrink-0 ml-2">
                    {c.baseLatencyMs}ms · {c.capacityRps} rps
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
