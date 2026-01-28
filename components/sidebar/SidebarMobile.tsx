"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import type { SidebarConfig } from "./types";
import { getCategoryIcon } from "./utils";

interface SidebarMobileProps {
  config: SidebarConfig;
}

export function SidebarMobile({ config }: SidebarMobileProps) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const { theme } = config;

  const isDark = theme === "dark";

  // Theme-based classes
  const bgClass = isDark ? "bg-zinc-950" : "bg-white";
  const borderClass = isDark ? "border-zinc-800" : "border-zinc-200";
  const textClass = isDark ? "text-white" : "text-zinc-900";
  const textMutedClass = isDark ? "text-zinc-300" : "text-zinc-600";
  const textHoverClass = isDark ? "hover:text-white" : "hover:text-zinc-900";
  const bgHoverClass = isDark ? "hover:bg-zinc-800" : "hover:bg-zinc-100";
  const buttonBgClass = isDark
    ? "bg-zinc-900/95 border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800"
    : "bg-white border-zinc-200";
  const logoAccentClass = isDark ? "bg-emerald-400 text-zinc-900" : "bg-emerald-500 text-white";
  const brandTextClass = isDark ? "text-white" : "text-emerald-500";
  const activeTextClass = isDark ? "text-emerald-400" : "text-emerald-600";
  const activeBgClass = isDark ? "bg-emerald-500/20" : "bg-emerald-50";
  const backdropClass = isDark ? "bg-black/60" : "bg-black/40";

  // Close mobile navbar when clicking outside or on a link
  useEffect(() => {
    if (isExpanded) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const isInsideNav = target.closest("nav");
        const isButton = target.closest("button");
        if (!isInsideNav && !isButton) {
          setIsExpanded(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isExpanded]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

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
              }`}
              onClick={() => setIsExpanded(false)}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  };

  const renderCategories = () => {
    if (!config.categories) return null;

    return (
      <div className="flex-1 overflow-y-auto pb-4">
        <div className="space-y-6 p-4">
          {config.categories.map((category, categoryIndex) => {
            const hasActiveItem = category.items.some((item) => pathname === item.href);

            return (
              <div key={category.id}>
                <div
                  className={`mb-3 flex items-center gap-2 px-4 py-2 transition-colors ${
                    hasActiveItem ? activeBgClass : ""
                  }`}
                >
                  {(() => {
                    const IconComponent = getCategoryIcon(category.icon);
                    return IconComponent ? (
                      <IconComponent
                        className={`flex-shrink-0 h-5 w-5 ${
                          hasActiveItem ? activeTextClass : textClass
                        }`}
                      />
                    ) : null;
                  })()}
                  <h3 className={`text-sm font-bold ${textClass}`}>
                    <span className="whitespace-nowrap">
                      {categoryIndex + 1}. {category.title}
                    </span>
                  </h3>
                </div>
                <ul className="space-y-2 px-4">
                  {category.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          onClick={() => setIsExpanded(false)}
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
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={toggleExpanded}
        className={`fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border shadow-md transition-all ${buttonBgClass} ${
          isExpanded ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        aria-label="Toggle navigation"
      >
        <svg
          className={`h-6 w-6 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Backdrop */}
      {isExpanded && (
        <div
          className={`fixed inset-0 z-40 ${backdropClass} backdrop-blur-sm`}
          onClick={() => setIsExpanded(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Navbar */}
      <nav
        className={`fixed inset-0 z-50 ${bgClass} transition-transform duration-300 ${
          isExpanded ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="flex h-full w-full flex-col overflow-hidden">
          {/* Mobile Header */}
          <div
            className={`flex items-center justify-between border-b ${borderClass} p-4 flex-shrink-0`}
          >
            <Link
              href={config.logo.href}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              onClick={() => setIsExpanded(false)}
            >
              <div
                className={`w-8 h-8 ${logoAccentClass} rounded-lg flex items-center justify-center flex-shrink-0`}
              >
                <span className="font-bold text-sm">{config.logo.short}</span>
              </div>
              <span className={`text-lg font-bold ${brandTextClass} whitespace-nowrap`}>
                {config.logo.text}
              </span>
            </Link>
            <button
              onClick={toggleExpanded}
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${bgHoverClass} transition-colors`}
              aria-label="Close navigation"
            >
              <svg
                className={`h-6 w-6 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          {config.links ? renderSimpleLinks() : renderCategories()}
        </div>
      </nav>
    </>
  );
}
