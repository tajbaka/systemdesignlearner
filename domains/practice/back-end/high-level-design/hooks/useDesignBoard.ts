"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import type { ComponentType, ComponentName, PlacedNode, Edge } from "../types";
import type { BoardNode, BoardEdge } from "../components/design-board/types";
import type { PaletteListItem } from "../components/design-board/DesignBoardList";
import { getIcon } from "../DesignBoardIcons";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

type UseDesignBoardProps = {
  isReadOnly?: boolean;
  nodes: PlacedNode[];
  edges: Edge[];
  onDiagramChange: (nodes: PlacedNode[], edges: Edge[]) => void;
  solutionNodes?: Array<{ id: string; type: string; name: string; icon: string }>;
};

export function useDesignBoard({
  isReadOnly = false,
  nodes,
  edges,
  onDiagramChange,
  solutionNodes,
}: UseDesignBoardProps) {
  // State for palette open/close
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Track spawn offset for click-to-add (so nodes don't stack on top of each other)
  const spawnOffsetRef = useRef(0);

  // Build type-to-name and type-to-icon maps from solution nodes
  const { typeToNameMap, typeToIconMap } = useMemo(() => {
    const nameMap = new Map<string, string>();
    const iconMap = new Map<string, string>();
    if (solutionNodes) {
      solutionNodes.forEach((node) => {
        if (!nameMap.has(node.type)) {
          nameMap.set(node.type, node.name);
          iconMap.set(node.type, node.icon);
        }
      });
    }
    return { typeToNameMap: nameMap, typeToIconMap: iconMap };
  }, [solutionNodes]);

  // Keyboard shortcuts hook for copy/paste/undo
  const { saveToHistory } = useKeyboardShortcuts({
    nodes,
    edges,
    selectedNodeId,
    onDiagramChange,
    isReadOnly,
    typeToNameMap,
  });

  // Build palette items from solution nodes
  // Extract unique types and use their names and icons directly
  const paletteItems: PaletteListItem[] = useMemo(() => {
    if (!solutionNodes || solutionNodes.length === 0) {
      return [];
    }

    // Get unique types from solution nodes with their names and icons
    const typeMap = new Map<string, { name: string; icon: string }>();
    solutionNodes.forEach((node) => {
      if (!typeMap.has(node.type)) {
        typeMap.set(node.type, { name: node.name, icon: node.icon });
      }
    });

    return Array.from(typeMap.entries()).map(([type, { name, icon }]) => ({
      id: type,
      name,
      icon: getIcon(icon),
    }));
  }, [solutionNodes]);

  // Conversion functions at the boundary between business logic and generic board types
  const toBoardNode = useCallback(
    (node: PlacedNode): BoardNode => {
      const iconId = typeToIconMap.get(node.type) || "service";
      return {
        id: node.id,
        type: node.type,
        name: node.name,
        x: node.x,
        y: node.y,
        icon: getIcon(iconId),
      };
    },
    [typeToIconMap]
  );

  const toPlacedNode = useCallback((node: BoardNode): PlacedNode => {
    // When converting back, preserve the ComponentType and name
    return {
      id: node.id,
      type: node.type as ComponentType,
      name: node.name as ComponentName | undefined,
      x: node.x,
      y: node.y,
    };
  }, []);

  const toBoardEdge = useCallback((edge: Edge): BoardEdge => {
    return {
      id: edge.id,
      from: edge.from,
      to: edge.to,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    };
  }, []);

  const toEdge = useCallback((edge: BoardEdge): Edge => {
    return {
      id: edge.id,
      from: edge.from,
      to: edge.to,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    };
  }, []);

  // Handler for adding nodes
  const handleAddNode = useCallback(
    (type: ComponentType, position?: { x: number; y: number }): string | undefined => {
      if (isReadOnly) return undefined;
      saveToHistory();
      const nodeId = `node-${type}-${Date.now()}`;

      // If no position provided (click spawn), place to the right of existing diagram
      let x = position?.x;
      let y = position?.y;
      if (x === undefined || y === undefined) {
        // Constants for node dimensions and spacing
        const NODE_WIDTH = 190;
        const HORIZONTAL_SPACING = 150;
        const DEFAULT_Y = 200;
        const VERTICAL_OFFSET = 30;

        if (nodes.length === 0) {
          // First node: center it in view
          x = 400;
          y = DEFAULT_Y;
        } else {
          // Find the rightmost node position
          const rightmostX = Math.max(...nodes.map((node) => node.x));

          // Place new node to the right with spacing
          x = rightmostX + NODE_WIDTH + HORIZONTAL_SPACING;

          // Use staggered Y positions to avoid exact overlap if multiple nodes added
          const offset = spawnOffsetRef.current * VERTICAL_OFFSET;
          y = DEFAULT_Y + offset;
          spawnOffsetRef.current = (spawnOffsetRef.current + 1) % 5; // Reset after 5
        }
      }

      const newNode: PlacedNode = {
        id: nodeId,
        type: type,
        name: typeToNameMap.get(type) || type, // Use name from solution nodes
        x,
        y,
      };
      onDiagramChange([...nodes, newNode], edges);
      return nodeId;
    },
    [isReadOnly, nodes, edges, onDiagramChange, saveToHistory, typeToNameMap]
  );

  // Handlers for design interactions - wrapper functions that convert at the boundary
  const handleConnect = useCallback(
    (boardEdge: BoardEdge) => {
      if (isReadOnly) return;
      saveToHistory();
      const edge = toEdge(boardEdge);
      onDiagramChange(nodes, [...edges, edge]);
    },
    [isReadOnly, toEdge, nodes, edges, onDiagramChange, saveToHistory]
  );

  const handleDrop = useCallback(
    (type: string, position: { x: number; y: number }): string | undefined => {
      if (isReadOnly) return undefined;
      return handleAddNode(type as ComponentType, position);
    },
    [isReadOnly, handleAddNode]
  );

  const handleNodesChange = useCallback(
    (updatedBoardNodes: BoardNode[]) => {
      if (isReadOnly) return;
      // Don't save to history for node movements (only for add/delete)
      const updatedNodes = updatedBoardNodes.map(toPlacedNode);
      onDiagramChange(updatedNodes, edges);
    },
    [isReadOnly, toPlacedNode, edges, onDiagramChange]
  );

  const handleEdgesChange = useCallback(
    (updatedBoardEdges: BoardEdge[]) => {
      if (isReadOnly) return;
      saveToHistory();
      const updatedEdges = updatedBoardEdges.map(toEdge);
      onDiagramChange(nodes, updatedEdges);
    },
    [isReadOnly, toEdge, nodes, onDiagramChange, saveToHistory]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (isReadOnly) return;
      saveToHistory();
      const updatedNodes = nodes.filter((node) => node.id !== nodeId);
      const updatedEdges = edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId);
      onDiagramChange(updatedNodes, updatedEdges);
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      }
    },
    [isReadOnly, nodes, edges, onDiagramChange, selectedNodeId, saveToHistory]
  );

  const handleEdgeSelect = useCallback((edgeId: string | null) => {
    setSelectedEdgeId(edgeId);
  }, []);

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      if (isReadOnly) return;
      saveToHistory();

      // Find edge to delete
      const edgeToDelete = edges.find((edge) => edge.id === edgeId);

      if (!edgeToDelete) {
        console.warn("Edge not found for deletion:", edgeId);
        return;
      }

      // Remove edge by matching ID or source/target/handles
      const updatedEdges = edges.filter((edge) => {
        // Match by ID
        if (edge.id === edgeId) return false;

        // Also match by source/target/handles in case ID format changed
        if (
          edge.from === edgeToDelete.from &&
          edge.to === edgeToDelete.to &&
          edge.sourceHandle === edgeToDelete.sourceHandle &&
          edge.targetHandle === edgeToDelete.targetHandle
        ) {
          return false;
        }

        return true;
      });

      onDiagramChange(nodes, updatedEdges);
      if (selectedEdgeId === edgeId) {
        setSelectedEdgeId(null);
      }
    },
    [isReadOnly, nodes, edges, onDiagramChange, selectedEdgeId, saveToHistory]
  );

  const handleRenameNode = useCallback(
    (nodeId: string, newName: string) => {
      if (isReadOnly) return;
      // Don't update if name is empty or unchanged
      const node = nodes.find((n) => n.id === nodeId);
      const trimmedName = newName.trim().slice(0, 20); // Limit to 20 characters
      if (!node || !trimmedName || node.name === trimmedName) return;

      saveToHistory();
      const updatedNodes = nodes.map((n) =>
        n.id === nodeId ? { ...n, name: trimmedName as ComponentName } : n
      );
      onDiagramChange(updatedNodes, edges);
    },
    [isReadOnly, nodes, edges, onDiagramChange, saveToHistory]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleSpawn = useCallback(
    (type: string): string | undefined => {
      if (isReadOnly) return undefined;
      return handleAddNode(type as ComponentType);
    },
    [isReadOnly, handleAddNode]
  );

  // Convert nodes and edges to board format
  const boardNodes = useMemo(() => nodes.map(toBoardNode), [nodes, toBoardNode]);
  const boardEdges = useMemo(() => edges.map(toBoardEdge), [edges, toBoardEdge]);

  return {
    // State
    boardNodes,
    boardEdges,
    selectedNodeId,
    setSelectedNodeId,
    selectedEdgeId,
    mobilePaletteOpen,
    setMobilePaletteOpen,
    paletteItems,
    isReadOnly,
    // Handlers
    handleConnect,
    handleDrop,
    handleNodesChange,
    handleEdgesChange,
    handleDeleteNode,
    handleDeleteEdge,
    handleRenameNode,
    handleDragOver,
    handleSpawn,
    handleEdgeSelect,
    // Conversion functions (exposed if needed)
    toBoardNode,
    toPlacedNode,
    toBoardEdge,
    toEdge,
  };
}
