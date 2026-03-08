"use client";

import { useCallback, useMemo, useEffect, ChangeEvent, FormEvent } from "react";
import { OverlayListItem } from "../components/collapsible-panel/AnimatedOverlayList";
import { useChatWidgetStore } from "./useChatWidgetStore";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function useChatWidgetHandlers(slug: string) {
  const {
    isOpen,
    inputValue,
    isHistoryOpen,
    activeChatId,
    chatsBySlug,
    setInputValue,
    setCurrentSlug,
    toggle,
    toggleHistory,
    setActiveChatId,
    setIsHistoryOpen,
    createChat,
  } = useChatWidgetStore();

  useEffect(() => {
    setCurrentSlug(slug);
  }, [slug, setCurrentSlug]);

  const chatHistory: (OverlayListItem & { date: string })[] = useMemo(() => {
    const entries = chatsBySlug[slug] ?? [];
    return entries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      date: formatDate(entry.createdAt),
    }));
  }, [chatsBySlug, slug]);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    },
    [setInputValue]
  );

  const handleSend = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!inputValue.trim()) return;
      createChat(inputValue.trim(), slug);
      setInputValue("");
    },
    [inputValue, setInputValue, createChat, slug]
  );

  const handleNewChat = useCallback(() => {
    setActiveChatId(null);
    setInputValue("");
    setIsHistoryOpen(false);
  }, [setActiveChatId, setInputValue, setIsHistoryOpen]);

  const handleHistorySelect = useCallback(
    (id: string) => {
      setActiveChatId(id);
      setIsHistoryOpen(false);
    },
    [setActiveChatId, setIsHistoryOpen]
  );

  return {
    isOpen,
    inputValue,
    isHistoryOpen,
    activeChatId,
    chatHistory,
    toggle,
    toggleHistory,
    handleInputChange,
    handleSend,
    handleNewChat,
    handleHistorySelect,
  };
}
