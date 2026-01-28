"use client";
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from "@xyflow/react";
import { isMobile } from "./utils";

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
  data,
}: EdgeProps) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const strokeColor = selected ? "#3b82f6" : "#10b981"; // Blue when selected, green when not
  const mobile = isMobile();
  const hitAreaWidth = mobile ? 25 : 10; // Larger hit area on mobile

  return (
    <>
      {/* Invisible wider path for better click detection */}
      <path
        style={{
          strokeWidth: hitAreaWidth,
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

      {/* Delete button when selected - mobile only */}
      {selected && data?.onDelete && mobile && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                // Pass the ID for deletion
                if (data?.onDelete && typeof data.onDelete === "function") {
                  data.onDelete(id);
                }
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transition-colors"
              aria-label="Delete edge"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
