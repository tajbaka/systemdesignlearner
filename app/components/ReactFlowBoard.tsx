"use client";
import React, { useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
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
import { placedNodeToReactFlowNode, edgeToReactFlowEdge, reactFlowEdgeToEdge, reactFlowNodeToPlacedNode } from "./types";
import SystemDesignNodeComponent from "./SystemDesignNode";
import BidirectionalEdge from "./BidirectionalEdge";

const nodeTypes = {
  systemDesignNode: SystemDesignNodeComponent,
};

const edgeTypes = {
  bidirectional: BidirectionalEdge,
};

interface ReactFlowBoardProps {
  nodes: PlacedNode[];
  edges: Edge[];
  onConnect?: (edge: Edge) => void;
  onDrop?: (kind: string, position: { x: number; y: number }) => void;
  onNodesChange?: (nodes: PlacedNode[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  onDeleteNode?: (nodeId: string) => void;
  onNodeTouchStart?: (nodeId: string) => void;
  onNodeTouchEnd?: () => void;
  onRenameNode?: (nodeId: string, newLabel: string) => void;
  className?: string;
  style?: React.CSSProperties;
  showMiniMap?: boolean;
}

// Inner component that uses React Flow hooks
function ReactFlowBoardInner({ nodes, edges, onConnect, onDrop, onNodesChange, onEdgesChange, onDeleteNode, onNodeTouchStart, onNodeTouchEnd, onRenameNode, className, style, showMiniMap = true }: ReactFlowBoardProps) {
  // Initialize React Flow state from props
  const [rfNodes, setRfNodes, onRfNodesChange] = useNodesState<SystemDesignNode>([]);
  const [rfEdges, setRfEdges, onRfEdgesChange] = useEdgesState<SystemDesignEdge>([]);

  // Track last notified state to avoid unnecessary updates
  const lastNotifiedNodes = React.useRef<PlacedNode[]>([]);
  const lastNotifiedEdges = React.useRef<Edge[]>([]);

  // Refs to get current React Flow state
  const rfNodesRef = React.useRef<SystemDesignNode[]>([]);
  const rfEdgesRef = React.useRef<SystemDesignEdge[]>([]);

  // Update refs when state changes
  React.useEffect(() => {
    rfNodesRef.current = rfNodes;
  }, [rfNodes]);

  React.useEffect(() => {
    rfEdgesRef.current = rfEdges;
  }, [rfEdges]);

  // Get React Flow instance for viewport controls
  const reactFlowInstance = useReactFlow();

  // Memoize node data to prevent unnecessary re-renders
  const nodeData = useMemo(() => ({
    onDelete: onDeleteNode,
    onNodeTouchStart,
    onNodeTouchEnd,
    onRename: onRenameNode,
  }), [onDeleteNode, onNodeTouchStart, onNodeTouchEnd, onRenameNode]);


  // Update state when props change (but preserve existing positions)
  React.useEffect(() => {
    setRfNodes(currentNodes => {
      const currentNodeMap = new Map(currentNodes.map(node => [node.id, node]));

      // Create new nodes, preserving positions of existing ones
      const newRfNodes = nodes.map(node => {
        const existingNode = currentNodeMap.get(node.id);
        if (existingNode) {
          return {
            ...existingNode,
            data: {
              ...existingNode.data,
              ...nodeData,
              customLabel: node.customLabel,
              spec: node.spec,
              replicas: node.replicas || 1,
            }
          };
        } else {
          // New node, calculate position
          const rfNode = placedNodeToReactFlowNode(node);
          return {
            ...rfNode,
            data: {
              ...rfNode.data,
              ...nodeData,
            }
          };
        }
      });

      return newRfNodes;
    });

    setRfEdges(edges.map(edgeToReactFlowEdge));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, onDeleteNode, onRenameNode, nodeData]); // Update when props change

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

    // Ensure parent state is updated with current React Flow state
    setTimeout(() => {
      if (onEdgesChange) {
        const currentEdges = rfEdgesRef.current.map(reactFlowEdgeToEdge);
        onEdgesChange(currentEdges);
      }
    }, 10);

  }, [setRfEdges, onConnect, onEdgesChange]);

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

  // Notify parent when React Flow nodes change (debounced)
  React.useEffect(() => {
    if (onNodesChange) {
      const updatedNodes = rfNodes.map(reactFlowNodeToPlacedNode);
      // Only notify if the nodes have actually changed
      const hasChanged = updatedNodes.length !== lastNotifiedNodes.current.length ||
        updatedNodes.some((node, index) => {
          const lastNode = lastNotifiedNodes.current[index];
          return !lastNode ||
                 lastNode.id !== node.id ||
                 Math.abs(lastNode.x - node.x) > 1 || // Allow small position differences
                 Math.abs(lastNode.y - node.y) > 1;
        });

      if (hasChanged) {
        lastNotifiedNodes.current = updatedNodes;
        // Use requestAnimationFrame for better performance
        requestAnimationFrame(() => onNodesChange(updatedNodes));
      }
    }
  }, [rfNodes, onNodesChange]);

  // Notify parent when React Flow edges change
  React.useEffect(() => {
    if (onEdgesChange) {
      const updatedEdges = rfEdges.map(reactFlowEdgeToEdge);
      // Only notify if the edges have actually changed
      const hasChanged = updatedEdges.length !== lastNotifiedEdges.current.length ||
        updatedEdges.some((edge, index) => {
          const lastEdge = lastNotifiedEdges.current[index];
          return !lastEdge ||
                 lastEdge.id !== edge.id ||
                 lastEdge.from !== edge.from ||
                 lastEdge.to !== edge.to;
        });

      if (hasChanged) {
        lastNotifiedEdges.current = updatedEdges;
        // Use requestAnimationFrame for better performance
        requestAnimationFrame(() => onEdgesChange(updatedEdges));
      }
    }
  }, [rfEdges, onEdgesChange]);

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

    // After dropping, ensure the parent state is updated with current React Flow state
    setTimeout(() => {
      if (onNodesChange) {
        const currentNodes = rfNodesRef.current.map(reactFlowNodeToPlacedNode);
        onNodesChange(currentNodes);
      }
      if (onEdgesChange) {
        const currentEdges = rfEdgesRef.current.map(reactFlowEdgeToEdge);
        onEdgesChange(currentEdges);
      }
    }, 10);
  }, [onDrop, reactFlowInstance, onNodesChange, onEdgesChange]);

  const handleDragOver = React.useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  return (
    <div className={className} style={{ width: '100%', height: '100%', ...style }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        fitView
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Meta"
        connectionLineStyle={{ strokeWidth: 2, stroke: '#10b981', strokeDasharray: '5,5' }}
        defaultEdgeOptions={{
          type: 'bidirectional',
          animated: false,
          // Optimize smoothstep performance
          data: { borderRadius: 8 },
        }}
        // Performance optimizations
        panOnDrag={true}
        selectionOnDrag={false}
        zoomOnPinch={true}
        zoomOnScroll={false}
        preventScrolling={true}
        // Reduce re-renders
        onlyRenderVisibleElements={true}
        elementsSelectable={true}
        nodesConnectable={true}
        nodesDraggable={true}
        // Disable expensive features on mobile
        elevateEdgesOnSelect={false}
        elevateNodesOnSelect={false}
        // Remove React Flow attribution
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={15}
          size={1.5}
          color="#cccccc"
        />
        <Controls
          style={{
            display: 'none', // Forcefully hide on mobile
          }}
          showZoom={true}
          showFitView={true}
          showInteractive={false}
          position="bottom-center"
          className="lg:flex lg:relative" // Show on desktop with proper positioning
        />
        {showMiniMap && (
          <MiniMap
            nodeColor="#10b981"
            maskColor="rgba(0, 0, 0, 0.2)"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
            className="hidden lg:block" // Hide on mobile, show on desktop
          />
        )}
      </ReactFlow>
    </div>
  );
}

// Main component wrapped with ReactFlowProvider
function ReactFlowBoard({ className, style, onNodeTouchStart, onNodeTouchEnd, onRenameNode, ...props }: ReactFlowBoardProps) {
  return (
    <ReactFlowProvider>
      <ReactFlowBoardInner
        className={className}
        style={style}
        onNodeTouchStart={onNodeTouchStart}
        onNodeTouchEnd={onNodeTouchEnd}
        onRenameNode={onRenameNode}
        {...props}
      />
    </ReactFlowProvider>
  );
}

export default ReactFlowBoard;
