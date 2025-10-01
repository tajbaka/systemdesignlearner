"use client";
import React, { ReactNode } from "react";

interface MobileSimulationPanelProps {
  isCollapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export default function MobileSimulationPanel({
  isCollapsed,
  onToggle,
  children
}: MobileSimulationPanelProps) {

  return (
    <div 
      className="flex-shrink-0 border-t border-white/10 bg-zinc-900/95 backdrop-blur-sm shadow-2xl flex flex-col lg:hidden"
      style={{ 
        paddingBottom: "env(safe-area-inset-bottom)",
        height: isCollapsed ? "60px" : "auto",
        maxHeight: isCollapsed ? "60px" : "70vh"
      }}
    >
      {/* Collapse/Expand Button */}
      <button
        onClick={onToggle}
        className="flex-shrink-0 w-full py-2 flex items-center justify-center gap-2 text-zinc-400 hover:text-zinc-200 transition touch-manipulation"
        aria-label={isCollapsed ? "Expand simulation panel" : "Collapse simulation panel"}
      >
        <div className="w-12 h-1 rounded-full bg-white/20" />
        <svg 
          className={`w-5 h-5 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Scrollable Content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto px-3 pb-3 sm:px-4 sm:pb-4 max-w-4xl mx-auto w-full min-h-0">
          {children}
        </div>
      )}
    </div>
  );
}

