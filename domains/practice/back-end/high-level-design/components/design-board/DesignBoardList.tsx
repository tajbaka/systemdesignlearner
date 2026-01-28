"use client";

import Palette from "./Palette";
import type React from "react";

export type PaletteListItem = {
  id: string;
  name: string;
  icon?: React.ComponentType<Record<string, unknown>>;
};

type DesignBoardListProps = {
  isOpen: boolean;
  paletteItems: PaletteListItem[];
  onClose: () => void;
  onSpawn: (id: string) => void;
};

export function DesignBoardList({ isOpen, paletteItems, onClose, onSpawn }: DesignBoardListProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Sidebar - fullscreen on mobile, bottom drawer on desktop */}
      <div className="absolute inset-0 z-50 flex flex-col bg-zinc-900 lg:relative lg:inset-auto lg:rounded-t-3xl lg:max-h-[60vh] border border-zinc-800 shadow-2xl transition-transform duration-300 ease-out translate-y-0 pointer-events-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white">Components</h2>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-full p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0 lg:max-h-[calc(60vh-4rem)]">
          <Palette
            componentLibrary={paletteItems}
            onSpawn={onSpawn}
            onClose={onClose}
            className="h-full"
            listClassName="pb-10"
          />
        </div>
      </div>
    </>
  );
}
