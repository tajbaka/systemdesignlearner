"use client";
import React, { useState, useCallback, useMemo } from "react";
import { ComponentKind, PlacedNode, Edge } from "./types";
import { COMPONENT_LIBRARY } from "./data";
import { uid } from "./utils";
import { SCENARIOS } from "@/lib/scenarios";
import type { Scenario } from "@/lib/scenarios";
import { simulate } from "./simulation";
import { findScenarioPath } from "./utils";
import { iconFor } from "./icons";
import ReactFlowBoard from "./ReactFlowBoard";
import Palette from "./Palette";
import ScenarioPanel from "./ScenarioPanel";
import DesktopLayout from "./layout/DesktopLayout";
import MobileLayout from "./layout/MobileLayout";
import MobileTopBar from "./mobile/MobileTopBar";
import MobileSimulationPanel from "./mobile/MobileSimulationPanel";
import BottomSheet from "./BottomSheet";

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

  // Mobile-specific state
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isConnectMode, setIsConnectMode] = useState(false);
  const [isSimPanelCollapsed, setIsSimPanelCollapsed] = useState(false);
  const [undoRedoToggle, setUndoRedoToggle] = useState<"undo" | "redo">("undo");

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

  const handleNodesChange = useCallback((updatedNodes: PlacedNode[]) => {
    setNodes(updatedNodes);
  }, []);

  const handleEdgesChange = useCallback((updatedEdges: Edge[]) => {
    setEdges(updatedEdges);
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    // Also remove any edges connected to this node
    setEdges(prev => prev.filter(edge => edge.from !== nodeId && edge.to !== nodeId));
  }, []);

  // Mobile-specific handlers
  const handleAddComponent = useCallback(() => {
    setIsAddSheetOpen(true);
  }, []);

  const handleConnectMode = useCallback(() => {
    setIsConnectMode(prev => !prev);
  }, []);

  const handleUndoRedo = useCallback(() => {
    setUndoRedoToggle(prev => prev === "undo" ? "redo" : "undo");
    // TODO: Implement actual undo/redo functionality
  }, []);

  const handleAddComponentFromSheet = useCallback((kind: ComponentKind) => {
    addNode(kind);
    setIsAddSheetOpen(false);
    // Auto-center on the new node
    setTimeout(() => {
      const newNode = nodes[nodes.length - 1]; // Get the most recently added node
      if (newNode) {
        setSelectedNode(newNode.id);
      }
    }, 100);
  }, [addNode, nodes]);

  const handleSimPanelToggle = useCallback(() => {
    setIsSimPanelCollapsed(prev => !prev);
  }, []);

  // Mobile touch handlers for React Flow
  const handleNodeTouchStart = useCallback((nodeId: string) => {
    setSelectedNode(nodeId);
  }, []);

  const handleNodeTouchEnd = useCallback(() => {
    // Handle touch end if needed
  }, []);

  const handleRunSimulation = useCallback(() => {
    try {
      const path = findScenarioPath(selectedScenario, nodes, edges);

      if (path.missingKinds.length > 0) {
        alert(`Missing required components: ${path.missingKinds.join(", ")}`);
        return;
      }

      if (path.nodeIds.length === 0) {
        alert("No valid path found through your components. Make sure components are properly connected.");
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
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onDeleteNode={handleDeleteNode}
      onNodeTouchStart={handleNodeTouchStart}
      onNodeTouchEnd={handleNodeTouchEnd}
      className="w-full h-full"
    />
  );

  // Mobile components
  const mobileTopBar = (
    <MobileTopBar
      componentCount={nodes.length}
      isReadOnly={false}
      selectedNode={selectedNode}
      isConnectMode={isConnectMode}
      undoRedoToggle={undoRedoToggle}
      onConnectMode={handleConnectMode}
      onAddComponent={handleAddComponent}
      onUndoRedo={handleUndoRedo}
    />
  );

  const mobileBottomPanel = (
    <MobileSimulationPanel
      isCollapsed={isSimPanelCollapsed}
      onToggle={handleSimPanelToggle}
      collapsedHeader={
        simulationResult ? (
          <div className="flex items-center gap-3 text-sm">
            <div className={`px-2 py-1 rounded text-xs font-semibold ${
              simulationResult.scoreBreakdown?.outcome === "pass" ? "bg-emerald-500/20 text-emerald-300" :
              simulationResult.scoreBreakdown?.outcome === "partial" ? "bg-yellow-500/20 text-yellow-300" :
              "bg-red-500/20 text-red-300"
            }`}>
              {simulationResult.scoreBreakdown?.outcome === "pass" ? "PASS" :
               simulationResult.scoreBreakdown?.outcome === "partial" ? "PARTIAL" : "FAIL"}
            </div>
            <span className="text-zinc-300">
              Score: {simulationResult.scoreBreakdown?.totalScore || 0}/100
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <span>Ready to run simulation</span>
          </div>
        )
      }
    >
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
    </MobileSimulationPanel>
  );

  const addComponentSheet = (
    <BottomSheet
      isOpen={isAddSheetOpen}
      onClose={() => setIsAddSheetOpen(false)}
      title="Add Component"
    >
      <div className="grid grid-cols-2 gap-3">
        {COMPONENT_LIBRARY.map((component) => {
          const Icon = iconFor(component.kind);
          return (
            <button
              key={component.kind}
              onClick={() => handleAddComponentFromSheet(component.kind)}
              className="p-4 bg-zinc-800/50 border border-white/10 rounded-xl hover:bg-zinc-700/50 transition-colors touch-manipulation"
            >
              <div className="flex flex-col items-center gap-2">
                <Icon className="text-zinc-200" size={24} />
                <div className="text-sm font-medium text-zinc-200 text-center">{component.label}</div>
                <div className="text-xs text-zinc-400 text-center">
                  {component.baseLatencyMs}ms · {component.capacityRps} rps
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <DesktopLayout sidebar={sidebar} canvas={canvas} />
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <MobileLayout
          topBar={mobileTopBar}
          canvas={canvas}
          bottomPanel={mobileBottomPanel}
          addSheet={addComponentSheet}
        />
      </div>
    </>
  );
}
