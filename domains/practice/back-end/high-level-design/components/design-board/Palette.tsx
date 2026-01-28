"use client";
import type { PaletteListItem } from "./DesignBoardList";

interface PaletteProps {
  componentLibrary: PaletteListItem[];
  onSpawn: (id: string) => void;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  className?: string;
  listClassName?: string;
}

export default function Palette({
  componentLibrary,
  onSpawn,
  onClose,
  title = "",
  subtitle = "",
  className,
  listClassName,
}: PaletteProps) {
  const listSpacing = title || subtitle ? "mt-3" : "";

  return (
    <div className={className ?? "flex flex-col gap-3 h-full min-h-0"}>
      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col flex-1 min-h-0">
        {title ? <h2 className="text-base text-zinc-300 font-semibold">{title}</h2> : null}
        {subtitle ? <p className="text-xs text-zinc-400 mt-1">{subtitle}</p> : null}
        <div
          className={`${listSpacing} grid grid-cols-1 gap-1.5 overflow-y-auto min-h-0 flex-1 scrollbar-hide ${
            listClassName ?? ""
          }`}
        >
          {componentLibrary.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className="px-2.5 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition text-left flex-shrink-0 cursor-pointer"
                onClick={() => {
                  onSpawn(item.id);
                  onClose?.();
                }}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-sds-type", item.id);
                  e.dataTransfer.setData("text/plain", item.id);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                title={item.name}
              >
                <div className="flex items-center min-w-0">
                  <span className="text-zinc-300 flex items-center gap-2 min-w-0 flex-1 text-sm">
                    {Icon ? <Icon className="text-zinc-200 flex-shrink-0" size={14} /> : null}
                    <span className="truncate">{item.name}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
