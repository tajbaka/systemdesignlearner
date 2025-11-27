"use client";
import React, { ReactNode } from "react";

interface MobileLayoutProps {
  canvas: ReactNode;
  bottomBar: ReactNode;
}

export default function MobileLayout({ bottomBar, canvas }: MobileLayoutProps) {
  return (
    <div className="w-full h-screen flex flex-col bg-zinc-950 lg:hidden">
      <div className="flex-1 overflow-hidden">{canvas}</div>
      <div className="flex-shrink-0 z-100">{bottomBar}</div>
    </div>
  );
}
