import { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface OverlayListItem {
  id: string;
  title: string;
  subtitle?: string;
}

interface AnimatedOverlayListProps {
  items: OverlayListItem[];
  isOpen: boolean;
  onSelect: (id: string) => void;
  heading?: string;
  emptyMessage?: string;
  itemIcon?: ReactNode;
}

export function AnimatedOverlayList({
  items,
  isOpen,
  onSelect,
  heading,
  emptyMessage = "No items",
  itemIcon,
}: AnimatedOverlayListProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="absolute left-0 right-0 top-0 z-10 max-h-[320px] overflow-y-auto border-b border-zinc-200 bg-white shadow-md"
        >
          {heading && (
            <div className="px-3 pb-1 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                {heading}
              </p>
            </div>
          )}
          <ul className="flex flex-col py-1">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onSelect(item.id)}
                  className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-3 py-2 text-left transition-colors hover:bg-zinc-50"
                >
                  {itemIcon && <span className="shrink-0">{itemIcon}</span>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-zinc-700">{item.title}</p>
                    {item.subtitle && <p className="text-[11px] text-zinc-400">{item.subtitle}</p>}
                  </div>
                </button>
              </li>
            ))}
            {items.length === 0 && (
              <li className="px-3 py-4 text-center text-[13px] text-zinc-400">{emptyMessage}</li>
            )}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
