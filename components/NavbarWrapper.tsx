"use client";

import { useState, useEffect } from "react";
import { Navbar } from "./Navbar";

interface NavbarWrapperProps {
  variant?: "dark" | "light";
}

export function NavbarWrapper({ variant = "dark" }: NavbarWrapperProps) {
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check on mount
    checkMobile();

    // Check on resize
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Don't render Navbar on mobile
  if (isMobile) {
    return null;
  }

  return <Navbar variant={variant} />;
}
