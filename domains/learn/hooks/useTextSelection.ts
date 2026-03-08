"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface PopupPosition {
  x: number;
  y: number;
}

export function useTextSelection() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState("");
  const [position, setPosition] = useState<PopupPosition | null>(null);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = useCallback(() => {
    setSelectedText("");
    setPosition(null);
    setCopied(false);
  }, []);

  const handleMouseUp = useCallback(() => {
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? "";

      if (!text || !selection || selection.rangeCount === 0) {
        return;
      }

      const range = selection.getRangeAt(0);
      if (!wrapperRef.current?.contains(range.commonAncestorContainer)) {
        return;
      }

      const rect = range.getBoundingClientRect();

      setSelectedText(text);
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
      setCopied(false);
    });
  }, []);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (popupRef.current?.contains(e.target as Node)) return;
      dismiss();
    },
    [dismiss]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    },
    [dismiss]
  );

  const handleScroll = useCallback(() => {
    if (!position) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.toString().trim()) {
      dismiss();
      return;
    }
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }, [position, dismiss]);

  useEffect(() => {
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [handleMouseDown, handleKeyDown, handleScroll]);

  const handleCopy = useCallback(async () => {
    if (!selectedText) return;
    try {
      await navigator.clipboard.writeText(selectedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may fail in insecure contexts
    }
  }, [selectedText]);

  const isVisible = !!position && !!selectedText;

  return {
    wrapperRef,
    popupRef,
    position,
    copied,
    mounted,
    isVisible,
    handleMouseUp,
    handleCopy,
    dismiss,
    selectedText,
  };
}
