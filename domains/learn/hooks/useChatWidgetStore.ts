"use client";

import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { chatWidgetStore, type ChatWidgetState } from "../store/chatWidgetStore";

export function useChatWidgetStore() {
  return useStore(
    chatWidgetStore,
    useShallow((s: ChatWidgetState) => s)
  );
}
