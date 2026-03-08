import { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

interface ToolbarAction {
  key: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

interface FloatingToolbarProps {
  children: ReactNode;
  wrapperRef: RefObject<HTMLDivElement | null>;
  toolbarRef: RefObject<HTMLDivElement | null>;
  position: { x: number; y: number } | null;
  isVisible: boolean;
  mounted: boolean;
  actions: ToolbarAction[];
  onWrapperMouseUp?: () => void;
}

export function FloatingToolbar({
  children,
  wrapperRef,
  toolbarRef,
  position,
  isVisible,
  mounted,
  actions,
  onWrapperMouseUp,
}: FloatingToolbarProps) {
  return (
    <div ref={wrapperRef} onMouseUp={onWrapperMouseUp}>
      {children}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isVisible && position && (
              <motion.div
                ref={toolbarRef}
                initial={{ opacity: 0, scale: 0.9, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 4 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="fixed z-[9999] flex items-center rounded-lg bg-zinc-800 shadow-xl"
                style={{
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  transform: "translate(-50%, calc(-100% - 10px))",
                }}
              >
                {actions.map((action, i) => (
                  <span key={action.key} className="flex items-center">
                    {i > 0 && <div className="h-5 w-px bg-zinc-600" />}
                    <button
                      onClick={action.onClick}
                      className={`flex cursor-pointer items-center gap-1.5 border-none bg-transparent px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-zinc-700 ${
                        i === 0 ? "rounded-l-lg" : ""
                      } ${i === actions.length - 1 ? "rounded-r-lg" : ""}`}
                    >
                      {action.icon}
                      {action.label}
                    </button>
                  </span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
