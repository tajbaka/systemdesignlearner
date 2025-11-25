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
      {topBar}
      {canvas}

      {/* Bottom Panel - Collapsible */}
      {bottomPanel}

      {/* Add Component Bottom Sheet */}
      {addSheet}
    </div>
  );
}
