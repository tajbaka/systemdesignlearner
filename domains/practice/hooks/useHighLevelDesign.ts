"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import type { ComponentKind } from "@/domains/practice/types";
import type { PlacedNode, Edge } from "@/domains/practice/types";
import { usePracticeSession } from "@/domains/practice/components/PracticeSessionProvider";
import { useDesignHistory } from "@/domains/practice/hooks/useDesignHistory";
import { useTutorialManager } from "@/domains/practice/hooks/useTutorialManager";
import { track } from "@/lib/analytics";
import { designToComponents } from "@/domains/practice/lib/designToComponents";
import { useAdjacencyList } from "@/domains/practice/hooks/useAdjacencyList";
import { loadScoringConfig, getScoringConfigSync } from "@/domains/practice/scoring";
import { ALLOWED_COMPONENTS_LIST } from "@/domains/practice/constants";

// Utility functions
function nodesEqual(a: PlacedNode[], b: PlacedNode[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const nodeA = a[i];
    const nodeB = b[i];
    if (nodeA.id !== nodeB.id || nodeA.x !== nodeB.x || nodeA.y !== nodeB.y) {
      return false;
    }
  }
  return true;
}

function edgesEqual(a: Edge[], b: Edge[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const edgeA = a[i];
    const edgeB = b[i];
    if (edgeA.id !== edgeB.id || edgeA.from !== edgeB.from || edgeA.to !== edgeB.to) {
      return false;
    }
  }
  return true;
}

const pruneEdges = (edges: Edge[], nodes: PlacedNode[]): Edge[] => {
  const nodeIds = new Set(nodes.map((node) => node.id));
  return edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));
};

