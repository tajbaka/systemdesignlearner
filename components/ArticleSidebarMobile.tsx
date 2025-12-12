"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import type { ArticleCategory } from "./ArticleSidebar";

interface ArticleSidebarMobileProps {
  categories: ArticleCategory[];
}

export function ArticleSidebarMobile({ categories }: ArticleSidebarMobileProps) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  // Close mobile navbar when clicking outside or on a link
  useEffect(() => {
    if (isExpanded) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        // Check for mobile nav and exclude buttons
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

  // Prevent body scroll when mobile navbar is open
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isExpanded]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      {/* Mobile Hamburger Button (when collapsed) */}
      <button
        onClick={toggleExpanded}
        className={`fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-zinc-200 shadow-md transition-all ${
          isExpanded ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        aria-label="Toggle navigation"
      >
        <svg
          className="h-6 w-6 text-zinc-700"
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

      {/* Mobile Navbar (full screen when expanded) */}
      <nav
        className={`fixed inset-0 z-50 bg-white transition-transform duration-300 ${
          isExpanded ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="flex h-full w-full flex-col overflow-hidden">
          {/* Mobile Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 p-4 flex-shrink-0">
            <Link
              href="/"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              onClick={() => setIsExpanded(false)}
            >
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">SD</span>
              </div>
              <span className="text-lg font-bold text-emerald-500 whitespace-nowrap">
                System Design
              </span>
            </Link>
            <button
              onClick={toggleExpanded}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors"
              aria-label="Close navigation"
            >
              <svg
                className="h-6 w-6 text-zinc-700"
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

          {/* Mobile Navigation Content */}
          <div className="flex-1 overflow-y-auto pb-4">
            <div className="space-y-6 p-4">
              {categories.map((category, categoryIndex) => {
                const hasActiveArticle = category.articles.some(
                  (article) => pathname === `/learn/${article.slug}`
                );

                return (
                  <div key={category.id}>
                    <div
                      className={`mb-3 flex items-center gap-2 px-4 py-2 transition-colors ${
                        hasActiveArticle ? "bg-emerald-50" : ""
                      }`}
                    >
                      {category.icon && (
                        <span
                          className={`flex-shrink-0 text-lg ${
                            hasActiveArticle ? "text-emerald-600" : "text-zinc-700"
                          }`}
                        >
                          {category.icon}
                        </span>
                      )}
                      <h3 className="text-sm font-bold text-zinc-700">
                        <span className="whitespace-nowrap">
                          {categoryIndex + 1}. {category.title}
                        </span>
                      </h3>
                    </div>
                    <ul className="space-y-2 px-4">
                      {category.articles.map((article) => {
                        const isActive = pathname === `/learn/${article.slug}`;
                        return (
                          <li key={article.id}>
                            <Link
                              href={`/learn/${article.slug}`}
                              onClick={() => setIsExpanded(false)}
                              className={`flex items-start gap-2 p-2 transition-colors ${
                                isActive
                                  ? "text-emerald-600 font-medium"
                                  : "text-zinc-600 hover:text-zinc-900"
                              }`}
                            >
                              <span
                                className={`flex-shrink-0 text-sm mt-0.5 ${
                                  isActive ? "text-emerald-600" : "text-zinc-900"
                                }`}
                              >
                                •
                              </span>
                              <span className="text-sm leading-snug">{article.title}</span>
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

          {/* Mobile Bottom Actions */}
          <div className="border-t border-zinc-200 p-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Link
                href="/practice/url-shortener/intro"
                onClick={() => setIsExpanded(false)}
                className="flex-1 inline-flex items-center justify-center h-9 rounded-md px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-all"
              >
                <span className="whitespace-nowrap">Practice</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
