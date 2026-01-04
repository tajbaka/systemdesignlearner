"use client";
import React from "react";
import type { Scenario } from "@/lib/scenarios";

interface DesktopSidebarProps {
  scenario: Scenario;
  componentCount: number;
}

export default function DesktopSidebar({ scenario, componentCount }: DesktopSidebarProps) {
  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Problem
          </span>
          <span className="text-xs text-zinc-500">
            {componentCount} component{componentCount !== 1 ? "s" : ""}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-zinc-100">{scenario.title}</h1>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-2">
        <span className="px-2 py-1 text-xs font-medium rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20">
          {scenario.category}
        </span>
        <span
          className={`px-2 py-1 text-xs font-medium rounded-md border ${
            scenario.difficulty === "easy"
              ? "bg-green-500/10 text-green-300 border-green-500/20"
              : scenario.difficulty === "medium"
                ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/20"
                : "bg-red-500/10 text-red-300 border-red-500/20"
          }`}
        >
          {scenario.difficulty}
        </span>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-zinc-300">Description</h2>
        <p className="text-sm text-zinc-400 leading-relaxed">{scenario.description}</p>
      </div>

      {/* Hints if available */}
      {scenario.hints && scenario.hints.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-zinc-300">Hints</h2>
          <ul className="flex flex-col gap-1.5 text-sm text-zinc-400">
            {scenario.hints.map((hint, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">💡</span>
                <span>{hint}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