const nextPosition = (nodes: PlacedNode[]) => {
  if (nodes.length === 0) {
    return { x: -120, y: -120 };
  }
  const maxX = Math.max(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  return { x: maxX + 180, y: minY };
};

export function useHighLevelDesign() {
  const { state, setDesign, setStepScore, isReadOnly } = usePracticeSession();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [allowedKinds, setAllowedKinds] = useState<ComponentKind[]>([]);

  const editingLocked = isReadOnly || state.run.isRunning;
  const lockMessage = isReadOnly
    ? "Shared view · editing disabled"
    : state.run.isRunning
      ? "Simulation running… editing will unlock when the run completes."
      : null;

  // Clear simulation state helper
  const clearSimulationState = useCallback(() => {
    setStepScore("design", undefined);
  }, [setStepScore]);

  // Design history
  const { saveToHistory } = useDesignHistory({
    nodes: state.design.nodes,
    edges: state.design.edges,
    editingLocked,
    selectedNodeId,
    slug: state.slug,
    onStateChange: useCallback(
      (nodes: PlacedNode[], edges: Edge[]) => {
        setDesign((prev) => ({ ...prev, nodes, edges }));
      },
      [setDesign]
    ),
    onDesignChange: clearSimulationState,
  });

  // Load scoring config to determine allowed components from solution
  useEffect(() => {
    const loadComponents = async () => {
      // Try to get from cache first
      let config = getScoringConfigSync(state.slug);
      if (!config) {
        config = await loadScoringConfig(state.slug);
      }

      if (config?.steps?.highLevelDesign?.solutions?.[0]?.nodes) {
        // Extract unique component types from solution
        const solutionTypes = new Set(
          config.steps.highLevelDesign.solutions[0].nodes.map((node) => node.type)
        );

        // Map types to ComponentKinds
        const components = new Set<ComponentKind>();
        solutionTypes.forEach((type) => {
          const config = ALLOWED_COMPONENTS_LIST[type];
          if (config) {
            components.add(config.kind);
          }
        });

        setAllowedKinds(Array.from(components));
      } else {
        // No solution defined, keep empty array
        setAllowedKinds([]);
      }
    };

    loadComponents();
  }, [state.slug]);

  // Tutorial manager
  const {
    currentStep,
    stepCount,
    currentStepIndex,
    isComplete: tutorialComplete,
    isDismissed: tutorialDismissed,
    advanceStep: handleAdvanceManualStep,
    skipTutorial: handleSkipGuidance,
  } = useTutorialManager({
    design: state.design,
    requirements: state.requirements,
    editingLocked,
    slug: state.slug,
    updateDesign: setDesign,
  });

  // Palette items - just the kinds
  const paletteItems = useMemo(() => allowedKinds, [allowedKinds]);

  // Handlers
  const addNode = useCallback(
    (kind: ComponentKind, position?: { x: number; y: number }) => {
      if (editingLocked) return;
      const nodePosition = position ?? nextPosition(state.design.nodes);
      const uniqueId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newNodes = [
        ...state.design.nodes,
        {
          id: `node-${kind}-${uniqueId}`,
          x: nodePosition.x,
          y: nodePosition.y,
        },
      ];

      setDesign((prev) => ({
        ...prev,
        nodes: newNodes,
      }));

      saveToHistory(newNodes, state.design.edges);
      clearSimulationState();
      track("practice_design_node_added", { slug: state.slug, kind });
    },
    [
      state.design.nodes,
      state.design.edges,
      editingLocked,
      setDesign,
      saveToHistory,
      clearSimulationState,
      state.slug,
    ]
  );

  const handleConnect = useCallback(
    (edge: Edge) => {
      if (editingLocked) return;
      let didChange = false;
      let newEdges: Edge[] = [];

      const uniqueId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      setDesign((prev) => {
        // Check if edge already exists in the same direction (one-directional only)
        const exists = prev.edges.some(
          (existing) => existing.from === edge.from && existing.to === edge.to
        );
        if (exists) {
          return prev;
        }
        didChange = true;
        newEdges = [
          ...prev.edges,
          {
            ...edge,
            id: `edge-${uniqueId}`,
          },
        ];
        return {
          ...prev,
          edges: newEdges,
        };
      });

      if (didChange) {
        saveToHistory(state.design.nodes, newEdges);
        clearSimulationState();
      }
    },
    [editingLocked, setDesign, state.design.nodes, saveToHistory, clearSimulationState]
  );

  const handleDrop = useCallback(
    (kind: string, position: { x: number; y: number }) => {
      addNode(kind as ComponentKind, position);
    },
    [addNode]
  );

  const handleNodesChange = useCallback(
    (nextNodes: PlacedNode[]) => {
      if (editingLocked) return;
      let prunedEdges: Edge[] = [];
      let didChange = false;

      setDesign((prev) => {
        if (nodesEqual(prev.nodes, nextNodes)) {
          return prev;
        }

        didChange = true;
        const edges = pruneEdges(prev.edges, nextNodes);
        prunedEdges = edges;
        return {
          ...prev,
          nodes: nextNodes,
          edges,
        };
      });

      if (didChange) {
        saveToHistory(nextNodes, prunedEdges);
        clearSimulationState();
      }

      setSelectedNodeId((prev) =>
        prev && nextNodes.some((node) => node.id === prev) ? prev : null
      );
      setSelectedEdgeId((prev) =>
        prev && prunedEdges.some((edge) => edge.id === prev) ? prev : null
      );
    },
    [editingLocked, setDesign, saveToHistory, clearSimulationState]
  );

  const handleEdgesChange = useCallback(
    (nextEdges: Edge[]) => {
      if (editingLocked) return;
      let didChange = false;

      setDesign((prev) => {
        if (edgesEqual(prev.edges, nextEdges)) {
          return prev;
        }

        didChange = true;
        return {
          ...prev,
          edges: nextEdges,
        };
      });

      if (didChange) {
        saveToHistory(state.design.nodes, nextEdges);
        clearSimulationState();
      }

      setSelectedEdgeId((prev) =>
        prev && nextEdges.some((edge) => edge.id === prev) ? prev : null
      );
    },
    [editingLocked, setDesign, state.design.nodes, saveToHistory, clearSimulationState]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (editingLocked) return;
      let prunedEdges: Edge[] = [];
      let newNodes: PlacedNode[] = [];

      setDesign((prev) => {
        const nodes = prev.nodes.filter((node) => node.id !== nodeId);
        const edges = pruneEdges(prev.edges, nodes);
        prunedEdges = edges;
        newNodes = nodes;
        return { ...prev, nodes, edges };
      });

      saveToHistory(newNodes, prunedEdges);
      clearSimulationState();

      setSelectedNodeId((prev) => (prev === nodeId ? null : prev));
      setSelectedEdgeId((prev) =>
        prev && prunedEdges.some((edge) => edge.id === prev) ? prev : null
      );
    },
    [editingLocked, setDesign, saveToHistory, clearSimulationState]
  );

  const handleUpdateReplicas = useCallback(
    (nodeId: string, replicas: number) => {
      if (editingLocked) return;
      let newNodes: PlacedNode[] = [];

      setDesign((prev) => {
        newNodes = prev.nodes.map((node) => (node.id === nodeId ? { ...node, replicas } : node));
        return {
          ...prev,
          nodes: newNodes,
        };
      });

      saveToHistory(newNodes, state.design.edges);
      clearSimulationState();

      track("practice_design_node_replicas_changed", {
        slug: state.slug,
        nodeId,
        replicas,
      });
    },
    [editingLocked, setDesign, state.design.edges, saveToHistory, clearSimulationState, state.slug]
  );

  const handleRenameNode = useCallback(
    (nodeId: string, newLabel: string) => {
      if (editingLocked) return;
      setDesign((prev) => ({
        ...prev,
        nodes: prev.nodes.map((node) =>
          node.id === nodeId ? { ...node, customLabel: newLabel } : node
        ),
      }));

      track("practice_design_node_renamed", { slug: state.slug, nodeId, newLabel });
    },
    [editingLocked, setDesign, state.slug]
  );

  const handleEdgeSelect = useCallback((edgeId: string | null) => {
    setSelectedEdgeId(edgeId);
    if (edgeId) {
      setSelectedNodeId(null);
    }
  }, []);

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId) {
      setSelectedEdgeId(null);
    }
  }, []);

  const handleNodeTouchStart = useCallback(
    (nodeId: string) => {
      if (editingLocked) return;
      setSelectedNodeId(nodeId);
      setSelectedEdgeId(null);
    },
    [editingLocked]
  );

  const handleNodeTouchEnd = useCallback(() => {
    // Touch end currently unused
  }, []);

  const handleDeleteSelection = useCallback(() => {
    if (editingLocked) return;
    if (selectedEdgeId) {
      let newEdges: Edge[] = [];

      setDesign((prev) => {
        newEdges = prev.edges.filter((edge) => edge.id !== selectedEdgeId);
        return {
          ...prev,
          edges: newEdges,
        };
      });

      saveToHistory(state.design.nodes, newEdges);
      clearSimulationState();
      setSelectedEdgeId(null);
      return;
    }
    if (selectedNodeId) {
      let prunedEdges: Edge[] = [];
      let newNodes: PlacedNode[] = [];

      setDesign((prev) => {
        const nodes = prev.nodes.filter((node) => node.id !== selectedNodeId);
        const edges = pruneEdges(prev.edges, nodes);
        prunedEdges = edges;
        newNodes = nodes;
        return { ...prev, nodes, edges };
      });

      saveToHistory(newNodes, prunedEdges);
      clearSimulationState();

      setSelectedNodeId(null);
      setSelectedEdgeId((prev) =>
        prev && prunedEdges.some((edge) => edge.id === prev) ? prev : null
      );
    }
  }, [
    editingLocked,
    selectedEdgeId,
    selectedNodeId,
    setDesign,
    state.design.nodes,
    saveToHistory,
    clearSimulationState,
  ]);

  // Feature validation states
  // TODO: These checks need to be reimplemented without spec.kind
  const cacheOnPath = false;

  const canContinue = !editingLocked && state.completed.highLevelDesign;

  // Convert user's design to components format and create adjacency list
  const designComponents = useMemo(
    () => designToComponents(state.design.nodes, state.design.edges),
    [state.design.nodes, state.design.edges]
  );
  const userAdjacencyList = useAdjacencyList(designComponents);

  return {
    design: state.design,
    editingLocked,
    lockMessage,
    selectedNodeId,
    selectedEdgeId,
    paletteItems,
    onAddNode: addNode,
    onConnect: handleConnect,
    onDrop: handleDrop,
    onNodesChange: handleNodesChange,
    onEdgesChange: handleEdgesChange,
    onDeleteNode: handleDeleteNode,
    onRenameNode: handleRenameNode,
    onUpdateReplicas: handleUpdateReplicas,
    onNodeTouchStart: handleNodeTouchStart,
    onNodeTouchEnd: handleNodeTouchEnd,
    onEdgeSelect: handleEdgeSelect,
    onNodeSelect: handleNodeSelect,
    onDeleteSelection: handleDeleteSelection,
    currentStep,
    stepCount,
    currentStepIndex,
    tutorialComplete,
    tutorialDismissed,
    onAdvanceStep: handleAdvanceManualStep,
    onSkipTutorial: handleSkipGuidance,
    cacheOnPath,
    canContinue,
    userAdjacencyList,
  };
}
