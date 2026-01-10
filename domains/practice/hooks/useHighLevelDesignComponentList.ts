"use client";

import { useCallback } from "react";
import type { ComponentKind } from "@/domains/practice/types";

type UseHighLevelDesignComponentListProps = {
  isReadOnly: boolean;
  onAddNode: (kind: ComponentKind, position?: { x: number; y: number }) => void;
  onClose: () => void;
};

export function useHighLevelDesignComponentList({
  isReadOnly,
  onAddNode,
  onClose,
}: UseHighLevelDesignComponentListProps) {
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Let the drop event bubble to ReactFlowBoard
      const kind =
        e.dataTransfer.getData("application/x-sds-kind") || e.dataTransfer.getData("text/plain");
      if (!kind || isReadOnly) return;

      // Close the palette
      onClose();

      // Get the canvas element and trigger drop on it
      const canvas = document.querySelector(".react-flow");
      if (canvas) {
        const _canvasBounds = canvas.getBoundingClientRect();
        const dropEvent = new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          clientX: e.clientX,
          clientY: e.clientY,
          dataTransfer: e.dataTransfer,
        });
        canvas.dispatchEvent(dropEvent);
      }
    },
    [isReadOnly, onClose]
  );

  const handleSpawn = useCallback(
    (kind: string) => {
      if (isReadOnly) return;
      // Use the onAddNode handler
      onAddNode(kind as ComponentKind);
      onClose();
    },
    [isReadOnly, onAddNode, onClose]
  );

  return {
    handleDragOver,
    handleDrop,
    handleSpawn,
  };
}
