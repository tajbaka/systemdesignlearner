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

  return (
    <>
      {/* Upper-left line - moving forward */}
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: '#10b981',
          strokeDasharray: '8,8',
          animation: 'bidirectional-flow-forward 1.5s linear infinite',
          fill: 'none',
        }}
        className="react-flow__edge-path"
        d={upperLeftPath}
        markerEnd={markerEnd}
      />

      {/* Lower-right line - moving backward */}
      <path
        style={{
          ...style,
          strokeWidth: 2,
          stroke: '#10b981',
          strokeDasharray: '8,8',
          animation: 'bidirectional-flow-backward 1.5s linear infinite',
          fill: 'none',
        }}
        className="react-flow__edge-path"
        d={lowerRightPath}
        markerEnd={markerEnd}
      />
    </>
  );
}
