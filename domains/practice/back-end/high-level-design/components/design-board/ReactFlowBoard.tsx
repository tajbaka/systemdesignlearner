"use client";
import React, { useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  Connection,
  NodeChange,
  EdgeChange,
  ConnectionLineType,
  ConnectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { BoardNode, BoardEdge, DesignNode, SystemDesignEdge } from "./types";
import {
  boardNodeToReactFlowNode,
  boardEdgeToReactFlowEdge,
  reactFlowEdgeToBoardEdge,
  reactFlowNodeToBoardNode,
} from "./types";
import DesignNodeComponent from "./DesignNode";
import BidirectionalEdge from "./BidirectionalEdge";
import UnidirectionalEdge from "./UnidirectionalEdge";
import { isMobile } from "./utils";

// Utility function to calculate the best handle positions based on node positions
const calculateOptimalHandles = (
  sourceNode: DesignNode,
  targetNode: DesignNode
): { sourceHandle: string; targetHandle: string } => {
  // Calculate center positions of nodes
  const sourceX = sourceNode.position.x + 95; // 190/2 = 95 (node width center)
  const sourceY = sourceNode.position.y + 45; // 90/2 = 45 (node height center)
  const targetX = targetNode.position.x + 95;
  const targetY = targetNode.position.y + 45;

  // Calculate the angle from source to target
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Determine source handle based on angle (where to exit from)
  let sourceHandle: string;
  if (angle >= -45 && angle < 45) {
    sourceHandle = "right";
  } else if (angle >= 45 && angle < 135) {
    sourceHandle = "bottom";
  } else if (angle >= 135 || angle < -135) {
    sourceHandle = "left";
  } else {
    sourceHandle = "top";
  }

  // Determine target handle (opposite direction - where to enter)
  let targetHandle: string;
  if (angle >= -45 && angle < 45) {
    targetHandle = "left"; // Coming from left, enter on left
  } else if (angle >= 45 && angle < 135) {
    targetHandle = "top"; // Coming from top, enter on top
  } else if (angle >= 135 || angle < -135) {
    targetHandle = "right"; // Coming from right, enter on right
  } else {
    targetHandle = "bottom"; // Coming from bottom, enter on bottom
  }

  return { sourceHandle, targetHandle };
};

const nodeTypes = {
  designNode: DesignNodeComponent,
};

const edgeTypes = {
  bidirectional: BidirectionalEdge,
  default: UnidirectionalEdge,
  "one-directional": UnidirectionalEdge,
};

export interface ReactFlowBoardRef {
  screenToFlowPosition: (
    clientX: number,
    clientY: number,
    containerRect: DOMRect
  ) => { x: number; y: number };
  panToNode: (nodeId: string, options?: { offsetY?: number }) => void;
}

interface ReactFlowBoardProps {
  nodes: BoardNode[];
  edges: BoardEdge[];
  onConnect?: (edge: BoardEdge) => void;
  onNodesChange?: (nodes: BoardNode[]) => void;
  onEdgesChange?: (edges: BoardEdge[]) => void;
  onDeleteNode?: (nodeId: string) => void;
  onDeleteEdge?: (edgeId: string) => void;
  onNodeTouchStart?: (nodeId: string) => void;
  onNodeTouchEnd?: () => void;
  onRenameNode?: (nodeId: string, newLabel: string) => void;
  onUpdateReplicas?: (nodeId: string, replicas: number) => void;
  onEdgeSelect?: (edgeId: string | null) => void;
  onNodeSelect?: (nodeId: string | null) => void;
  className?: string;
  style?: React.CSSProperties;
  showMiniMap?: boolean;
  miniMapBottomOffset?: number;
}

// Inner component that uses React Flow hooks
const ReactFlowBoardInner = React.forwardRef<ReactFlowBoardRef, ReactFlowBoardProps>(
  function ReactFlowBoardInner(
    {
      nodes,
      edges,
      onConnect,
      onNodesChange,
      onEdgesChange,
      onDeleteNode,
      onDeleteEdge,
      onNodeTouchStart,
      onNodeTouchEnd,
      onRenameNode,
      onUpdateReplicas,
      onEdgeSelect,
      onNodeSelect,
      className,
      style,
      showMiniMap = true,
      miniMapBottomOffset = 10,
    },
    ref
  ) {
    // Initialize React Flow state from props
    const [rfNodes, setRfNodes, onRfNodesChange] = useNodesState<DesignNode>([]);
    const [rfEdges, setRfEdges, onRfEdgesChange] = useEdgesState<SystemDesignEdge>([]);

    // Track last notified state to avoid unnecessary updates
    const lastNotifiedNodes = React.useRef<BoardNode[]>([]);
    const lastNotifiedEdges = React.useRef<BoardEdge[]>([]);

    // Refs to get current React Flow state
    const rfNodesRef = React.useRef<DesignNode[]>([]);
    const rfEdgesRef = React.useRef<SystemDesignEdge[]>([]);

    // Track actual drag direction (where user started vs ended)
    const dragStartNode = React.useRef<string | null>(null);
    const dragStartHandle = React.useRef<string | null>(null);

    // Update refs when state changes
    React.useEffect(() => {
      rfNodesRef.current = rfNodes;
    }, [rfNodes]);

    React.useEffect(() => {
      rfEdgesRef.current = rfEdges;
    }, [rfEdges]);

    // Get React Flow instance for viewport controls
    const reactFlowInstance = useReactFlow();

    // Track if initial pan has happened
    const hasInitialPanned = React.useRef(false);

    // On mobile, pan to first node after initial load
    React.useEffect(() => {
      if (hasInitialPanned.current) return;

      if (isMobile() && rfNodes.length > 0) {
        // Wait for ReactFlow to finish initial render
        setTimeout(() => {
          const firstNode = rfNodes[0];
          if (firstNode) {
            reactFlowInstance.setCenter(firstNode.position.x + 95, firstNode.position.y, {
              zoom: reactFlowInstance.getZoom(),
              duration: 800,
            });
            hasInitialPanned.current = true;
          }
        }, 500);
      }
    }, [rfNodes, reactFlowInstance]);

    // Expose screenToFlowPosition and panToNode for parent component
    React.useImperativeHandle(
      ref,
      () => ({
        screenToFlowPosition: (clientX: number, clientY: number, containerRect: DOMRect) => {
          const x = clientX - containerRect.left;
          const y = clientY - containerRect.top;
          const { x: viewX, y: viewY, zoom } = reactFlowInstance.getViewport();
          return {
            x: (x - viewX) / zoom,
            y: (y - viewY) / zoom,
          };
        },
        panToNode: (nodeId: string, options?: { offsetY?: number }) => {
          const node = rfNodesRef.current.find((n) => n.id === nodeId);
          if (node) {
            const nodeX = node.position.x + 95; // Center of node (node width offset)
            const nodeY = node.position.y + 45; // Center of node (node height offset)

            // Apply Y offset if provided (useful for mobile to avoid palette)
            const offsetY = options?.offsetY || 0;

            // Pan to center the node with smooth animation
            reactFlowInstance.setCenter(nodeX, nodeY + offsetY, {
              zoom: reactFlowInstance.getZoom(),
              duration: 500,
            });
          }
        },
      }),
      [reactFlowInstance]
    );

    // Memoize node data to prevent unnecessary re-renders
    const nodeData = useMemo(
      () => ({
        onDelete: onDeleteNode,
        onNodeTouchStart,
        onNodeTouchEnd,
        onRename: onRenameNode,
        onUpdateReplicas,
      }),
      [onDeleteNode, onNodeTouchStart, onNodeTouchEnd, onRenameNode, onUpdateReplicas]
    );

    // Update state when props change (but preserve existing positions)
    React.useEffect(() => {
      setRfNodes((currentNodes) => {
        const currentNodeMap = new Map(currentNodes.map((node) => [node.id, node]));

        // Create new nodes, preserving positions of existing ones
        const newRfNodes = nodes.map((node) => {
          const existingNode = currentNodeMap.get(node.id);
          const rfNode = boardNodeToReactFlowNode(node);
          if (existingNode) {
            return {
              ...existingNode,
              data: {
                ...existingNode.data,
                // Update core data from props (name, type, icon may have changed)
                type: rfNode.data.type,
                name: rfNode.data.name,
                icon: rfNode.data.icon,
                ...nodeData,
              },
            };
          } else {
            return {
              ...rfNode,
              data: {
                ...rfNode.data,
                ...nodeData,
              },
            };
          }
        });

        return newRfNodes;
      });

      // Build a map of current edges to preserve selection state
      const currentEdgeMap = new Map(rfEdgesRef.current.map((edge) => [edge.id, edge]));

      // Create new edges array from parent state (this automatically removes deleted edges)
      const updatedEdges = edges.map((edge) => {
        const existingEdge = currentEdgeMap.get(edge.id);
        const rfEdge = boardEdgeToReactFlowEdge(edge);

        // Calculate optimal handles based on current node positions
        const sourceNode = rfNodesRef.current.find((n) => n.id === rfEdge.source);
        const targetNode = rfNodesRef.current.find((n) => n.id === rfEdge.target);

        if (sourceNode && targetNode) {
          const { sourceHandle, targetHandle } = calculateOptimalHandles(sourceNode, targetNode);
          rfEdge.sourceHandle = sourceHandle;
          rfEdge.targetHandle = targetHandle;
        }

        // Preserve selected state from existing edge
        if (existingEdge?.selected) {
          rfEdge.selected = true;
        }

        // Add onDeleteEdge to edge data
        rfEdge.data = {
          ...rfEdge.data,
          onDelete: onDeleteEdge,
          edgeInfo: {
            from: edge.from,
            to: edge.to,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
          },
        };

        return rfEdge;
      });

      // Directly set the edges (don't use functional update to avoid stale closures)
      setRfEdges(updatedEdges);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes, edges, onDeleteNode, onDeleteEdge, onRenameNode, nodeData]); // Update when props change

    // Track where user starts dragging from (node and handle)
    const handleConnectStart = React.useCallback(
      (
        _event: MouseEvent | TouchEvent,
        { nodeId, handleId }: { nodeId: string | null; handleId?: string | null }
      ) => {
        dragStartNode.current = nodeId;
        dragStartHandle.current = handleId || null;
      },
      []
    );

    // Handle connections
    const handleConnect = React.useCallback(
      (connection: Connection) => {
        if (!connection.source || !connection.target) return;

        // Use the actual drag direction: where user started (dragStartNode) → where they ended (connection.target or source)
        // ReactFlow's source/target are based on handle types, not drag direction
        const actualSource = dragStartNode.current || connection.source;
        const actualTarget =
          dragStartNode.current === connection.source ? connection.target : connection.source;

        // Prevent self-loops (node connecting to itself)
        if (actualSource === actualTarget) {
          dragStartNode.current = null;
          dragStartHandle.current = null;
          return;
        }

        // Find the source and target nodes to calculate optimal handles
        const sourceNode = rfNodesRef.current.find((n) => n.id === actualSource);
        const targetNode = rfNodesRef.current.find((n) => n.id === actualTarget);

        let actualSourceHandle: string | undefined;
        let actualTargetHandle: string | undefined;

        // If we have both nodes, calculate optimal handle positions
        if (sourceNode && targetNode) {
          const optimalHandles = calculateOptimalHandles(sourceNode, targetNode);
          actualSourceHandle = optimalHandles.sourceHandle;
          actualTargetHandle = optimalHandles.targetHandle;
        } else {
          // Fallback to original logic if nodes not found
          const needsSwap = dragStartNode.current && dragStartNode.current !== connection.source;
          actualSourceHandle = needsSwap
            ? connection.targetHandle || undefined
            : dragStartHandle.current || connection.sourceHandle || undefined;
          actualTargetHandle = needsSwap
            ? connection.sourceHandle || undefined
            : connection.targetHandle || undefined;
        }

        // Generate unique edge ID including handles to support multiple connections between same nodes
        const sourceHandlePart = actualSourceHandle ? `-${actualSourceHandle}` : "";
        const targetHandlePart = actualTargetHandle ? `-${actualTargetHandle}` : "";
        const edgeId = `edge-${actualSource}${sourceHandlePart}-${actualTarget}${targetHandlePart}`;

        const newEdge: SystemDesignEdge = {
          id: edgeId,
          source: actualSource,
          target: actualTarget,
          sourceHandle: actualSourceHandle,
          targetHandle: actualTargetHandle,
          data: { linkLatencyMs: 10 },
        };

        // Reset drag tracking
        dragStartNode.current = null;
        dragStartHandle.current = null;

        // Check if edge already exists to prevent duplicates
        setRfEdges((eds) => {
          const edgeExists = eds.some(
            (e) =>
              e.source === actualSource &&
              e.target === actualTarget &&
              e.sourceHandle === actualSourceHandle &&
              e.targetHandle === actualTargetHandle
          );
          if (edgeExists) {
            return eds;
          }
          return addEdge(newEdge, eds);
        });

        // Notify parent of the new edge
        if (onConnect) {
          const boardEdge: BoardEdge = reactFlowEdgeToBoardEdge(newEdge);
          onConnect(boardEdge);
        }

        // Ensure parent state is updated with current React Flow state
        setTimeout(() => {
          if (onEdgesChange) {
            const currentEdges = rfEdgesRef.current.map(reactFlowEdgeToBoardEdge);
            onEdgesChange(currentEdges);
          }
        }, 10);
      },
      [setRfEdges, onConnect, onEdgesChange]
    );

    // Function to recalculate edge handles based on current node positions
    const recalculateEdgeHandles = React.useCallback(() => {
      setRfEdges((currentEdges) => {
        const updatedEdges = currentEdges.map((edge) => {
          const sourceNode = rfNodesRef.current.find((n) => n.id === edge.source);
          const targetNode = rfNodesRef.current.find((n) => n.id === edge.target);

          if (sourceNode && targetNode) {
            const { sourceHandle, targetHandle } = calculateOptimalHandles(sourceNode, targetNode);

            // Only update if handles changed
            if (edge.sourceHandle !== sourceHandle || edge.targetHandle !== targetHandle) {
              return {
                ...edge,
                sourceHandle,
                targetHandle,
              };
            }
          }
          return edge;
        });
        return updatedEdges;
      });
    }, [setRfEdges]);

    // Handle node changes (position updates, deletions, etc.)
    const handleNodesChange = React.useCallback(
      (changes: NodeChange<DesignNode>[]) => {
        onRfNodesChange(changes);

        // Check if any position changes occurred
        const hasPositionChange = changes.some((change) => change.type === "position");

        // Recalculate edge handles after position changes (when drag ends)
        if (hasPositionChange) {
          // Use setTimeout to ensure node positions are updated first
          setTimeout(() => {
            recalculateEdgeHandles();
          }, 0);
        }
      },
      [onRfNodesChange, recalculateEdgeHandles]
    );

    // Handle edge changes (deletions, etc.)
    const handleEdgesChange = React.useCallback(
      (changes: EdgeChange<SystemDesignEdge>[]) => {
        onRfEdgesChange(changes);

        // Notify parent immediately when edges change (for deletions)
        setTimeout(() => {
          if (onEdgesChange) {
            const currentEdges = rfEdgesRef.current.map(reactFlowEdgeToBoardEdge);
            onEdgesChange(currentEdges);
          }
        }, 0);
      },
      [onRfEdgesChange, onEdgesChange]
    );

    // Notify parent when React Flow nodes change (debounced)
    React.useEffect(() => {
      if (onNodesChange) {
        const updatedNodes = rfNodes.map(reactFlowNodeToBoardNode);
        // Only notify if the nodes have actually changed
        const hasChanged =
          updatedNodes.length !== lastNotifiedNodes.current.length ||
          updatedNodes.some((node, index) => {
            const lastNode = lastNotifiedNodes.current[index];
            return (
              !lastNode ||
              lastNode.id !== node.id ||
              Math.abs(lastNode.x - node.x) > 1 || // Allow small position differences
              Math.abs(lastNode.y - node.y) > 1
            );
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
        const updatedEdges = rfEdges.map(reactFlowEdgeToBoardEdge);
        // Only notify if the edges have actually changed
        const hasChanged =
          updatedEdges.length !== lastNotifiedEdges.current.length ||
          updatedEdges.some((edge, index) => {
            const lastEdge = lastNotifiedEdges.current[index];
            return (
              !lastEdge ||
              lastEdge.id !== edge.id ||
              lastEdge.from !== edge.from ||
              lastEdge.to !== edge.to
            );
          });

        if (hasChanged) {
          lastNotifiedEdges.current = updatedEdges;
          // Use requestAnimationFrame for better performance
          requestAnimationFrame(() => onEdgesChange(updatedEdges));
        }
      }
    }, [rfEdges, onEdgesChange]);

    const clearEdgeSelection = React.useCallback(() => {
      setRfEdges((prevEdges) => {
        let didChange = false;
        const nextEdges = prevEdges.map((edge) => {
          if (edge.selected) {
            didChange = true;
            return { ...edge, selected: false };
          }
          return edge;
        });
        return didChange ? nextEdges : prevEdges;
      });
      onEdgeSelect?.(null);
    }, [setRfEdges, onEdgeSelect]);

    const handleEdgeClick = React.useCallback(
      (event: React.MouseEvent, edge: SystemDesignEdge) => {
        event.stopPropagation();
        setRfEdges((prevEdges) => {
          let didChange = false;
          const nextEdges = prevEdges.map((current) => {
            if (current.id === edge.id) {
              if (!current.selected) {
                didChange = true;
                return { ...current, selected: true };
              }
              return current;
            }
            if (current.selected) {
              didChange = true;
              return { ...current, selected: false };
            }
            return current;
          });
          return didChange ? nextEdges : prevEdges;
        });
        onEdgeSelect?.(edge.id);
        onNodeSelect?.(null);
      },
      [setRfEdges, onEdgeSelect, onNodeSelect]
    );

    const handleNodeClick = React.useCallback(
      (_: React.MouseEvent, node: DesignNode) => {
        clearEdgeSelection();

        // Always deselect all other nodes (no multi-select)
        setRfNodes((prevNodes) => {
          let didChange = false;
          const nextNodes = prevNodes.map((n) => {
            if (n.id !== node.id && n.selected) {
              didChange = true;
              return { ...n, selected: false };
            }
            return n;
          });
          return didChange ? nextNodes : prevNodes;
        });

        onNodeSelect?.(node.id);
      },
      [clearEdgeSelection, onNodeSelect, setRfNodes]
    );

    const handlePaneClick = React.useCallback(() => {
      clearEdgeSelection();
      onNodeSelect?.(null);
    }, [clearEdgeSelection, onNodeSelect]);

    const handleNodeDragStart = React.useCallback(
      (_: React.MouseEvent | React.TouchEvent, node: DesignNode) => {
        // Always ensure only this node is selected (no multi-select)
        setRfNodes((prevNodes) => {
          let didChange = false;
          const nextNodes = prevNodes.map((n) => {
            if (n.id !== node.id && n.selected) {
              didChange = true;
              return { ...n, selected: false };
            }
            if (n.id === node.id && !n.selected) {
              didChange = true;
              return { ...n, selected: true };
            }
            return n;
          });
          return didChange ? nextNodes : prevNodes;
        });
      },
      [setRfNodes]
    );

    // Responsive fitView options for better mobile experience
    const isMobileViewport = React.useMemo(() => isMobile(), []);

    const fitViewOptions = React.useMemo(() => {
      return {
        padding: isMobileViewport ? 0.15 : 0.3, // Less padding on mobile for tighter fit
        maxZoom: isMobileViewport ? 3.0 : 0.8, // More zoomed in on mobile (higher = closer)
        minZoom: isMobileViewport ? 0.7 : 0.5, // Higher minimum zoom on mobile
      };
    }, [isMobileViewport]);

    // Set initial viewport with higher zoom on mobile
    const defaultViewport = React.useMemo(() => {
      return {
        x: 0,
        y: 0,
        zoom: isMobileViewport ? 1.5 : 0.6, // Start more zoomed in on mobile
      };
    }, [isMobileViewport]);

    return (
      <div className={className} style={{ width: "100%", height: "100%", ...style }}>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onConnectStart={handleConnectStart}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
          onNodeClick={handleNodeClick}
          onNodeDragStart={handleNodeDragStart}
          defaultViewport={defaultViewport}
          fitView
          fitViewOptions={fitViewOptions}
          minZoom={0.1}
          maxZoom={2}
          deleteKeyCode={onDeleteNode ? ["Delete", "Backspace"] : null}
          multiSelectionKeyCode={null}
          connectionMode={ConnectionMode.Loose}
          connectionRadius={100}
          connectionLineStyle={{ strokeWidth: 2, stroke: "#10b981", strokeDasharray: "5,5" }}
          connectionLineType={ConnectionLineType.Bezier}
          defaultEdgeOptions={{
            type: "one-directional",
            animated: false,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#10b981",
              width: 50,
              height: 20,
            },
            // Optimize smoothstep performance
            data: { borderRadius: 8 },
          }}
          // Performance optimizations
          panOnDrag={true}
          selectionOnDrag={false}
          panOnScroll={false}
          zoomOnPinch={true}
          zoomOnScroll={true}
          preventScrolling={true}
          // Reduce re-renders
          onlyRenderVisibleElements={true}
          elementsSelectable={Boolean(onNodeSelect || onEdgeSelect)}
          nodesConnectable={Boolean(onConnect)}
          nodesDraggable={true}
          // Disable expensive features on mobile
          elevateEdgesOnSelect={false}
          elevateNodesOnSelect={false}
          // Remove React Flow attribution
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={15} size={1.5} color="#cccccc" />
          <Controls
            style={{
              display: "none", // Forcefully hide on mobile
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
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                width: 140,
                height: 140,
                bottom: miniMapBottomOffset,
                left: 80,
              }}
              position="bottom-left"
              className="hidden lg:block" // Hide on mobile, show on desktop
            />
          )}
        </ReactFlow>
      </div>
    );
  }
);

// Main component wrapped with ReactFlowProvider
const ReactFlowBoard = React.forwardRef<ReactFlowBoardRef, ReactFlowBoardProps>(
  function ReactFlowBoard(
    {
      className,
      style,
      onNodeTouchStart,
      onNodeTouchEnd,
      onRenameNode,
      miniMapBottomOffset,
      ...props
    },
    ref
  ) {
    return (
      <ReactFlowProvider>
        <ReactFlowBoardInner
          ref={ref}
          className={className}
          style={style}
          onNodeTouchStart={onNodeTouchStart}
          onNodeTouchEnd={onNodeTouchEnd}
          onRenameNode={onRenameNode}
          miniMapBottomOffset={miniMapBottomOffset}
          {...props}
        />
      </ReactFlowProvider>
    );
  }
);

export default ReactFlowBoard;
