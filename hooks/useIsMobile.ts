"use client";

import { useState, useEffect } from "react";

/**
 * Breakpoint constants matching Tailwind defaults
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

/**
 * Check if current window width is below a given breakpoint
 * @param breakpoint - Breakpoint in pixels (default: 768 for md)
 * @returns true if window width is below breakpoint
 */
export function isMobile(breakpoint: number = BREAKPOINTS.md): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < breakpoint;
}

/**
 * Check if current window width is at or above a given breakpoint
 * @param breakpoint - Breakpoint in pixels (default: 640 for sm)
 * @returns true if window width is at or above breakpoint
 */
export function isDesktop(breakpoint: number = BREAKPOINTS.sm): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth >= breakpoint;
}

/**
 * React hook for reactive mobile detection
 * Updates when window is resized
 * @param breakpoint - Breakpoint in pixels (default: 768 for md)
 * @returns boolean indicating if current viewport is mobile
 */
export function useIsMobile(breakpoint: number = BREAKPOINTS.md): boolean {
  const [isMobileState, setIsMobileState] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileState(window.innerWidth < breakpoint);
    };

    // Check on mount
    checkMobile();

    // Check on resize
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint]);

  return isMobileState;
}
