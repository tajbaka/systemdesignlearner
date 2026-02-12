import {
  getDiagramConfig,
  computeDiagramBounds,
  calculateOptimalHandles,
  getIconSvg,
  getHandlePosition,
  computeBezierPath,
  NODE_W,
  NODE_H,
} from "./article-diagrams";

export function ArticleDiagram({ diagramId }: { diagramId: string }) {
  const config = getDiagramConfig(diagramId);
  if (!config) return null;

  const PAD = 20;
  const bounds = computeDiagramBounds(config);
  const vbX = bounds.minX - PAD;
  const vbY = bounds.minY - PAD;
  const vbW = bounds.width + PAD * 2;
  const vbH = bounds.height + PAD * 2;
  // Unique ID prefix so multiple diagrams on one page don't clash SVG defs
  const uid = diagramId.replace(/[^a-zA-Z0-9]/g, "-");

  // Build position map (top-left coords) for edge routing
  const posMap = new Map(
    config.nodes.map((n) => {
      const w = n.width ?? NODE_W;
      const h = n.height ?? NODE_H;
      return [n.id, { x: n.x - w / 2, y: n.y - h / 2, w, h }] as const;
    })
  );

  // Separate group nodes (render first for z-order)
  const groupNodes = config.nodes.filter((n) => n.type === "groupNode");
  const otherNodes = config.nodes.filter((n) => n.type !== "groupNode");

  return (
    <div className="my-12 w-full rounded-lg border border-gray-200 bg-gray-50/50 overflow-hidden flex justify-center">
      <svg
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block", maxWidth: vbW }}
      >
        <defs>
          <marker
            id={`arrow-${uid}`}
            viewBox="0 0 20 20"
            refX="18"
            refY="10"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M0,2 L16,10 L0,18 z" fill="#10b981" />
          </marker>
          <pattern id={`dots-${uid}`} width="15" height="15" patternUnits="userSpaceOnUse">
            <circle cx="7.5" cy="7.5" r="0.5" fill="#e4e4e7" />
          </pattern>
        </defs>

        {/* Background dots */}
        <rect x={vbX} y={vbY} width={vbW} height={vbH} fill={`url(#dots-${uid})`} />

        {/* Group nodes first (behind everything) */}
        {groupNodes.map((node) => {
          const w = node.width ?? 300;
          const h = node.height ?? 200;
          const nx = node.x - w / 2;
          const ny = node.y - h / 2;
          return (
            <foreignObject key={node.id} x={nx} y={ny} width={w} height={h}>
              <div
                style={{
                  width: w,
                  height: h,
                  borderRadius: 12,
                  border: "2px dashed #d1d5db",
                  backgroundColor: "rgba(249,250,251,0.6)",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ padding: "8px 12px" }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#a1a1aa",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {node.name}
                  </span>
                </div>
              </div>
            </foreignObject>
          );
        })}

        {/* Edges */}
        {config.edges.map((edge) => {
          const sourceInfo = posMap.get(edge.from);
          const targetInfo = posMap.get(edge.to);
          if (!sourceInfo || !targetInfo) return null;

          const autoHandles = calculateOptimalHandles(
            { x: sourceInfo.x, y: sourceInfo.y, w: sourceInfo.w, h: sourceInfo.h },
            { x: targetInfo.x, y: targetInfo.y, w: targetInfo.w, h: targetInfo.h }
          );
          const srcHandle = edge.sourceHandle ?? autoHandles.sourceHandle;
          const tgtHandle = edge.targetHandle ?? autoHandles.targetHandle;

          const sp = getHandlePosition(
            srcHandle,
            sourceInfo.x,
            sourceInfo.y,
            sourceInfo.w,
            sourceInfo.h
          );
          const tp = getHandlePosition(
            tgtHandle,
            targetInfo.x,
            targetInfo.y,
            targetInfo.w,
            targetInfo.h
          );

          const bezier = computeBezierPath(sp.x, sp.y, srcHandle, tp.x, tp.y, tgtHandle);

          const isDashed = edge.edgeType === "dashed";
          const hasLabel = !!edge.label;

          return (
            <g key={edge.id}>
              <path
                d={bezier.path}
                fill="none"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray={isDashed ? "6,4" : undefined}
                markerEnd={`url(#arrow-${uid})`}
              />
              {hasLabel && (
                <foreignObject
                  x={bezier.labelX - 50}
                  y={bezier.labelY - 12}
                  width={100}
                  height={24}
                  style={{ overflow: "visible" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        borderRadius: 9999,
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        padding: "2px 8px",
                        fontSize: 10,
                        fontWeight: 500,
                        color: "#71717a",
                        boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {edge.label}
                    </span>
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}

        {/* Regular nodes (articleNode and textNode) */}
        {otherNodes.map((node) => {
          if (node.type === "textNode") {
            const w = node.width ?? 160;
            const h = node.height ?? 50;
            const nx = node.x - w / 2;
            const ny = node.y - h / 2;
            return (
              <foreignObject key={node.id} x={nx} y={ny} width={w} height={h}>
                <div
                  style={{
                    width: w,
                    height: h,
                    borderRadius: 8,
                    backgroundColor: "#f3f4f6",
                    border: "1px dashed #d1d5db",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 12px",
                    boxSizing: "border-box",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "#71717a",
                      textAlign: "center",
                      lineHeight: 1.3,
                    }}
                  >
                    {node.name}
                  </span>
                  {node.sublabel && (
                    <span
                      style={{
                        fontSize: 10,
                        color: "#a1a1aa",
                        textAlign: "center",
                        lineHeight: 1.3,
                        marginTop: 2,
                      }}
                    >
                      {node.sublabel}
                    </span>
                  )}
                </div>
              </foreignObject>
            );
          }

          // Default: articleNode
          const w = NODE_W;
          const h = NODE_H;
          const nx = node.x - w / 2;
          const ny = node.y - h / 2;
          const iconSvg = getIconSvg(node.icon);

          return (
            <foreignObject key={node.id} x={nx} y={ny} width={w} height={h}>
              <div
                style={{
                  width: w,
                  height: h,
                  borderRadius: 12,
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "0 16px",
                  }}
                >
                  {iconSvg && <IconSvg markup={iconSvg} />}
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#3f3f46",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {node.name}
                  </span>
                </div>
              </div>
            </foreignObject>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Renders an inline icon SVG from trusted, hardcoded markup defined in article-diagrams.ts.
 * The markup is static string constants (ICON_SVGS), not user-supplied content.
 */
function IconSvg({ markup }: { markup: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#71717a"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
