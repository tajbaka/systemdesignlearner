"use client";
import React, { useRef, useImperativeHandle, forwardRef } from "react";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";
import { ComponentKind, Edge, NodeId, PlacedNode } from "./types";
import { findNode, linePath } from "./utils";
import NodeCard from "./NodeCard";

type PortSide = "N" | "E" | "S" | "W";
const GRID_WIDTH = 12000;
const GRID_HEIGHT = 8000;
const MIN_SCALE = 0.2;
const MAX_SCALE = 2.5;

// Imperative API for accessing board transform state
export interface BoardApi {
  getWorldCenter(): { x: number; y: number };
  getTransform(): { positionX: number; positionY: number; scale: number };
  getViewportWorldRect(): { left: number; top: number; width: number; height: number };
  centerTo(worldPoint: { x: number; y: number }): void;
}

interface BoardProps {
  nodes: PlacedNode[];
  edges: Edge[];
  lastPath: NodeId[];
  linkingFrom: NodeId | null;
  linkingFromPort?: PortSide | null;
  cursor: { x: number; y: number } | null;
  selectedNode?: NodeId | null;
  isConnectMode?: boolean;
  dragging?: NodeId | null;
  deletingNode?: NodeId | null;
  onMouseMove: (e: React.MouseEvent, world: { x: number; y: number }) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onMouseDown: () => void;
  onNodeMouseDown: (e: React.MouseEvent, id: NodeId) => void;
  onNodeMouseUp: (e: React.MouseEvent, id: NodeId) => void;
  onNodeTouchStart?: (e: React.TouchEvent, id: NodeId) => void;
  onNodeTouchEnd?: (e: React.TouchEvent, id: NodeId) => void;
  onPortMouseDown: (e: React.MouseEvent, id: NodeId, side: PortSide) => void;
  onPortTouchStart?: (e: React.TouchEvent, id: NodeId, side: PortSide) => void;
  onWorldCenterChange?: (center: { x: number; y: number }) => void;
  onForceUpdateWorldCenter?: () => void;
  focusCenter?: { x: number; y: number } | null;
  onDrop: (kind: ComponentKind, world: { x: number; y: number }) => void;
  onDeleteNode?: (nodeId: NodeId) => void;
  onCameraChange?: () => void;
}

