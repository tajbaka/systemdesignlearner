import { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { ChangeEvent, FormEvent } from "react";

interface HeaderAction {
  key: string;
  icon: ReactNode;
  onClick: () => void;
}

interface CollapsiblePanelProps {
  isOpen: boolean;
  onToggle: () => void;
  title: string;
  titleIcon?: ReactNode;
  headerActions?: HeaderAction[];
  collapsedIcon?: ReactNode;
  overlay?: ReactNode;
  children: ReactNode;
  inputValue: string;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: FormEvent) => void;
  inputPlaceholder?: string;
  expandedHeight?: number;
}

export function CollapsiblePanel({
  isOpen,
  onToggle,
  title,
  titleIcon,
  headerActions,
  collapsedIcon,
  overlay,
  children,
  inputValue,
  onInputChange,
  onSubmit,
  inputPlaceholder = "Type a message...",
  expandedHeight = 440,
}: CollapsiblePanelProps) {
  return (
    <div className="fixed bottom-0 right-6 z-[9998] w-[calc(100vw-3rem)] sm:w-[380px] md:right-8">
      <button
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-t-lg border border-b-0 border-zinc-200 bg-zinc-800 px-4 py-2.5 text-white shadow-lg transition-colors hover:bg-zinc-700"
      >
        <div className="flex items-center gap-2">
          {titleIcon}
          <span className="text-[13px] font-semibold">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          {isOpen &&
            headerActions?.map((action) => (
              <span
                key={action.key}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    action.onClick();
                  }
                }}
                className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
              >
                {action.icon}
              </span>
            ))}
          {isOpen ? (
            <ChevronDown size={16} className="text-zinc-400" />
          ) : (
            (collapsedIcon ?? <ChevronDown size={16} className="rotate-180 text-zinc-400" />)
          )}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: expandedHeight }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="relative flex w-full flex-col overflow-hidden border-x border-b border-zinc-200 bg-white shadow-2xl"
          >
            {overlay}

            <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>

            <form
              onSubmit={onSubmit}
              className="flex items-center gap-2 border-t border-zinc-200 bg-zinc-50 px-3 py-3"
            >
              <input
                type="text"
                value={inputValue}
                onChange={onInputChange}
                placeholder={inputPlaceholder}
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none bg-emerald-500 text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronDown size={16} className="-rotate-90" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
