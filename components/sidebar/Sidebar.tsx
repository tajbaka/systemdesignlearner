"use client";

import { SidebarMobile } from "./SidebarMobile";
import { SidebarDesktop } from "./SidebarDesktop";
import type { SidebarConfig } from "./types";
import { useIsMobile } from "@/hooks/useIsMobile";

interface SidebarProps {
  config: SidebarConfig;
}

export function Sidebar({ config }: SidebarProps) {
  const isMobile = useIsMobile();

  return isMobile ? <SidebarMobile config={config} /> : <SidebarDesktop config={config} />;
}