const Board = forwardRef<BoardApi, BoardProps>(function Board({
  nodes,
  edges,
  lastPath,
  linkingFrom,
  linkingFromPort = null,
  cursor,
  selectedNode = null,
  isConnectMode = false,
  dragging = null,
  deletingNode = null,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onMouseDown,
  onNodeMouseDown,
  onNodeMouseUp,
  onNodeTouchStart,
  onNodeTouchEnd,
  onPortMouseDown,
  onPortTouchStart,
  onWorldCenterChange,
  onForceUpdateWorldCenter,
  focusCenter = null,
  onDrop,
  onDeleteNode,
  onCameraChange,
}, ref) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const transformStateRef = useRef<{ positionX: number; positionY: number; scale: number }>({
    positionX: 0,
    positionY: 0,
    scale: 1,
  });
  const setTransformRef = useRef<null | ((x: number, y: number, scale: number) => void)>(null);
  const lastEmittedCenter = useRef<{ x: number; y: number } | null>(null);
  const [, setTransformTick] = React.useState(0); // force rerenders for overlays

  const emitWorldCenter = React.useCallback((force = false) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect || !onWorldCenterChange) return;
    
    // Skip if rect has no dimensions (component not mounted properly)
    if (rect.width === 0 || rect.height === 0) return;
    
    const { positionX, positionY, scale } = transformStateRef.current;
    const cx = (rect.width / 2 - positionX) / scale;
    const cy = (rect.height / 2 - positionY) / scale;
    
    // Only emit if center has changed significantly (> 10 pixels to reduce spam)
    // Unless force is true (e.g., after a drop or spawn)
    if (!force && lastEmittedCenter.current) {
      const dx = Math.abs(cx - lastEmittedCenter.current.x);
      const dy = Math.abs(cy - lastEmittedCenter.current.y);
      if (dx < 10 && dy < 10) return;
    }
    
    lastEmittedCenter.current = { x: cx, y: cy };
    onWorldCenterChange({ x: cx, y: cy });
  }, [onWorldCenterChange]);

  // Expose imperative API
  useImperativeHandle(ref, () => ({
    getWorldCenter(): { x: number; y: number } {
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) {
        return { x: 6000, y: 4000 }; // fallback to grid center
      }
      const { positionX, positionY, scale } = transformStateRef.current;
      // Use the same corrected center calculation as getViewportWorldRect
      const cx = (500 - positionX) / scale;
      const cy = (500 - positionY) / scale;
      return { x: cx, y: cy };
    },

    getTransform(): { positionX: number; positionY: number; scale: number } {
      return { ...transformStateRef.current };
    },

    getViewportWorldRect(): { left: number; top: number; width: number; height: number } {
      const rect = boardRef.current?.getBoundingClientRect();
      const { positionX, positionY, scale } = transformStateRef.current;
      if (!rect || !scale) {
        return { left: 0, top: 0, width: GRID_WIDTH, height: GRID_HEIGHT };
      }
      // User empirically found that the actual viewport center is at screen coordinates (500, 500)
      // So the world center is at: center = (500 - position) / scale
      const centerX = (500 - positionX) / scale;
      const centerY = (500 - positionY) / scale;
      const halfWidth = (rect.width / scale) / 2;
      const halfHeight = (rect.height / scale) / 2;

      return {
        left: centerX - halfWidth,
        top: centerY - halfHeight,
        width: rect.width / scale,
        height: rect.height / scale,
      };
    },

    centerTo(worldPoint: { x: number; y: number }): void {
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect || !setTransformRef.current) return;

      const scale = transformStateRef.current.scale;
      const targetX = rect.width / 2 - worldPoint.x * scale;
      const targetY = rect.height / 2 - worldPoint.y * scale;

      setTransformRef.current(targetX, targetY, scale);
      transformStateRef.current = { positionX: targetX, positionY: targetY, scale };
      emitWorldCenter();
      setTransformTick((t) => t + 1);
    },
  }), [emitWorldCenter]);

  // Expose emitWorldCenter to parent via callback
  React.useEffect(() => {
    if (onForceUpdateWorldCenter) {
      // Replace the callback with our emitWorldCenter function
      // This is a bit hacky but allows parent to force update
      (onForceUpdateWorldCenter as unknown as { current?: () => void }).current = () => emitWorldCenter(true);
    }
  }, [onForceUpdateWorldCenter, emitWorldCenter]);

  // Ensure world center is emitted on mount and when viewport changes
  React.useEffect(() => {
    // Initial emit after a short delay to ensure DOM is ready
    const timer = setTimeout(() => {
      emitWorldCenter();
    }, 100);
    
    const handleResize = () => {
      emitWorldCenter();
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Handle dynamic focus center changes (e.g., when a new component is added)
  React.useEffect(() => {
    if (!focusCenter || !setTransformRef.current) return;
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const scale = transformStateRef.current.scale || 1;
    const targetX = rect.width / 2 - focusCenter.x * scale;
    const targetY = rect.height / 2 - focusCenter.y * scale;
    
    // Smooth animation to the target position
    const currentX = transformStateRef.current.positionX;
    const currentY = transformStateRef.current.positionY;
    const distance = Math.sqrt(Math.pow(targetX - currentX, 2) + Math.pow(targetY - currentY, 2));
    
    // If distance is small, just snap. Otherwise animate.
    if (distance < 50) {
      setTransformRef.current(targetX, targetY, scale);
      transformStateRef.current = { positionX: targetX, positionY: targetY, scale };
    } else {
      // Animate with requestAnimationFrame
      const duration = 300; // ms
      const startTime = performance.now();
      const startX = currentX;
      const startY = currentY;
      
      const animate = (currentTime: number) => {
        if (!setTransformRef.current) return;
        
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out cubic
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        const x = startX + (targetX - startX) * easeProgress;
        const y = startY + (targetY - startY) * easeProgress;
        
        setTransformRef.current(x, y, scale);
        transformStateRef.current = { positionX: x, positionY: y, scale };
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [focusCenter]);

  return (
    <div
      ref={boardRef}
      data-board
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onMouseDown={() => {
        // Force update worldCenter when user interacts with board
        emitWorldCenter(true);
        onMouseDown();
      }}
      onDragOver={(e) => {
        // Allow dropping from palette
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e) => {
        e.preventDefault();
        const kind =
          (e.dataTransfer?.getData("application/x-sds-kind") ||
            e.dataTransfer?.getData("text/plain") ||
            "") as ComponentKind;
        if (!kind) return;
        const rect = boardRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        // Calculate drop position - use same formula as worldCenter for consistency
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;
        const { positionX, positionY, scale } = transformStateRef.current;
        const world = {
          x: (clientX - positionX) / scale,
          y: (clientY - positionY) / scale,
        };
        
        // Force update worldCenter so it's accurate for any subsequent spawn() calls
        emitWorldCenter(true);
        
        onDrop(kind, world);
      }}
      className="relative rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800 via-zinc-900 to-black overflow-hidden"
      style={{ minHeight: 560 }}
    >
      <TransformWrapper
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        initialScale={1}
        centerOnInit={true}
        centerZoomedOut={true}
        limitToBounds={false}
        wheel={{ disabled: true }}
        doubleClick={{ disabled: true }}
        alignmentAnimation={{ disabled: true }}
        panning={{ disabled: false }}
        onTransformed={(_ref, state) => {
          transformStateRef.current = state;
          emitWorldCenter();
          setTransformTick((t) => t + 1);
          onCameraChange?.(); // For live minimap updates
        }}
        onInit={(ref) => {
          // Position viewport top-left corner at board center for initial focus
          const wrapper = boardRef.current;
          if (!wrapper) return;
          const rect = wrapper.getBoundingClientRect();
          const scale = 1;

          let x, y;
          if (focusCenter) {
            // center the viewport on the provided world coords
            x = rect.width / 2 - focusCenter.x * scale;
            y = rect.height / 2 - focusCenter.y * scale;
          } else {
            // Position viewport center at board center
            const boardCenterX = GRID_WIDTH / 2;
            const boardCenterY = GRID_HEIGHT / 2;
            // From corrected center formula: center = (500 - position) / scale = boardCenter
            // Solving: 500 - position = boardCenter * scale
            // position = 500 - boardCenter * scale
            x = 500 - boardCenterX * scale;
            y = 500 - boardCenterY * scale;
          }

          ref.setTransform(x, y, scale);
          transformStateRef.current = { positionX: x, positionY: y, scale };
          setTransformRef.current = ref.setTransform ?? null;
          emitWorldCenter();
          setTransformTick((t) => t + 1);
        }}
      >
        {(ref: ReactZoomPanPinchContentRef) => {
          type Handlers = Partial<{ zoomIn: () => void; zoomOut: () => void; resetTransform: () => void; centerView: () => void; setTransform: (x: number, y: number, scale: number) => void }>;
          const handlers = ref as unknown as Handlers;
          const resetTransform = handlers.resetTransform ?? (() => {});
          const setTransform = handlers.setTransform ?? (() => {});
          setTransformRef.current = handlers.setTransform ?? null;

          const centerToGrid = () => {
            const rect = boardRef.current?.getBoundingClientRect();
            if (!rect) {
              resetTransform();
              return;
            }

            // If there are nodes, calculate bounds and fit all components in view
            if (nodes.length > 0) {
              // Calculate bounds of all nodes
              // Nodes are positioned by their CENTER (x,y coordinates)
              // NodeCard renders at: left: node.x - 95, top: node.y - 45 (190x90 card)
              const nodeWidth = 190;
              const nodeHeight = 90;
              const padding = 100; // Extra padding around bounds

              // Get actual bounds of all nodes (nodes.x and nodes.y are CENTER positions)
              const xs = nodes.map(n => n.x);
              const ys = nodes.map(n => n.y);
              
              const minX = Math.min(...xs) - nodeWidth/2 - padding;
              const maxX = Math.max(...xs) + nodeWidth/2 + padding;
              const minY = Math.min(...ys) - nodeHeight/2 - padding;
              const maxY = Math.max(...ys) + nodeHeight/2 + padding;

              const boundsWidth = maxX - minX;
              const boundsHeight = maxY - minY;
              const boundsCenterX = (minX + maxX) / 2;
              const boundsCenterY = (minY + maxY) / 2;

              // Calculate scale to fit all components with some padding
              const scaleX = (rect.width * 0.85) / boundsWidth; // 85% of viewport width
              const scaleY = (rect.height * 0.85) / boundsHeight; // 85% of viewport height
              const optimalScale = Math.min(scaleX, scaleY, MAX_SCALE);
              const finalScale = Math.max(optimalScale, MIN_SCALE);

              // Center the view on the bounds center
              const x = rect.width / 2 - boundsCenterX * finalScale;
              const y = rect.height / 2 - boundsCenterY * finalScale;

              setTransform(x, y, finalScale);
              transformStateRef.current = { positionX: x, positionY: y, scale: finalScale };
              emitWorldCenter();
            } else {
              // No nodes, center to grid default
              const scale = 1;
              const x = (rect.width - GRID_WIDTH * scale) / 2;
              const y = (rect.height - GRID_HEIGHT * scale) / 2;
              setTransform(x, y, scale);
              transformStateRef.current = { positionX: x, positionY: y, scale };
              emitWorldCenter();
            }
          };

          return (
          <>
            {/* Controls - hidden on mobile, visible on desktop */}
            <div className="absolute z-10 top-2 sm:top-3 left-2 sm:left-3 hidden sm:flex gap-2">
              <button
                className="px-3 h-10 rounded-lg bg-white/10 border border-white/15 text-xs text-zinc-200 hover:bg-white/20 transition touch-manipulation"
                onClick={() => {
                  if ('vibrate' in navigator) navigator.vibrate(50);
                  centerToGrid();
                }}
                aria-label="Reset view"
              >
                reset
              </button>
            </div>

            {/* Delete Bin - shown when dragging on desktop */}
            {dragging && (
              <div className="absolute z-10 bottom-20 right-4 hidden sm:block">
                <div
                  className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-400/60 flex items-center justify-center hover:bg-red-500/30 transition-colors cursor-pointer"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (onDeleteNode && dragging) {
                      onDeleteNode(dragging);
                      if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
                    }
                  }}
                  title="Drop here to delete component"
                >
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
              </div>
            )}

            {/* Content */}
            <TransformComponent wrapperClass="cursor-grab active:cursor-grabbing z-0">
              <div
                className="relative bg-[radial-gradient(circle,_rgba(255,255,255,0.05)_1px,_transparent_1px)] bg-[length:20px_20px]"
                style={{ width: 12000, height: 8000 }}
                onMouseMove={(e) => {
                  const rect = boardRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  const { positionX, positionY, scale } = transformStateRef.current;
                  const world = {
                    x: (x - positionX) / scale,
                    y: (y - positionY) / scale,
                  };
                  onMouseMove(e, world);
                }}
              >
                {/* Grid */}
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${GRID_WIDTH} ${GRID_HEIGHT}`}>
                  <defs>
                    <pattern id="smallGrid" width="24" height="24" patternUnits="userSpaceOnUse">
                      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
                    </pattern>
                    <pattern id="grid" width="120" height="120" patternUnits="userSpaceOnUse">
                      <rect width="120" height="120" fill="url(#smallGrid)" />
                      <path d="M 120 0 L 0 0 0 120" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />

                  {/* Edges underneath nodes */}
                  {edges.map((e) => {
                    const from = findNode(nodes, e.from);
                    const to = findNode(nodes, e.to);
                    if (!from || !to) return null;
                    return (
                      <path
                        key={e.id}
                        d={linePath(from.x, from.y, to.x, to.y)}
                        stroke="rgba(255,255,255,0.22)"
                        strokeWidth={2}
                        markerEnd="url(#arrow)"
                        fill="none"
                      />
                    );
                  })}

                  {/* Temp linking line (during connect drag) */}
                  {linkingFrom && cursor && (() => {
                    const from = findNode(nodes, linkingFrom);
                    if (!from) return null;
                    const start = (() => {
                      switch (linkingFromPort) {
                        case "E":
                          return { x: from.x + 95, y: from.y };
                        case "W":
                          return { x: from.x - 95, y: from.y };
                        case "N":
                          return { x: from.x, y: from.y - 45 };
                        case "S":
                          return { x: from.x, y: from.y + 45 };
                        default:
                          return { x: from.x, y: from.y };
                      }
                    })();
                    return (
                      <path
                        d={linePath(start.x, start.y, cursor.x, cursor.y)}
                        stroke="rgba(16,185,129,0.6)"
                        strokeWidth={2}
                        strokeDasharray="6 6"
                        fill="none"
                      />
                    );
                  })()}

                  <defs>
                    <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                      <path d="M0,0 L0,6 L9,3 z" fill="rgba(255,255,255,0.35)" />
                    </marker>
                  </defs>
                </svg>

                {/* Nodes */}
                {nodes.map((n) => (
                  <NodeCard
                    key={n.id}
                    node={n}
                    isInPath={lastPath.includes(n.id)}
                    isSelected={selectedNode === n.id}
                    isConnectMode={isConnectMode && linkingFrom === n.id}
                    isDeleting={deletingNode === n.id}
                    onMouseDown={onNodeMouseDown}
                    onMouseUp={onNodeMouseUp}
                    onTouchStart={onNodeTouchStart}
                    onTouchEnd={onNodeTouchEnd}
                    onPortMouseDown={onPortMouseDown}
                    onPortTouchStart={onPortTouchStart}
                    onDelete={onDeleteNode}
                  />
                ))}
              </div>
            </TransformComponent>

          </>
          );
        }}
      </TransformWrapper>
    </div>
  );
});

export default Board;
