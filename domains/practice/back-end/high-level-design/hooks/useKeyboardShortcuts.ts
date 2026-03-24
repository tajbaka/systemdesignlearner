"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { PlacedNode, Edge, ComponentName } from "../types";

type HistoryEntry = {
  nodes: PlacedNode[];
  edges: Edge[];
};

type UseKeyboardShortcutsProps = {
  nodes: PlacedNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  onDesignChange: (nodes: PlacedNode[], edges: Edge[]) => void;
  isReadOnly?: boolean;
  typeToNameMap: Map<string, string>;
};

export function useKeyboardShortcuts({
  nodes,
  edges,
  selectedNodeId,
  onDesignChange,
  isReadOnly = false,
  typeToNameMap,
}: UseKeyboardShortcutsProps) {
  // Clipboard state for copy/paste
  const [clipboard, setClipboard] = useState<PlacedNode | null>(null);

  // History stack for undo (stores previous states)
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Redo history stack (stores states that were undone)
  const [redoHistory, setRedoHistory] = useState<HistoryEntry[]>([]);

  // Use ref to track if we just did an undo (to prevent saving undo as new history)
  const justUndoneRef = useRef(false);

  // Use ref to track if we just did a redo (to prevent saving redo as new history)
  const justRedoneRef = useRef(false);

  // Save current state to history before making changes
  const saveToHistory = useCallback(() => {
    if (isReadOnly) return;
    // Don't save if we just undid (prevents undo from creating new history entry)
    if (justUndoneRef.current) {
      justUndoneRef.current = false;
      return;
    }
    // Don't save if we just redid (prevents redo from creating new history entry)
    if (justRedoneRef.current) {
      justRedoneRef.current = false;
      return;
    }
    // Clear redo history when a new action is taken
    setRedoHistory([]);
    setHistory((prev) => {
      // Limit history to 50 entries to prevent memory issues
      const newHistory = [...prev, { nodes: [...nodes], edges: [...edges] }];
      if (newHistory.length > 50) {
        return newHistory.slice(-50);
      }
      return newHistory;
    });
  }, [isReadOnly, nodes, edges]);

  // Copy selected node to clipboard
  const handleCopy = useCallback(() => {
    if (isReadOnly || !selectedNodeId) return;
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (node) {
      setClipboard({ ...node });
    }
  }, [isReadOnly, selectedNodeId, nodes]);

  // Paste from clipboard with position offset
  const handlePaste = useCallback(() => {
    if (isReadOnly || !clipboard) return;

    // Save current state before paste
    saveToHistory();

    const newNodeId = `node-${clipboard.type}-${Date.now()}`;
    const newNode: PlacedNode = {
      id: newNodeId,
      type: clipboard.type,
      name: (clipboard.name || typeToNameMap.get(clipboard.type) || clipboard.type) as
        | ComponentName
        | undefined,
      x: clipboard.x + 50, // Offset position
      y: clipboard.y + 50,
    };

    onDesignChange([...nodes, newNode], edges);
  }, [isReadOnly, clipboard, nodes, edges, onDesignChange, saveToHistory, typeToNameMap]);

  // Undo last action
  const handleUndo = useCallback(() => {
    if (isReadOnly || history.length === 0) return;

    // Save current state to redo history before undoing
    setRedoHistory((prev) => [...prev, { nodes: [...nodes], edges: [...edges] }]);

    const lastState = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));

    // Mark that we just undid to prevent saving this as new history
    justUndoneRef.current = true;
    onDesignChange(lastState.nodes, lastState.edges);
  }, [isReadOnly, history, nodes, edges, onDesignChange]);

  // Redo last undone action
  const handleRedo = useCallback(() => {
    if (isReadOnly || redoHistory.length === 0) return;

    // Save current state to undo history
    setHistory((prev) => [...prev, { nodes: [...nodes], edges: [...edges] }]);

    const nextState = redoHistory[redoHistory.length - 1];
    setRedoHistory((prev) => prev.slice(0, -1));

    // Mark that we just redid to prevent saving this as new history
    justRedoneRef.current = true;
    onDesignChange(nextState.nodes, nextState.edges);
  }, [isReadOnly, redoHistory, nodes, edges, onDesignChange]);

  // Setup keyboard event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if read-only
      if (isReadOnly) return;

      // Skip if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMac = navigator.platform.includes("Mac");
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key.toLowerCase() === "c") {
        e.preventDefault();
        handleCopy();
      }
      if (modifier && e.key.toLowerCase() === "v") {
        e.preventDefault();
        handlePaste();
      }
      if (modifier && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if (modifier && e.key.toLowerCase() === "z" && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isReadOnly, handleCopy, handlePaste, handleUndo, handleRedo]);

  return {
    saveToHistory,
    clipboard,
    history,
    redoHistory,
  };
}
