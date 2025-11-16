"use client";
import React, { ReactNode } from "react";

interface MobileLayoutProps {
  topBar: ReactNode;
  canvas: ReactNode;
  bottomPanel: ReactNode;
  addSheet: ReactNode;
}

export default function MobileLayout({ topBar, canvas, bottomPanel, addSheet }: MobileLayoutProps) {
  return (
    <div className="w-full h-screen flex flex-col bg-zinc-950 overflow-hidden lg:hidden">
      {/* Mobile Top Bar */}
      {topBar}

      {/* Canvas - Full height */}
      <div className="flex-1 relative min-h-0">{canvas}</div>

      {/* Bottom Panel - Collapsible */}
      {bottomPanel}

      {/* Add Component Bottom Sheet */}
      {addSheet}
    </div>
  );
}
