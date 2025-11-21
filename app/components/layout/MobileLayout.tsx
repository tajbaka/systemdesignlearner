"use client";
import React, { ReactNode } from "react";

interface MobileLayoutProps {
  // topBar: ReactNode;
  canvas: ReactNode;
  // bottomPanel: ReactNode;
  // addSheet: ReactNode;
}

export default function MobileLayout({ canvas }: MobileLayoutProps) {
  return (
    <div className="w-full h-screen flex flex-col bg-zinc-950 overflow-hidden lg:hidden">
      {canvas}

      {/* Bottom Panel - Collapsible */}
      {/* {bottomPanel}

      {/* Add Component Bottom Sheet */}
      {/* {addSheet} */}
    </div>
  );
}
