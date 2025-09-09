"use client";
import React, { useRef } from "react";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";
import { Edge, NodeId, PlacedNode } from "./types";
import { findNode, linePath } from "./utils";
import NodeCard from "./NodeCard";

type PortSide = "N" | "E" | "S" | "W";
const GRID_WIDTH = 12000;
const GRID_HEIGHT = 8000;
const MIN_SCALE = 0.2;
const MAX_SCALE = 2.5;

interface BoardProps {
  nodes: PlacedNode[];
  edges: Edge[];
  lastPath: NodeId[];
  linkingFrom: NodeId | null;
  linkingFromPort?: PortSide | null;
  cursor: { x: number; y: number } | null;
  onMouseMove: (e: React.MouseEvent, world: { x: number; y: number }) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onMouseDown: () => void;
  onNodeMouseDown: (e: React.MouseEvent, id: NodeId) => void;
  onNodeMouseUp: (e: React.MouseEvent, id: NodeId) => void;
  onPortMouseDown: (e: React.MouseEvent, id: NodeId, side: PortSide) => void;
  onWorldCenterChange?: (center: { x: number; y: number }) => void;
  focusCenter?: { x: number; y: number } | null;
}

export default function Board({
  nodes,
  edges,
  lastPath,
  linkingFrom,
  linkingFromPort = null,
  cursor,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onMouseDown,
  onNodeMouseDown,
  onNodeMouseUp,
  onPortMouseDown,
  onWorldCenterChange,
  focusCenter = null,
}: BoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const transformStateRef = useRef<{ positionX: number; positionY: number; scale: number }>({
    positionX: 0,
    positionY: 0,
    scale: 1,
  });
  const setTransformRef = useRef<null | ((x: number, y: number, scale: number) => void)>(null);

  const emitWorldCenter = () => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect || !onWorldCenterChange) return;
    const { positionX, positionY, scale } = transformStateRef.current;
    const cx = (rect.width / 2 - positionX) / scale;
    const cy = (rect.height / 2 - positionY) / scale;
    onWorldCenterChange({ x: cx, y: cy });
  };

  return (
    <div
      ref={boardRef}
      data-board
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onMouseDown={onMouseDown}
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
        wheel={{ step: 0.15 }}
        doubleClick={{ disabled: true }}
        alignmentAnimation={{ disabled: true }}
        onTransformed={(_ref, state) => {
          transformStateRef.current = state;
          emitWorldCenter();
        }}
        onInit={(ref) => {
          // ensure centered on first mount
          const wrapper = boardRef.current;
          if (!wrapper) return;
          const rect = wrapper.getBoundingClientRect();
          const scale = 1;
          let x = (rect.width - GRID_WIDTH * scale) / 2;
          let y = (rect.height - GRID_HEIGHT * scale) / 2;
          if (focusCenter) {
            // center the viewport on the provided world coords
            x = rect.width / 2 - focusCenter.x * scale;
            y = rect.height / 2 - focusCenter.y * scale;
          }
          ref.setTransform(x, y, scale);
          transformStateRef.current = { positionX: x, positionY: y, scale };
          emitWorldCenter();
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
            const current = transformStateRef.current;
            const scale = current.scale || 1;
            const x = (rect.width - GRID_WIDTH * scale) / 2;
            const y = (rect.height - GRID_HEIGHT * scale) / 2;
            setTransform(x, y, scale);
            transformStateRef.current = { positionX: x, positionY: y, scale };
          };

          const zoomCentered = (factor: number) => {
            const rect = boardRef.current?.getBoundingClientRect();
            if (!rect) return;
            const current = transformStateRef.current;
            const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current.scale * factor));
            // preserve the current viewport center in world coords while zooming
            const worldCenterX = (rect.width / 2 - current.positionX) / current.scale;
            const worldCenterY = (rect.height / 2 - current.positionY) / current.scale;
            const x = rect.width / 2 - worldCenterX * nextScale;
            const y = rect.height / 2 - worldCenterY * nextScale;
            setTransform(x, y, nextScale);
            transformStateRef.current = { positionX: x, positionY: y, scale: nextScale };
          };
          return (
          <>
            {/* Controls */}
            <div className="absolute z-10 top-3 left-3 flex gap-2">
              <button className="px-2 py-1 rounded-md bg-white/10 border border-white/15 text-xs text-zinc-200" onClick={() => { zoomCentered(0.85); }}>-</button>
              <button className="px-2 py-1 rounded-md bg-white/10 border border-white/15 text-xs text-zinc-200" onClick={() => { centerToGrid(); }}>reset</button>
              <button className="px-2 py-1 rounded-md bg-white/10 border border-white/15 text-xs text-zinc-200" onClick={() => { zoomCentered(1.15); }}>+</button>
            </div>

            {/* Content */}
            <TransformComponent wrapperClass="cursor-grab active:cursor-grabbing">
              <div
                className="relative"
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
                    onMouseDown={onNodeMouseDown}
                    onMouseUp={onNodeMouseUp}
                    onPortMouseDown={onPortMouseDown}
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
}
