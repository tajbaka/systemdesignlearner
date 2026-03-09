"use client";

import { useCallback } from "react";
import { usePractice } from "./context/PracticeContext";
import { useAssistanceChat } from "./hooks/useAssistanceChat";
import { ChatView } from "./components/ChatView";

export function AssistanceChat() {
  const { slug, stepSlug, stepType, handlers } = usePractice();
  const step = stepSlug ?? "";

  const { messages, send, stop, clearMessages, retry, isStreaming, error } = useAssistanceChat(
    slug,
    step
  );

  const onQuestionSubmit = useCallback(
    (message: string) => {
      if (stepType) {
        const handler = handlers[stepType as keyof typeof handlers];
        if (typeof handler === "function") {
          handler("assistanceQuestion", message);
        }
      }
    },
    [stepType, handlers]
  );

  return (
    <ChatView
      messages={messages}
      onSend={send}
      onStop={stop}
      onClearMessages={clearMessages}
      onRetry={retry}
      isStreaming={isStreaming}
      error={error}
      onQuestionSubmit={onQuestionSubmit}
    />
  );
}
