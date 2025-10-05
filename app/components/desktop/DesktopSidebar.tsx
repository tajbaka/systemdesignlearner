"use client";
import React, { ReactNode } from "react";

interface DesktopSidebarProps {
  palette: ReactNode;
  controls: ReactNode;
  scenarioPanel: ReactNode;
  selectedNodePanel: ReactNode;
  isReadOnly: boolean;
  readOnlyMessage?: ReactNode;
}

export default function DesktopSidebar({
  palette,
  controls,
  scenarioPanel,
  selectedNodePanel,
  isReadOnly,
  readOnlyMessage,
}: DesktopSidebarProps) {
  return (
    <>
      {/* Palette */}
      {palette}
      
      {/* Controls */}
      <div className="flex gap-2 flex-wrap flex-shrink-0 items-center">
        {controls}
      </div>
      
      {/* Read-only message */}
      {isReadOnly && readOnlyMessage}
      
      {/* Scenario Panel */}
      <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
        {scenarioPanel}
      </div>
      
      {/* Selected Node Panel */}
      <div className="flex-shrink-0">
        {selectedNodePanel}
      </div>
    </>
  );
}

