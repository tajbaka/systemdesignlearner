"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

const STORAGE_PREFIX = "assistance-chat:";

function storageKey(slug: string, step: string) {
  return `${STORAGE_PREFIX}${slug}:${step}`;
}

function readPersistedMessages(slug: string, step: string): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(slug, step));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* corrupted — ignore */
  }
  return [];
}

function persistMessages(slug: string, step: string, messages: Message[]) {
  try {
    if (messages.length === 0) {
      localStorage.removeItem(storageKey(slug, step));
    } else {
      localStorage.setItem(storageKey(slug, step), JSON.stringify(messages));
    }
  } catch {
    /* storage full — ignore */
  }
}

export type UseAssistanceChatReturn = {
  messages: Message[];
  send: (content: string) => void;
  isStreaming: boolean;
  error: string | null;
};

export function useAssistanceChat(slug: string, step: string): UseAssistanceChatReturn {
  const [messages, setMessages] = useState<Message[]>(() => readPersistedMessages(slug, step));
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMessages(readPersistedMessages(slug, step));
  }, [slug, step]);

  useEffect(() => {
    if (!isStreaming) {
      persistMessages(slug, step, messages);
    }
  }, [messages, slug, step, isStreaming]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const send = useCallback(
    (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      const userMessage: Message = { role: "user", content: trimmed };
      const assistantPlaceholder: Message = { role: "assistant", content: "" };

      setMessages((prev) => {
        const next = [...prev, userMessage, assistantPlaceholder];
        streamResponse(next);
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isStreaming, slug, step]
  );

  async function streamResponse(currentMessages: Message[]) {
    setIsStreaming(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const messagesToSend = currentMessages.slice(0, -1);

      const response = await fetch(`/api/v2/practice/${slug}/${step}/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesToSend }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? `Request failed (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);

          if (payload === "[DONE]") break;

          try {
            const text = JSON.parse(payload) as string;
            if (text === "[ERROR]") {
              throw new Error("Server encountered an error while generating a response.");
            }
            accumulated += text;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: accumulated };
              return updated;
            });
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message.includes("Server encountered")) {
              throw parseErr;
            }
          }
        }
      }

      if (!accumulated) {
        setMessages((prev) => prev.slice(0, -1));
        setError("No response received. Please try again.");
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;

      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  return { messages, send, isStreaming, error };
}
