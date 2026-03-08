"use client";

import { useMemo } from "react";
import { MessageCircle, Sparkles, History, SquarePen, MessageSquare } from "lucide-react";
import { CollapsiblePanel } from "./components/collapsible-panel/CollapsiblePanel";
import { AnimatedOverlayList } from "./components/collapsible-panel/AnimatedOverlayList";
import { useChatWidgetHandlers } from "./hooks/useChatWidgetHandlers";

interface ChatWidgetProps {
  slug: string;
}

export function ChatWidget({ slug }: ChatWidgetProps) {
  const {
    isOpen,
    inputValue,
    isHistoryOpen,
    chatHistory,
    toggle,
    toggleHistory,
    handleInputChange,
    handleSend,
    handleNewChat,
    handleHistorySelect,
  } = useChatWidgetHandlers(slug);

  const headerActions = useMemo(
    () => [
      { key: "history", icon: <History size={15} />, onClick: toggleHistory },
      { key: "new", icon: <SquarePen size={15} />, onClick: handleNewChat },
    ],
    [toggleHistory, handleNewChat]
  );

  const overlayItems = useMemo(
    () => chatHistory.map((h) => ({ id: h.id, title: h.title, subtitle: h.date })),
    [chatHistory]
  );

  return (
    <CollapsiblePanel
      isOpen={isOpen}
      onToggle={toggle}
      title="AI Assistant"
      titleIcon={<Sparkles size={16} className="text-emerald-400" />}
      headerActions={headerActions}
      collapsedIcon={<MessageCircle size={16} className="text-zinc-400" />}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onSubmit={handleSend}
      inputPlaceholder="Ask a question..."
      overlay={
        <AnimatedOverlayList
          items={overlayItems}
          isOpen={isHistoryOpen}
          onSelect={handleHistorySelect}
          heading="Recent chats"
          emptyMessage="No previous chats"
          itemIcon={<MessageSquare size={14} className="text-zinc-400" />}
        />
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
          <Sparkles size={20} className="text-emerald-500" />
        </div>
        <p className="text-[14px] font-medium text-zinc-700">How can I help?</p>
        <p className="max-w-[260px] text-[13px] leading-relaxed text-zinc-400">
          Ask me anything about the article or system design concepts.
        </p>
      </div>
    </CollapsiblePanel>
  );
}
