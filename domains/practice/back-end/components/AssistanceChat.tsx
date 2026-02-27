"use client";

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { usePractice } from "../context/PracticeContext";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const MAX_TEXTAREA_ROWS = 7;
const LINE_HEIGHT_PX = 20;
const TEXTAREA_PADDING_PX = 16;
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
    /* corrupted data — ignore */
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

function autoResize(el: HTMLTextAreaElement) {
  const minHeight = LINE_HEIGHT_PX + TEXTAREA_PADDING_PX;
  const maxHeight = LINE_HEIGHT_PX * MAX_TEXTAREA_ROWS + TEXTAREA_PADDING_PX;
  el.style.height = `${minHeight}px`;
  el.style.height = `${Math.max(minHeight, Math.min(el.scrollHeight, maxHeight))}px`;
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <p className="text-sm text-zinc-500 text-center leading-relaxed">
        Ask anything about this step
      </p>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser ? "bg-zinc-800 text-zinc-200" : "border border-zinc-800 bg-zinc-900 text-zinc-300"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

export function AssistanceChat() {
  const { slug, stepType } = usePractice();
  const step = stepType ?? "";

  const [messages, setMessages] = useState<Message[]>(() => readPersistedMessages(slug, step));
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(readPersistedMessages(slug, step));
  }, [slug, step]);

  useEffect(() => {
    persistMessages(slug, step, messages);
  }, [messages, slug, step]);

  const scrollToBottom = useCallback(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) autoResize(textareaRef.current);
  }, [input]);

  const trimmed = input.trim();
  const canSend = trimmed.length > 0;

  const handleSend = useCallback(() => {
    if (!trimmed) return;
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [trimmed]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Message area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            <div ref={scrollAnchorRef} />
          </>
        )}
      </div>

      {/* Composer */}
      <div className="flex-shrink-0 border-t border-zinc-800 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 leading-5"
          />
          <button
            type="button"
            disabled={!canSend}
            onClick={handleSend}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
