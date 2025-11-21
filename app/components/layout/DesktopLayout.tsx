"use client";
import React, { ReactNode } from "react";

interface DesktopLayoutProps {
  canvas: ReactNode;
}

export default function DesktopLayout({ canvas }: DesktopLayoutProps) {
  return (
    <div className="hidden lg:grid w-full h-screen  gap-4 pt-4 pr-4 pl-4 pb-20 bg-zinc-950 overflow-hidden">
      {/* Sidebar */}
      {/* <div className="flex min-h-0 flex-col gap-3 h-full overflow-hidden"></div> */}

      {/* Board */}
      {canvas}
    </div>
  );
}
