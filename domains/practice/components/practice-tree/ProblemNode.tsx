"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Check } from "lucide-react";
import { ProgressBar } from "../ProgressBar";
import { DIFFICULTY_COLORS } from "../../constants";
import { capitalize } from "@/utils/capitalize";

export type ProblemNodeData = {
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard" | null;
  status: "in_progress" | "completed" | null;
  completedSteps: number | null;
  totalSteps: number | null;
};

export type ProblemNodeType = Node<ProblemNodeData, "problemNode">;

const STATUS_BORDER: Record<string, string> = {
  completed: "border-green-500/70 shadow-green-500/20 shadow-md",
  in_progress: "border-blue-500/70 shadow-blue-500/20 shadow-md",
};

const HANDLE_CLASS = "!bg-transparent !border-0 !w-0 !h-0";

function ProblemNodeComponent({ data }: NodeProps<ProblemNodeType>) {
  const difficulty = data.difficulty ?? "medium";
  const colors = DIFFICULTY_COLORS[difficulty];
  const borderClass = data.status ? STATUS_BORDER[data.status] : "border-zinc-700";

  return (
    <>
      {/* Source handles (edge exits) */}
      <Handle id="top-source" type="source" position={Position.Top} className={HANDLE_CLASS} />
      <Handle id="right-source" type="source" position={Position.Right} className={HANDLE_CLASS} />
      <Handle
        id="bottom-source"
        type="source"
        position={Position.Bottom}
        className={HANDLE_CLASS}
      />
      <Handle id="left-source" type="source" position={Position.Left} className={HANDLE_CLASS} />
      {/* Target handles (edge enters) */}
      <Handle id="top-target" type="target" position={Position.Top} className={HANDLE_CLASS} />
      <Handle id="right-target" type="target" position={Position.Right} className={HANDLE_CLASS} />
      <Handle
        id="bottom-target"
        type="target"
        position={Position.Bottom}
        className={HANDLE_CLASS}
      />
      <Handle id="left-target" type="target" position={Position.Left} className={HANDLE_CLASS} />

      <div
        className={`cursor-pointer rounded-xl border-2 bg-zinc-900 px-5 py-4 transition-all hover:scale-105 hover:shadow-xl ${borderClass}`}
        style={{ minWidth: 260 }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-base font-semibold text-white leading-snug">{data.title}</span>
          {data.status === "completed" && (
            <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
          )}
        </div>

        <span
          className={`mt-2 inline-block text-xs px-2.5 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}
        >
          {capitalize(difficulty)}
        </span>

        {data.status !== null && data.totalSteps !== null && data.completedSteps !== null && (
          <ProgressBar
            completedSteps={data.completedSteps}
            totalSteps={data.totalSteps}
            className="mt-2"
          />
        )}
      </div>
    </>
  );
}

export default memo(ProblemNodeComponent);
