"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ChatEntry {
  id: string;
  title: string;
  createdAt: string;
}

export interface ChatWidgetState {
  isOpen: boolean;
  inputValue: string;
  isHistoryOpen: boolean;
  activeChatId: string | null;
  currentSlug: string | null;
  chatsBySlug: Record<string, ChatEntry[]>;

  setIsOpen: (isOpen: boolean) => void;
  setInputValue: (value: string) => void;
  setIsHistoryOpen: (isOpen: boolean) => void;
  setActiveChatId: (id: string | null) => void;
  setCurrentSlug: (slug: string) => void;
  toggle: () => void;
  toggleHistory: () => void;
  askAI: (question: string, slug: string) => void;
  createChat: (title: string, slug: string) => string;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const chatWidgetStore = create<ChatWidgetState>()(
  persist(
    (set) => ({
      isOpen: false,
      inputValue: "",
      isHistoryOpen: false,
      activeChatId: null,
      currentSlug: null,
      chatsBySlug: {},

      setIsOpen: (isOpen) => set({ isOpen }),
      setInputValue: (value) => set({ inputValue: value }),
      setIsHistoryOpen: (isOpen) => set({ isHistoryOpen: isOpen }),
      setActiveChatId: (id) => set({ activeChatId: id }),
      setCurrentSlug: (slug) => set({ currentSlug: slug }),

      toggle: () => set((state) => ({ isOpen: !state.isOpen, isHistoryOpen: false })),

      toggleHistory: () => set((state) => ({ isHistoryOpen: !state.isHistoryOpen })),

      askAI: (question, slug) =>
        set({
          inputValue: question,
          isOpen: true,
          isHistoryOpen: false,
          currentSlug: slug,
        }),

      createChat: (title, slug) => {
        const id = generateId();
        const entry: ChatEntry = {
          id,
          title,
          createdAt: new Date().toISOString(),
        };
        set((state) => {
          const existing = state.chatsBySlug[slug] ?? [];
          return {
            chatsBySlug: { ...state.chatsBySlug, [slug]: [entry, ...existing] },
            activeChatId: id,
          };
        });
        return id;
      },
    }),
    {
      name: "chat-widget-storage",
      partialize: (state) => ({ chatsBySlug: state.chatsBySlug }),
    }
  )
);
