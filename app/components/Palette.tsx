"use client";
import React from "react";
import { ComponentKind, ComponentSpec } from "./types";
import { buttonBase } from "./styles";
import { iconFor } from "./icons";

interface PaletteProps {
  componentLibrary: ComponentSpec[];
  onSpawn: (kind: ComponentKind) => void;
}

export default function Palette({ componentLibrary, onSpawn }: PaletteProps) {
  return (
    <div className="flex flex-col gap-3 min-h-0 flex-1">
      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col min-h-0 flex-1">
        <h2 className="text-lg text-zinc-300">Components</h2>
        <p className="text-xs text-zinc-400">Drag to board or click to spawn.</p>
        <div className="mt-3 grid grid-cols-1 gap-2 overflow-y-auto min-h-0 flex-1 pr-2">
          {componentLibrary.map((c) => {
            const Icon = iconFor(c.kind);
            return (
              <button
                key={c.kind}
                className={`${buttonBase} text-left flex-shrink-0`}
                onClick={() => onSpawn(c.kind)}
                title={`latency ~${c.baseLatencyMs}ms, cap ~${c.capacityRps} rps`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300 flex items-center gap-2">
                    <Icon className="text-zinc-200" size={16} />
                    {c.label}
                  </span>
                  <span className="text-[10px] text-zinc-400">
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
