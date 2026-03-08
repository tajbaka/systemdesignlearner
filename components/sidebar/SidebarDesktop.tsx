"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useCallback } from "react";
import { track } from "@/lib/analytics";
import type { SidebarInternalConfig } from "./types";
import { getCategoryIcon } from "./utils";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

interface SidebarDesktopProps {
  config: SidebarInternalConfig;
}

/**
 * Module-level flag so the sidebar stays expanded across page navigations.
 * The component remounts on navigation (it lives inside each page's layout),
 * but the mouse is still hovering — this flag preserves that state.
 */
let isMouseInsideSidebar = false;

export function SidebarDesktop({ config }: SidebarDesktopProps) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(isMouseInsideSidebar);
  const [showItems, setShowItems] = useState(isMouseInsideSidebar);
  const expandTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { theme } = config;

  const handleMouseEnter = useCallback(() => {
    isMouseInsideSidebar = true;
    setIsExpanded(true);
    // Show items after the sidebar width transition completes
    expandTimer.current = setTimeout(() => setShowItems(true), 300);
  }, []);

  const handleMouseLeave = useCallback(() => {
    isMouseInsideSidebar = false;
    if (expandTimer.current) {
      clearTimeout(expandTimer.current);
      expandTimer.current = null;
    }
    setShowItems(false);
    setIsExpanded(false);
  }, []);

  const isDark = theme === "dark";

  // Theme-based classes
  const bgClass = isDark ? "bg-zinc-950" : "bg-white";
  const borderClass = isDark ? "border-zinc-800" : "border-zinc-200";
  const textClass = isDark ? "text-white" : "text-zinc-700";
  const textMutedClass = isDark ? "text-zinc-300" : "text-zinc-600";
  const textHoverClass = isDark ? "hover:text-white" : "hover:text-zinc-900";
  const bgHoverClass = isDark ? "hover:bg-zinc-800" : "hover:bg-zinc-50";
  const logoAccentClass = isDark ? "bg-emerald-400 text-zinc-900" : "bg-emerald-500 text-white";
  const activeTextClass = isDark ? "text-emerald-400" : "text-emerald-600";
  const activeBgClass = isDark ? "bg-emerald-500/20" : "bg-emerald-50";
  const tooltipBgClass = isDark
    ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
    : "bg-zinc-900 text-zinc-100";

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={`hidden md:block fixed left-0 top-0 z-50 h-full border-r ${borderClass} ${bgClass} transition-all duration-300 ease-in-out ${
          isExpanded ? "w-64" : "w-16"
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label="Main navigation"
      >
        <div className="flex h-full flex-col overflow-hidden">
          {/* Logo */}
          <div className={`border-b ${borderClass}`}>
            <div className={`flex h-14 items-center ${isExpanded ? "px-3" : "justify-center"}`}>
              <Link
                href={config.logo.href}
                className={`flex items-center transition-opacity hover:opacity-80 overflow-hidden ${isExpanded ? "gap-2" : ""}`}
              >
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${logoAccentClass}`}
                >
                  <span className="text-sm font-bold">{config.logo.short}</span>
                </div>
                {isExpanded && (
                  <span
                    className={`text-lg font-bold leading-tight whitespace-nowrap transition-opacity duration-200 ${textClass} opacity-100 delay-75`}
                  >
                    {config.logo.text}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto pb-4">
            <div className="space-y-1 pt-4 px-3">
              {config.categories.map((category, categoryIndex) => {
                const hasActiveItem = category.items.some((item) => pathname === item.href);
                const IconComponent = getCategoryIcon(category.icon);

                const iconElement = (
                  <div
                    className={`flex items-center h-10 rounded-lg transition-colors ${
                      isExpanded
                        ? `gap-2 px-2 ${hasActiveItem ? activeBgClass : bgHoverClass}`
                        : `w-10 justify-center ${hasActiveItem ? activeBgClass : bgHoverClass}`
                    }`}
                  >
                    {IconComponent && (
                      <IconComponent
                        className={`flex-shrink-0 h-5 w-5 ${
                          hasActiveItem ? activeTextClass : textClass
                        }`}
                      />
                    )}
                    {isExpanded && (
                      <h3
                        className={`text-sm font-bold whitespace-nowrap overflow-hidden transition-opacity duration-200 ${textClass} opacity-100 delay-75`}
                      >
                        {categoryIndex + 1}. {category.title}
                      </h3>
                    )}
                  </div>
                );

                const headerContent = category.href ? (
                  <Link href={category.href} className="block">
                    {iconElement}
                  </Link>
                ) : (
                  iconElement
                );

                return (
                  <div key={category.id}>
                    {/* Category header with icon */}
                    <div className={isExpanded ? "" : "flex justify-center"}>
                      {!isExpanded ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{headerContent}</TooltipTrigger>
                          <TooltipContent side="right" className={tooltipBgClass}>
                            {category.title}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        headerContent
                      )}
                    </div>

                    {/* Category items — only visible after sidebar fully expands */}
                    {category.items.length > 0 && showItems && (
                      <ul className="space-y-1 px-1 mb-2">
                        {category.items.map((item) => {
                          const isActive = pathname === item.href;
                          return (
                            <li key={item.id}>
                              <Link
                                href={item.href}
                                className={`flex items-start gap-2 p-2 rounded-md transition-colors ${
                                  isActive
                                    ? `${activeTextClass} font-medium`
                                    : `${textMutedClass} ${textHoverClass}`
                                }`}
                              >
                                <span
                                  className={`flex-shrink-0 text-sm mt-0.5 ${
                                    isActive ? activeTextClass : textClass
                                  }`}
                                >
                                  •
                                </span>
                                <span className="text-sm leading-snug">{item.title}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}

              {/* Standalone action buttons */}
              {config.buttons?.map((btn) => {
                const IconComponent = getCategoryIcon(btn.icon);

                const buttonContent = (
                  <Link
                    prefetch={false}
                    href={btn.href}
                    onClick={() => {
                      track("sidebar_practice_clicked");
                    }}
                    className={`flex items-center h-10 rounded-lg transition-colors bg-emerald-500 hover:bg-emerald-600 text-white ${
                      isExpanded ? "gap-2 px-2" : "w-10 justify-center"
                    }`}
                  >
                    {IconComponent && <IconComponent className="flex-shrink-0 h-5 w-5" />}
                    {isExpanded && (
                      <span className="text-sm font-bold whitespace-nowrap overflow-hidden transition-opacity duration-200 opacity-100 delay-75">
                        {btn.label}
                      </span>
                    )}
                  </Link>
                );

                return (
                  <div key={btn.id} className={!isExpanded ? "flex justify-center" : ""}>
                    {!isExpanded ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                        <TooltipContent side="right" className={tooltipBgClass}>
                          {btn.label}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      buttonContent
                    )}
                  </div>
                );
              })}
            </div>
          </nav>
        </div>
      </aside>
    </TooltipProvider>
  );
}
