"use client";
import React from 'react';
import { EdgeProps, getSmoothStepPath } from '@xyflow/react';

export default function BidirectionalEdge({
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

  // Create parallel paths offset by 2px in both directions
  const [upperLeftPath] = getSmoothStepPath({
    sourceX: sourceX - 2,
    sourceY: sourceY - 2,
    sourcePosition,
    targetX: targetX - 2,
    targetY: targetY - 2,
    targetPosition,
  });

  const [lowerRightPath] = getSmoothStepPath({
    sourceX: sourceX + 2,
    sourceY: sourceY + 2,
    sourcePosition,
    targetX: targetX + 2,
    targetY: targetY + 2,
    targetPosition,
  });

  const strokeColor = selected ? '#3b82f6' : '#10b981'; // Blue when selected, green when not

  return (
    <>
      {/* Invisible wider path for better click detection */}
      <path
        style={{
          strokeWidth: 10,
          stroke: 'transparent',
          fill: 'none',
          pointerEvents: 'stroke',
        }}
        className="react-flow__edge-path"
        d={upperLeftPath}
      />

      {/* Upper-left line - moving forward */}
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2, // Thicker when selected
          stroke: strokeColor,
          strokeDasharray: '8,8',
          animation: 'bidirectional-flow-forward 1.5s linear infinite',
          fill: 'none',
          pointerEvents: 'none',
        }}
        d={upperLeftPath}
        markerEnd={markerEnd}
      />

      {/* Lower-right line - moving backward */}
      <path
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2, // Thicker when selected
          stroke: strokeColor,
          strokeDasharray: '8,8',
          animation: 'bidirectional-flow-backward 1.5s linear infinite',
          fill: 'none',
          pointerEvents: 'none',
        }}
        d={lowerRightPath}
        markerEnd={markerEnd}
      />
    </>
  );
}
