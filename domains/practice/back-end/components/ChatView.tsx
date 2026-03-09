"use client";

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Square, Trash2, RotateCcw } from "lucide-react";
import type { Message } from "../hooks/useAssistanceChat";

const MAX_TEXTAREA_ROWS = 7;
const LINE_HEIGHT_PX = 20;
const TEXTAREA_PADDING_PX = 16;

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

function StreamingIndicator() {
  return (
    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400 align-middle" />
  );
}

function MessageBubble({
  message,
  isLastAssistant,
  isStreaming,
}: {
  message: Message;
  isLastAssistant: boolean;
  isStreaming: boolean;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap bg-zinc-800 text-zinc-200">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed border border-zinc-800 bg-zinc-900 text-zinc-300 prose prose-invert prose-sm prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-2 prose-code:text-emerald-300 max-w-none">
        {message.content ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        ) : isLastAssistant && isStreaming ? (
          <StreamingIndicator />
        ) : null}
        {isLastAssistant && isStreaming && message.content && (
          <span className="ml-1">
            <StreamingIndicator />
          </span>
        )}
      </div>
    </div>
  );
}

export type ChatViewProps = {
  messages: Message[];
  onSend: (content: string) => void;
  onStop: () => void;
  onClearMessages: () => void;
  onRetry: () => void;
  isStreaming: boolean;
  error: string | null;
  onQuestionSubmit?: (message: string) => void;
};

export function ChatView({
  messages,
  onSend,
  onStop,
  onClearMessages,
  onRetry,
  isStreaming,
  error,
  onQuestionSubmit,
}: ChatViewProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

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
  const canSend = trimmed.length > 0 && !isStreaming;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onQuestionSubmit?.(trimmed);
    onSend(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [canSend, trimmed, onSend, onQuestionSubmit]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const lastAssistantIdx = messages.reduce(
    (acc, msg, i) => (msg.role === "assistant" ? i : acc),
    -1
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                message={msg}
                isLastAssistant={i === lastAssistantIdx}
                isStreaming={isStreaming}
              />
            ))}
            <div ref={scrollAnchorRef} />
          </>
        )}
      </div>

      {error && (
        <div className="flex-shrink-0 px-4 pb-1 flex items-center gap-2">
          <p className="text-xs text-red-400">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
            aria-label="Retry last message"
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}

      <div className="flex-shrink-0 border-t border-zinc-800 p-3">
        <div className="flex items-end gap-2">
          {messages.length > 0 && !isStreaming && (
            <button
              type="button"
              onClick={onClearMessages}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              aria-label="Clear conversation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            rows={1}
            aria-label="Chat message input"
            className="flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 leading-5"
          />
          <button
            type="button"
            disabled={isStreaming ? false : !canSend}
            onClick={isStreaming ? onStop : handleSend}
            aria-label={isStreaming ? "Stop generating" : "Send message"}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600"
          >
            {isStreaming ? <Square className="h-3 w-3" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
