"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlacedNode, Edge } from "@/components/canvas/types";
import { track } from "@/lib/analytics";

/**
 * Safe deep clone that avoids JSON.stringify stack overflow on iOS Safari.
 * Skips functions and undefined values.
 */
function safeDeepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => safeDeepClone(item)) as T;
  }

  const cloned = {} as T;
  for (const key of Object.keys(obj)) {
    const value = (obj as Record<string, unknown>)[key];
    if (typeof value === "function" || value === undefined) {
      continue;
    }
    (cloned as Record<string, unknown>)[key] = safeDeepClone(value);
  }
  return cloned;
}

type DesignSnapshot = {
  nodes: PlacedNode[];
  edges: Edge[];
};

type UseDesignHistoryOptions = {
  /** Current nodes */
  nodes: PlacedNode[];
  /** Current edges */
  edges: Edge[];
  /** Whether editing is locked */
  editingLocked: boolean;
  /** Currently selected node ID (for copy context) */
  selectedNodeId: string | null;
  /** Scenario slug for analytics */
  slug: string;
  /** Callback when undo/redo/paste changes state */
  onStateChange: (nodes: PlacedNode[], edges: Edge[]) => void;
  /** Callback to clear simulation state */
  onDesignChange: () => void;
};

type UseDesignHistoryReturn = {
  /** Undo the last change */
  undo: () => void;
  /** Redo the last undone change */
  redo: () => void;
  /** Copy selected node(s) to clipboard */
  copy: () => void;
  /** Paste clipboard contents */
  paste: () => void;
  /** Save current state to history (call after external changes) */
  saveToHistory: (nodes: PlacedNode[], edges: Edge[]) => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Whether clipboard has content */
  hasClipboard: boolean;
};

const MAX_HISTORY_SIZE = 50;

/**
 * Hook for managing undo/redo history and copy/paste for design canvas.
 * Handles keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+C, Ctrl+V).
 */
export function useDesignHistory({
  nodes,
  edges,
  editingLocked,
  selectedNodeId,
  slug,
  onStateChange,
  onDesignChange,
}: UseDesignHistoryOptions): UseDesignHistoryReturn {
  // History stack
  const historyRef = useRef<DesignSnapshot[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoActionRef = useRef<boolean>(false);

  // Clipboard for copy/paste
  const [clipboard, setClipboard] = useState<DesignSnapshot | null>(null);

  // Track history state for UI
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Update can undo/redo state
  const updateHistoryState = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  // Save current state to history
  const saveToHistory = useCallback(
    (nodesToSave: PlacedNode[], edgesToSave: Edge[]) => {
      if (isUndoRedoActionRef.current) {
        return; // Don't save history during undo/redo
      }

      const newState: DesignSnapshot = {
        nodes: safeDeepClone(nodesToSave),
        edges: safeDeepClone(edgesToSave),
      };

      // Remove any states after current index (when user makes new change after undo)
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);

      // Add new state
      historyRef.current.push(newState);
      historyIndexRef.current = historyRef.current.length - 1;

      // Limit history size
      if (historyRef.current.length > MAX_HISTORY_SIZE) {
        historyRef.current.shift();
        historyIndexRef.current--;
      }

      updateHistoryState();
    },
    [updateHistoryState]
  );

  // Initialize history with current state
  useEffect(() => {
    if (historyRef.current.length === 0) {
      saveToHistory(nodes, edges);
    }
  }, [nodes, edges, saveToHistory]);

  // Undo function
  const undo = useCallback(() => {
    if (editingLocked || historyIndexRef.current <= 0) return;

    historyIndexRef.current--;
    const prevState = historyRef.current[historyIndexRef.current];

    isUndoRedoActionRef.current = true;
    onStateChange(safeDeepClone(prevState.nodes), safeDeepClone(prevState.edges));
    onDesignChange();

    setTimeout(() => {
      isUndoRedoActionRef.current = false;
    }, 100);

    updateHistoryState();
    track("practice_design_undo", { slug });
  }, [editingLocked, onStateChange, onDesignChange, updateHistoryState, slug]);

  // Redo function
  const redo = useCallback(() => {
    if (editingLocked || historyIndexRef.current >= historyRef.current.length - 1) return;

    historyIndexRef.current++;
    const nextState = historyRef.current[historyIndexRef.current];

    isUndoRedoActionRef.current = true;
    onStateChange(safeDeepClone(nextState.nodes), safeDeepClone(nextState.edges));
    onDesignChange();

    setTimeout(() => {
      isUndoRedoActionRef.current = false;
    }, 100);

    updateHistoryState();
    track("practice_design_redo", { slug });
  }, [editingLocked, onStateChange, onDesignChange, updateHistoryState, slug]);

  // Copy function
  const copy = useCallback(() => {
    if (editingLocked) return;

    const nodesToCopy = selectedNodeId ? nodes.filter((node) => node.id === selectedNodeId) : nodes;

    const nodeIds = new Set(nodesToCopy.map((n) => n.id));
    const edgesToCopy = edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));

    setClipboard({
      nodes: safeDeepClone(nodesToCopy),
      edges: safeDeepClone(edgesToCopy),
    });

    track("practice_design_copy", { slug, nodeCount: nodesToCopy.length });
  }, [editingLocked, selectedNodeId, nodes, edges, slug]);

  // Paste function
  const paste = useCallback(() => {
    if (editingLocked || !clipboard || clipboard.nodes.length === 0) return;

    // Create ID mapping for pasted nodes
    const idMapping = new Map<string, string>();
    const pastedNodes: PlacedNode[] = clipboard.nodes.map((node) => {
      const uniqueId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newId = `node-${node.spec.kind}-${uniqueId}`;
      idMapping.set(node.id, newId);

      return {
        ...node,
        id: newId,
        x: node.x + 50, // Offset pasted nodes
        y: node.y + 50,
      };
    });

    // Update edges with new node IDs
    const pastedEdges: Edge[] = clipboard.edges.map((edge) => {
      const uniqueId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      return {
        ...edge,
        id: `edge-${uniqueId}`,
        from: idMapping.get(edge.from) || edge.from,
        to: idMapping.get(edge.to) || edge.to,
      };
    });

    const newNodes = [...nodes, ...pastedNodes];
    const newEdges = [...edges, ...pastedEdges];

    onStateChange(newNodes, newEdges);
    saveToHistory(newNodes, newEdges);
    onDesignChange();

    track("practice_design_paste", { slug, nodeCount: pastedNodes.length });
  }, [editingLocked, clipboard, nodes, edges, onStateChange, saveToHistory, onDesignChange, slug]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMod = event.ctrlKey || event.metaKey;

      // Undo: Ctrl+Z (without Shift)
      if (isMod && event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if (isMod && ((event.key === "z" && event.shiftKey) || event.key === "y")) {
        event.preventDefault();
        redo();
        return;
      }

      // Copy: Ctrl+C
      if (isMod && event.key === "c") {
        event.preventDefault();
        copy();
        return;
      }

      // Paste: Ctrl+V
      if (isMod && event.key === "v") {
        event.preventDefault();
        paste();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, copy, paste]);

  return {
    undo,
    redo,
    copy,
    paste,
    saveToHistory,
    canUndo,
    canRedo,
    hasClipboard: clipboard !== null && clipboard.nodes.length > 0,
  };
}
