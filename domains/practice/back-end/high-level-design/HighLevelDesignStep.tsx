"use client";

import { useMemo } from "react";
import type { StepComponentProps } from "../types";
import { DesignBoard } from "./components/design-board";
import { useDesignBoard } from "./hooks/useDesignBoard";
import { TooltipProvider } from "@/components/ui/tooltip";
import useStepStore from "../hooks/useStore";
import { STEPS } from "../constants";
import type { PlacedNode, Edge } from "./types";
import { useStepConfig } from "../hooks/useStepConfig";

type HighLevelDesignStepProps = StepComponentProps;

export default function HighLevelDesignStep({
  config,
  handlers,
  stepType: _stepType,
  slug,
}: HighLevelDesignStepProps) {
  useStepConfig({ leftAction: "back", rightAction: "next", fullWidth: true });

  const { highLevelDesign } = useStepStore(slug as string);

  const nodes = highLevelDesign?.design.nodes || [];
  const edges = highLevelDesign?.design.edges || [];

  const handleDiagramChange = (newNodes: PlacedNode[], newEdges: Edge[]) => {
    handlers[STEPS.HIGH_LEVEL_DESIGN]("updateDiagram", { nodes: newNodes, edges: newEdges });
  };

  const solutionNodes = useMemo(() => {
    return config?.steps?.highLevelDesign?.requirements?.[0]?.nodes;
  }, [config]);

  const {
    boardNodes,
    boardEdges,
    setSelectedNodeId,
    mobilePaletteOpen,
    setMobilePaletteOpen,
    paletteItems,
    isReadOnly,
    handleConnect,
    handleDrop,
    handleNodesChange,
    handleEdgesChange,
    handleDeleteNode,
    handleDeleteEdge,
    handleRenameNode,
    handleSpawn,
    handleEdgeSelect,
  } = useDesignBoard({
    isReadOnly: false,
    nodes,
    edges,
    onDiagramChange: handleDiagramChange,
    solutionNodes,
  });

  return (
    <TooltipProvider>
      <DesignBoard
        nodes={boardNodes}
        edges={boardEdges}
        editingLocked={false}
        lockMessage={null}
        hideLockOverlay={false}
        mobilePaletteOpen={mobilePaletteOpen}
        onPaletteClose={() => setMobilePaletteOpen(false)}
        paletteItems={paletteItems}
        onSpawn={handleSpawn}
        isReadOnly={isReadOnly}
        onConnect={handleConnect}
        onDrop={handleDrop}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onDeleteNode={handleDeleteNode}
        onDeleteEdge={handleDeleteEdge}
        onRenameNode={handleRenameNode}
        onUpdateReplicas={() => {}}
        onNodeTouchStart={() => {}}
        onNodeTouchEnd={() => {}}
        onNodeSelect={setSelectedNodeId}
        onEdgeSelect={handleEdgeSelect}
        onOpenPalette={() => setMobilePaletteOpen(true)}
      />
    </TooltipProvider>
  );
}
