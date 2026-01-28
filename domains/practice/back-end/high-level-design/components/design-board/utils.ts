/**
 * Check if the current viewport is mobile size
 * @param breakpoint - The width breakpoint in pixels (default: 768px for mobile)
 * @returns true if viewport width is less than breakpoint
 */
export function isMobile(breakpoint: number = 768): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < breakpoint;
}
