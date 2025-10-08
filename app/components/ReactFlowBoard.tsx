"use client";
import React from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { PlacedNode, Edge, SystemDesignNode, SystemDesignEdge } from "./types";
import { placedNodeToReactFlowNode, edgeToReactFlowEdge, reactFlowEdgeToEdge } from "./types";
import SystemDesignNodeComponent from "./SystemDesignNode";

const nodeTypes = {
  systemDesignNode: SystemDesignNodeComponent,
};

interface ReactFlowBoardProps {
  nodes: PlacedNode[];
  edges: Edge[];
  onConnect?: (edge: Edge) => void;
  onDrop?: (kind: string, position: { x: number; y: number }) => void;
}

// Inner component that uses React Flow hooks
function ReactFlowBoardInner({ nodes, edges, onConnect, onDrop }: ReactFlowBoardProps) {
  // Initialize React Flow state from props
  const [rfNodes, setRfNodes, onRfNodesChange] = useNodesState<SystemDesignNode>([]);
  const [rfEdges, setRfEdges, onRfEdgesChange] = useEdgesState<SystemDesignEdge>([]);

  // Get React Flow instance for viewport controls
  const reactFlowInstance = useReactFlow();


  // Update state when props change (but preserve existing positions)
  React.useEffect(() => {
    setRfNodes(currentNodes => {
      const currentNodeMap = new Map(currentNodes.map(node => [node.id, node]));

      // Create new nodes, preserving positions of existing ones
      const newRfNodes = nodes.map(node => {
        const existingNode = currentNodeMap.get(node.id);
        if (existingNode) {
          // Preserve existing position
          return existingNode;
        } else {
          // New node, calculate position
          return placedNodeToReactFlowNode(node);
        }
      });

      return newRfNodes;
    });

    const newRfEdges = edges.map(edgeToReactFlowEdge);
    setRfEdges(newRfEdges);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]); // Update when props change

  // Handle connections
  const handleConnect = React.useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;

    const newEdge: SystemDesignEdge = {
      id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle || undefined,
      targetHandle: connection.targetHandle || undefined,
      data: { linkLatencyMs: 10 },
    };

    setRfEdges((eds) => addEdge(newEdge, eds));

    // Notify parent of the new edge
    if (onConnect) {
      const placedEdge: Edge = reactFlowEdgeToEdge(newEdge);
      onConnect(placedEdge);
    }

  }, [setRfEdges, onConnect]);

  // Handle node changes (position updates, deletions, etc.)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleNodesChange = React.useCallback((changes: any[]) => {
    onRfNodesChange(changes);
  }, [onRfNodesChange]);

  // Handle edge changes (deletions, etc.)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEdgesChange = React.useCallback((changes: any[]) => {
    onRfEdgesChange(changes);
  }, [onRfEdgesChange]);

  const handleDrop = React.useCallback((event: React.DragEvent) => {
    event.preventDefault();

    if (!onDrop) return;

    const kind = event.dataTransfer.getData("application/x-sds-kind") ||
                 event.dataTransfer.getData("text/plain");

    if (!kind) return;

    // Get the drop position relative to the React Flow viewport
    const reactFlowBounds = event.currentTarget.getBoundingClientRect();
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

    onDrop(kind, position);
  }, [onDrop, reactFlowInstance]);

  const handleDragOver = React.useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', paddingBottom: '80px' }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        fitView
        deleteKeyCode="Delete"
        connectionLineStyle={{ strokeWidth: 2, stroke: '#10b981' }}
        defaultEdgeOptions={{
          type: 'bezier',
          style: { strokeWidth: 2, stroke: '#10b981' },
          animated: false,
        }}
      >
        <Background />
        <Controls
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '8px',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '8px 12px',
            backdropFilter: 'blur(8px)',
          }}
          showZoom={true}
          showFitView={true}
          showInteractive={false}
          position="bottom-center"
        />
        <MiniMap
          nodeColor="#10b981"
          maskColor="rgba(0, 0, 0, 0.2)"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        />
      </ReactFlow>
    </div>
  );
}

// Main component wrapped with ReactFlowProvider
function ReactFlowBoard(props: ReactFlowBoardProps) {
  return (
    <ReactFlowProvider>
      <ReactFlowBoardInner {...props} />
    </ReactFlowProvider>
  );
}

export default ReactFlowBoard;
