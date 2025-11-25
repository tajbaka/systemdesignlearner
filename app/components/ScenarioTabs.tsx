"use client";
import React, { useState } from "react";
import type { Scenario } from "@/lib/scenarios";
import { lintApi } from "@/lib/apiLint";
import { COMPONENT_LIBRARY } from "./data";

// Map kind to display label
const kindToLabel = (kind: string): string => {
  const component = COMPONENT_LIBRARY.find((c) => c.kind === kind);
  return component?.label ?? kind;
};

export interface ScenarioTabsProps {
  scenario: Scenario;
}

export default function ScenarioTabs({ scenario }: ScenarioTabsProps) {
  const [activeTab, setActiveTab] = useState<"flow" | "api">("flow");

  const hasApi = scenario.api && scenario.api.length > 0;
  const apiLints = hasApi ? lintApi(scenario) : [];

  return (
    <div className="space-y-3">
      {/* Tab Headers */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("flow")}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            activeTab === "flow"
              ? "bg-blue-500/20 text-blue-300 border border-blue-400/30"
              : "bg-zinc-800/50 text-zinc-400 border border-white/10 hover:text-zinc-300"
          }`}
        >
          Flow
        </button>
        {hasApi && (
          <button
            onClick={() => setActiveTab("api")}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              activeTab === "api"
                ? "bg-blue-500/20 text-blue-300 border border-blue-400/30"
                : "bg-zinc-800/50 text-zinc-400 border border-white/10 hover:text-zinc-300"
            }`}
          >
            API
            {apiLints.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-300 rounded">
                {apiLints.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === "flow" && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-zinc-300">Expected Flow</h4>
          <div className="text-xs text-zinc-400 space-y-1">
            {scenario.flow.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-4 text-center text-zinc-500">{i + 1}.</span>
                <span className={step.optional ? "text-zinc-500" : "text-zinc-300"}>
                  {kindToLabel(step.kind)}
                  {step.optional && <span className="ml-1 text-zinc-500">(optional)</span>}
                </span>
              </div>
            ))}
          </div>
          {scenario.suggestedComponents && scenario.suggestedComponents.length > 0 && (
            <div className="mt-3">
              <h5 className="text-xs font-semibold text-zinc-400 mb-1">Suggested Components</h5>
              <div className="flex flex-wrap gap-1">
                {scenario.suggestedComponents.map((comp, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-300 rounded border border-blue-400/20"
                  >
                    {comp}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "api" && hasApi && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-zinc-300">API Endpoints</h4>

          {/* API Endpoints Table */}
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-2 text-zinc-400 font-semibold">Method</th>
                  <th className="text-left p-2 text-zinc-400 font-semibold">Path</th>
                  <th className="text-left p-2 text-zinc-400 font-semibold">Query</th>
                  <th className="text-left p-2 text-zinc-400 font-semibold">Body</th>
                  <th className="text-left p-2 text-zinc-400 font-semibold">Response</th>
                  <th className="text-left p-2 text-zinc-400 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {scenario.api!.map((endpoint, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="p-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                          endpoint.method === "GET"
                            ? "bg-green-500/20 text-green-300"
                            : endpoint.method === "POST"
                              ? "bg-blue-500/20 text-blue-300"
                              : endpoint.method === "PUT"
                                ? "bg-amber-500/20 text-amber-300"
                                : endpoint.method === "DELETE"
                                  ? "bg-red-500/20 text-red-300"
                                  : "bg-gray-500/20 text-gray-300"
                        }`}
                      >
                        {endpoint.method}
                      </span>
                    </td>
                    <td className="p-2 font-mono text-zinc-300">{endpoint.path}</td>
                    <td className="p-2 text-zinc-400">
                      {endpoint.query ? endpoint.query.join(", ") : "-"}
                    </td>
                    <td className="p-2 text-zinc-400 max-w-24 truncate">
                      {endpoint.bodyShape || "-"}
                    </td>
                    <td className="p-2 text-zinc-400 max-w-24 truncate">
                      {endpoint.responseShape || "-"}
                    </td>
                    <td className="p-2 text-zinc-400 max-w-32 truncate">{endpoint.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* API Lints */}
          {apiLints.length > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-400/20">
              <h5 className="text-xs font-semibold text-amber-300 mb-2">API Design Suggestions</h5>
              <ul className="space-y-1">
                {apiLints.map((lint, i) => (
                  <li key={i} className="text-xs text-amber-200 flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span>{lint}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
