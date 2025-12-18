"use client";

import { Navbar } from "./Navbar";
import { useIsMobile } from "@/hooks/useIsMobile";

interface NavbarWrapperProps {
  variant?: "dark" | "light";
}

export function NavbarWrapper({ variant = "dark" }: NavbarWrapperProps) {
  const isMobile = useIsMobile();

  // Don't render Navbar on mobile
  if (isMobile) {
    return null;
  }

  return <Navbar variant={variant} />;
}
