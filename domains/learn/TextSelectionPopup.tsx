"use client";

import { ReactNode, useCallback, useMemo } from "react";
import { Copy, Check, Sparkles } from "lucide-react";
import { FloatingToolbar } from "./components/FloatingToolbar";
import { useTextSelection } from "./hooks/useTextSelection";
import { chatWidgetStore } from "./store/chatWidgetStore";

interface TextSelectionPopupProps {
  children: ReactNode;
  articleTitle?: string;
  slug: string;
}

export function TextSelectionPopup({ children, articleTitle, slug }: TextSelectionPopupProps) {
  const {
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
  } = useTextSelection();

  const handleAskAI = useCallback(() => {
    const article = articleTitle ? ` from article '${articleTitle}'` : "";
    const question = `What does "${selectedText}"${article} mean?`;
    chatWidgetStore.getState().askAI(question, slug);
    dismiss();
  }, [articleTitle, selectedText, slug, dismiss]);

  const actions = useMemo(
    () => [
      {
        key: "copy",
        icon: copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />,
        label: copied ? "Copied" : "Copy",
        onClick: handleCopy,
      },
      {
        key: "ask-ai",
        icon: <Sparkles size={16} />,
        label: "Ask AI",
        onClick: handleAskAI,
      },
    ],
    [copied, handleCopy, handleAskAI]
  );

  return (
    <FloatingToolbar
      wrapperRef={wrapperRef}
      toolbarRef={popupRef}
      position={position}
      isVisible={isVisible}
      mounted={mounted}
      actions={actions}
      onWrapperMouseUp={handleMouseUp}
    >
      {children}
    </FloatingToolbar>
  );
}
