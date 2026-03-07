"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  applyNodeChanges,
  type Edge,
  type NodeChange,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { RotateCcw } from "lucide-react";
import ProblemNodeComponent, { type ProblemNodeType } from "./ProblemNode";
import { PROBLEM_POSITIONS, PREREQUISITE_EDGES } from "./prerequisite-graph";
import { getButtonConfig } from "../../constants";
import { track } from "@/lib/analytics";
import type { ProblemSimpleResponse } from "@/app/api/v2/practice/schemas";

const nodeTypes = { problemNode: ProblemNodeComponent } as const;

// Approximate node dimensions for center calculation
const NODE_W = 260;
const NODE_H = 80;

/** Pick the closest handle pair based on angle between node centers. */
function calculateOptimalHandles(
  sourceNode: ProblemNodeType,
  targetNode: ProblemNodeType
): { sourceHandle: string; targetHandle: string } {
  const sx = sourceNode.position.x + NODE_W / 2;
  const sy = sourceNode.position.y + NODE_H / 2;
  const tx = targetNode.position.x + NODE_W / 2;
  const ty = targetNode.position.y + NODE_H / 2;

  const angle = Math.atan2(ty - sy, tx - sx) * (180 / Math.PI);

  let sourceHandle: string;
  let targetHandle: string;

  if (angle >= -45 && angle < 45) {
    sourceHandle = "right-source";
    targetHandle = "left-target";
  } else if (angle >= 45 && angle < 135) {
    sourceHandle = "bottom-source";
    targetHandle = "top-target";
  } else if (angle >= 135 || angle < -135) {
    sourceHandle = "left-source";
    targetHandle = "right-target";
  } else {
    sourceHandle = "top-source";
    targetHandle = "bottom-target";
  }

  return { sourceHandle, targetHandle };
}

interface PracticeTreeProps {
  problems: ProblemSimpleResponse[];
}

function PracticeTreeInner({ problems }: PracticeTreeProps) {
  const router = useRouter();

  const initialNodes: ProblemNodeType[] = useMemo(
    () =>
      problems
        .filter((p) => PROBLEM_POSITIONS[p.slug])
        .map((problem) => {
          const pos = PROBLEM_POSITIONS[problem.slug];
          return {
            id: problem.slug,
            type: "problemNode" as const,
            position: { x: pos.x, y: pos.y },
            data: {
              slug: problem.slug,
              title: problem.title ?? "Untitled",
              difficulty: problem.difficulty,
              status: problem.status,
              completedSteps: problem.completedSteps,
              totalSteps: problem.totalSteps,
            },
            draggable: true,
            connectable: false,
          };
        }),
    [problems]
  );

  const [nodes, setNodes] = useState<ProblemNodeType[]>(initialNodes);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  // Build initial edges with optimal handles
  const initialEdges: Edge[] = useMemo(() => {
    const validSlugs = new Set(initialNodes.map((n) => n.id));
    const nodeMap = new Map(initialNodes.map((n) => [n.id, n]));

    return PREREQUISITE_EDGES.filter(
      (e) => validSlugs.has(e.source) && validSlugs.has(e.target)
    ).map((e) => {
      const src = nodeMap.get(e.source)!;
      const tgt = nodeMap.get(e.target)!;
      const { sourceHandle, targetHandle } = calculateOptimalHandles(src, tgt);
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle,
        targetHandle,
        style: { stroke: "#52525b", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#52525b", width: 16, height: 12 },
      };
    });
  }, [initialNodes]);

  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const recalculateEdgeHandles = useCallback(() => {
    setEdges((currentEdges) => {
      const nodeMap = new Map(nodesRef.current.map((n) => [n.id, n]));
      return currentEdges.map((edge) => {
        const src = nodeMap.get(edge.source);
        const tgt = nodeMap.get(edge.target);
        if (!src || !tgt) return edge;

        const { sourceHandle, targetHandle } = calculateOptimalHandles(src, tgt);
        if (edge.sourceHandle === sourceHandle && edge.targetHandle === targetHandle) {
          return edge;
        }
        return { ...edge, sourceHandle, targetHandle };
      });
    });
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange<ProblemNodeType>[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));

      if (changes.some((c) => c.type === "position")) {
        setTimeout(recalculateEdgeHandles, 0);
      }
    },
    [recalculateEdgeHandles]
  );

  const { fitView } = useReactFlow();

  const handleReset = useCallback(() => {
    setNodes(initialNodes);
    // Recalculate edges for original positions
    const nodeMap = new Map(initialNodes.map((n) => [n.id, n]));
    setEdges((currentEdges) =>
      currentEdges.map((edge) => {
        const src = nodeMap.get(edge.source);
        const tgt = nodeMap.get(edge.target);
        if (!src || !tgt) return edge;
        const { sourceHandle, targetHandle } = calculateOptimalHandles(src, tgt);
        return { ...edge, sourceHandle, targetHandle };
      })
    );
    setTimeout(() => fitView({ padding: 0.15 }), 50);
  }, [initialNodes, fitView]);

  const onNodeClick: NodeMouseHandler<ProblemNodeType> = useCallback(
    (_event, node) => {
      const problem = problems.find((p) => p.slug === node.id);
      track("practice_problem_selected", {
        slug: node.id,
        difficulty: problem?.difficulty,
        status: problem?.status,
      });
      const { href } = getButtonConfig(problem?.status ?? null, node.id);
      router.push(href);
    },
    [problems, router]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3}
        maxZoom={1.5}
        panOnDrag
        zoomOnPinch
        zoomOnScroll
        preventScrolling={false}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#3f3f46" />
        <Controls showZoom showFitView showInteractive={false} className="hidden md:flex">
          <button
            onClick={handleReset}
            title="Reset layout"
            className="react-flow__controls-button"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </Controls>
      </ReactFlow>
    </div>
  );
}

export function PracticeTree({ problems }: PracticeTreeProps) {
  return (
    <ReactFlowProvider>
      <PracticeTreeInner problems={problems} />
    </ReactFlowProvider>
  );
}
