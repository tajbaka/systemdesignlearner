"use client";

import { useEffect, type ReactNode } from "react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Sidebar({ isOpen, onClose, title, children }: SidebarProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar - Full width on mobile, narrower on desktop */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl border border-zinc-800 bg-zinc-900 shadow-2xl transition-transform duration-300 ease-out lg:inset-x-auto lg:right-6 lg:w-full lg:max-w-md ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
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
        <div className="max-h-[60vh] flex-1 overflow-y-auto lg:max-h-[70vh]">{children}</div>
      </div>
    </>
  );
}

export default Sidebar;
