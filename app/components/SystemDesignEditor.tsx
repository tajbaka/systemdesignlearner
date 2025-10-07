"use client";
import React, { useState, useCallback, useMemo } from "react";
import { ComponentKind, PlacedNode, Edge } from "./types";
import { COMPONENT_LIBRARY } from "./data";
import { uid } from "./utils";
import { SCENARIOS } from "@/lib/scenarios";
import type { Scenario } from "@/lib/scenarios";
import { simulate } from "./simulation";
import { findScenarioPath } from "./utils";
import ReactFlowBoard from "./ReactFlowBoard";
import Palette from "./Palette";
import ScenarioPanel from "./ScenarioPanel";
import DesktopLayout from "./layout/DesktopLayout";
// Temporarily disabled mobile components - need to update their interfaces
// import MobileLayout from "./layout/MobileLayout";
// import MobileTopBar from "./mobile/MobileTopBar";
// import MobileSimulationPanel from "./mobile/MobileSimulationPanel";
// import BottomSheet from "./BottomSheet";

// Simulation result type matching ScenarioPanel expectations
interface SimulationResult {
  latencyMsP95: number;
  capacityRps: number;
  meetsRps: boolean;
  meetsLatency: boolean;
  backlogGrowthRps: number;
  failedByChaos: boolean;
  acceptanceResults?: Record<string, boolean>;
  acceptanceScore?: number;
  scoreBreakdown?: {
    sloScore: number;
    checklistScore: number;
    costScore: number;
    totalScore: number;
    outcome: "pass" | "partial" | "fail" | "chaos_fail";
  };
}

// Main Component
export default function SystemDesignEditor() {
  const [nodes, setNodes] = useState<PlacedNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState(SCENARIOS[0].id);
  const [chaosMode, setChaosMode] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [failAttempts, setFailAttempts] = useState(0);

  const selectedScenario = useMemo(() =>
    SCENARIOS.find((s: Scenario) => s.id === selectedScenarioId)!, [selectedScenarioId]
  );

  const addNode = useCallback((kind: ComponentKind) => {
    const spec = COMPONENT_LIBRARY.find((c) => c.kind === kind)!;

    // Calculate position in a grid layout centered around origin
    const nodesCount = nodes.length;
    const cols = Math.ceil(Math.sqrt(nodesCount + 1));
    const row = Math.floor(nodesCount / cols);
    const col = nodesCount % cols;

    const spacing = 200; // Space between nodes
    const startX = -(cols - 1) * spacing / 2;
    const startY = -(Math.ceil((nodesCount + 1) / cols) - 1) * spacing / 2;

    const newNode: PlacedNode = {
      id: uid(),
      spec,
      x: startX + col * spacing,
      y: startY + row * spacing,
      replicas: 1,
    };

    setNodes((prev) => [...prev, newNode]);
  }, [nodes.length]);

  const handleConnect = useCallback((newEdge: Edge) => {
    setEdges((prev) => [...prev, newEdge]);
  }, []);

  const handleRunSimulation = useCallback(() => {
    try {
      const path = findScenarioPath(selectedScenario, nodes, edges);
      if (path.missingKinds.length > 0) {
        alert(`Missing required components: ${path.missingKinds.join(", ")}`);
        return;
      }

      const result = simulate(selectedScenario, path.nodeIds, nodes, edges, chaosMode, Math.random);
      setSimulationResult(result);

      // Check if failed
      const failed = !result.meetsLatency || !result.meetsRps || result.failedByChaos;
      if (failed) {
        setFailAttempts(prev => prev + 1);
      } else {
        setFailAttempts(0); // Reset on success
      }
    } catch (error) {
      console.error("Simulation error:", error);
      alert("Simulation failed. Check your design and try again.");
    }
  }, [selectedScenario, nodes, edges, chaosMode]);

  const sidebar = (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      <Palette componentLibrary={COMPONENT_LIBRARY} onSpawn={addNode} />
      <ScenarioPanel
        scenarios={SCENARIOS}
        selectedScenarioId={selectedScenarioId}
        onScenarioChange={setSelectedScenarioId}
        chaosMode={chaosMode}
        onChaosModeChange={setChaosMode}
        onRunSimulation={handleRunSimulation}
        simulationResult={simulationResult}
        failAttempts={failAttempts}
      />
    </div>
  );

  const canvas = (
    <ReactFlowBoard
      nodes={nodes}
      edges={edges}
      onConnect={handleConnect}
    />
  );

  return (
    <DesktopLayout sidebar={sidebar} canvas={canvas} />
  );
}
