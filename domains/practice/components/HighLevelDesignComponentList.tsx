"use client";

import Palette from "./Palette";
import type { ComponentKind } from "@/domains/practice/types";

type HighLevelDesignComponentListProps = {
  isOpen: boolean;
  paletteItems: ComponentKind[];
  onClose: () => void;
  onSpawn: (kind: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
};

export function HighLevelDesignComponentList({
  isOpen,
  paletteItems,
  onClose,
  onSpawn,
  onDragOver,
  onDrop,
}: HighLevelDesignComponentListProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Invisible backdrop - pointer-events-none on palette, but handles drag/drop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300 pointer-events-none"
        onDragOver={onDragOver}
        onDrop={onDrop}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl border border-zinc-800 bg-zinc-900 shadow-2xl transition-transform duration-300 ease-out lg:inset-x-auto lg:right-6 lg:w-full lg:max-w-md translate-y-0 pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
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
        <div className="max-h-[60vh] flex-1 overflow-y-auto lg:max-h-[70vh]">
          <Palette
            componentLibrary={paletteItems}
            onSpawn={onSpawn}
            className="h-full"
            listClassName="pb-10"
          />
        </div>
      </div>
    </>
  );
}
