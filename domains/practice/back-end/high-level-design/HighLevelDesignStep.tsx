"use client";

import { useMemo } from "react";
import type { StepComponentProps } from "../types";
import { DesignBoard } from "./components/design-board";
import { useDesignBoard } from "./hooks/useDesignBoard";
import { CommonLayout } from "../layouts/CommonLayout";
import { TooltipProvider } from "@/components/ui/tooltip";
import useStepStore from "../store/useStore";
import { STEPS } from "../constants";
import type { PlacedNode, Edge } from "./types";

type HighLevelDesignStepProps = StepComponentProps;

export default function HighLevelDesignStep({
  config,
  handlers,
  stepType,
  slug,
}: HighLevelDesignStepProps) {
  const { highLevelDesign } = useStepStore(slug as string);

  // Get nodes and edges from store
  const nodes = highLevelDesign?.design.nodes || [];
  const edges = highLevelDesign?.design.edges || [];

  const handleDiagramChange = (newNodes: PlacedNode[], newEdges: Edge[]) => {
    handlers[STEPS.HIGH_LEVEL_DESIGN]("updateDiagram", { nodes: newNodes, edges: newEdges });
  };

  // Extract solution nodes from the problem config
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
    <CommonLayout
      config={config}
      handlers={handlers}
      stepType={stepType}
      slug={slug as string}
      fullWidth={true}
      leftAction="back"
      rightAction="next"
    >
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
          onUpdateReplicas={() => {}} // TODO: Implement replicas
          onNodeTouchStart={() => {}} // TODO: Implement touch handlers if needed
          onNodeTouchEnd={() => {}}
          onNodeSelect={setSelectedNodeId}
          onEdgeSelect={handleEdgeSelect}
          onOpenPalette={() => setMobilePaletteOpen(true)}
        />
      </TooltipProvider>
    </CommonLayout>
  );
}
