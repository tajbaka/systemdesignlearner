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

  const addNode = useCallback((kind: ComponentKind, position?: { x: number; y: number }) => {
    const spec = COMPONENT_LIBRARY.find((c) => c.kind === kind)!;

    let nodePosition: { x: number; y: number };

    if (position) {
      // Use the provided position (from drag & drop)
      nodePosition = position;
    } else {
      // Default fallback position
      const nodesCount = nodes.length;
      nodePosition = {
        x: (nodesCount % 5) * 250 - 500,
        y: Math.floor(nodesCount / 5) * 250 - 250
      };

      // Try to find a better empty spot without moving existing nodes
      const existingPositions = new Set(
        nodes.map(node => `${Math.round(node.x / 100)},${Math.round(node.y / 100)}`)
      );

      // Try positions in a spiral pattern starting from center
      let attempts = 0;
      const spacing = 200;

      while (attempts < 50) { // Limit attempts to avoid infinite loop
        const radius = Math.floor(attempts / 8) * spacing;
        const angle = (attempts % 8) * (Math.PI / 4);
        const x = Math.round(radius * Math.cos(angle) / spacing) * spacing;
        const y = Math.round(radius * Math.sin(angle) / spacing) * spacing;

        const key = `${Math.round(x / 100)},${Math.round(y / 100)}`;
        if (!existingPositions.has(key)) {
          nodePosition = { x, y };
          break; // Found a good spot, exit the loop
        }
        attempts++;
      }
    }

    const newNode: PlacedNode = {
      id: uid(),
      spec,
      x: nodePosition.x,
      y: nodePosition.y,
      replicas: 1,
    };

    setNodes((prev) => [...prev, newNode]);
  }, [nodes]);

  const handleConnect = useCallback((newEdge: Edge) => {
    setEdges((prev) => [...prev, newEdge]);
  }, []);

  const handleDrop = useCallback((kind: string, position: { x: number; y: number }) => {
    addNode(kind as ComponentKind, position);
  }, [addNode]);

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
      onDrop={handleDrop}
    />
  );

  return (
    <DesktopLayout sidebar={sidebar} canvas={canvas} />
  );
}
