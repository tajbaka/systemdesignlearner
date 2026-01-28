"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import type { SidebarConfig } from "./types";
import { getCategoryIcon } from "./utils";

interface SidebarDesktopProps {
  config: SidebarConfig;
}

export function SidebarDesktop({ config }: SidebarDesktopProps) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const { theme } = config;

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

  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => {
        setShowContent(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isExpanded]);

  const renderSimpleLinks = () => {
    if (!config.links) return null;

    return (
      <nav className="flex-1 space-y-1 p-2">
        {config.links.map((link) => {
          const isActive = pathname?.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? `${activeBgClass} ${activeTextClass}`
                  : `${textMutedClass} ${bgHoverClass} ${textHoverClass}`
              } ${isExpanded ? "" : "justify-center"}`}
              title={!isExpanded ? link.label : undefined}
            >
              {link.icon}
              {isExpanded && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>
    );
  };

  const renderCategories = () => {
    if (!config.categories) return null;

    return (
      <nav className="flex-1 overflow-y-auto pb-4">
        <div className="space-y-6">
          {config.categories.map((category, categoryIndex) => {
            const hasActiveItem = category.items.some((item) => pathname === item.href);

            return (
              <div key={category.id}>
                <div
                  className={`mb-3 flex items-center gap-2 transition-colors ${
                    isExpanded
                      ? hasActiveItem
                        ? `px-4 py-2 ${activeBgClass}`
                        : `px-4 py-2 ${bgHoverClass}`
                      : hasActiveItem
                        ? `${activeBgClass} py-2 justify-center`
                        : `py-2 justify-center ${bgHoverClass}`
                  }`}
                >
                  {(() => {
                    const IconComponent = getCategoryIcon(category.icon);
                    return IconComponent ? (
                      <IconComponent
                        className={`flex-shrink-0 h-8 w-5 ${
                          hasActiveItem ? activeTextClass : textClass
                        }`}
                      />
                    ) : null;
                  })()}
                  {showContent && (
                    <h3 className={`text-sm font-bold ${textClass}`}>
                      <span className="whitespace-nowrap">
                        {categoryIndex + 1}. {category.title}
                      </span>
                    </h3>
                  )}
                </div>
                {showContent && (
                  <ul className="space-y-2 px-4">
                    {category.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <li key={item.id}>
                          <Link
                            href={item.href}
                            className={`flex items-start gap-2 p-2 transition-colors ${
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
        </div>
      </nav>
    );
  };

  return (
    <aside
      className={`hidden md:block fixed left-0 top-0 z-50 h-full border-r ${borderClass} ${bgClass} transition-all duration-300 ${
        isExpanded ? "w-64" : "w-16"
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      aria-label="Main navigation"
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className={`flex h-14 items-center justify-between border-b ${borderClass} px-4`}>
          {isExpanded ? (
            <Link
              href={config.logo.href}
              className="flex items-center space-x-2 transition-opacity hover:opacity-80"
            >
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${logoAccentClass}`}
              >
                <span className="text-sm font-bold">{config.logo.short}</span>
              </div>
              <span className={`text-lg font-bold leading-tight ${textClass} whitespace-nowrap`}>
                {config.logo.text}
              </span>
            </Link>
          ) : (
            <Link
              href={config.logo.href}
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${logoAccentClass} transition-opacity hover:opacity-80`}
              title={config.logo.text}
            >
              <span className="text-sm font-bold">{config.logo.short}</span>
            </Link>
          )}
        </div>

        {/* Navigation */}
        {config.links ? renderSimpleLinks() : renderCategories()}
      </div>
    </aside>
  );
}
