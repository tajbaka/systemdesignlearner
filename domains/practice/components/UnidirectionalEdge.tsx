"use client";
import React from "react";
import { EdgeProps, getBezierPath } from "@xyflow/react";

export default function UnidirectionalEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}: EdgeProps) {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const strokeColor = selected ? "#3b82f6" : "#10b981"; // Blue when selected, green when not

  return (
    <>
      {/* Invisible wider path for better click detection */}
      <path
        style={{
          strokeWidth: 10,
          stroke: "transparent",
          fill: "none",
          pointerEvents: "stroke",
        }}
        className="react-flow__edge-path"
        d={path}
      />

      {/* Visible edge with arrow */}
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: strokeColor,
          fill: "none",
          pointerEvents: "none",
        }}
        d={path}
        markerEnd={markerEnd}
      />
    </>
  );
}
