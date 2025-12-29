"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import type { ArticleCategory } from "./ArticleSidebar";
import { getCategoryIcon } from "./ArticleSidebar";

interface ArticleSidebarDesktopProps {
  categories: ArticleCategory[];
}

export function ArticleSidebarDesktop({ categories }: ArticleSidebarDesktopProps) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showContent, setShowContent] = useState(false);

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

  return (
    <aside
      className={`hidden md:block fixed left-0 top-[60px] bottom-0 z-40 border-r border-zinc-200 bg-white transition-all duration-300 ${
        isExpanded ? "w-64" : "w-16"
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex h-full flex-col">
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto pb-4">
          <div className="space-y-6">
            {categories.map((category, categoryIndex) => {
              const hasActiveArticle = category.articles.some(
                (article) => pathname === `/learn/${article.slug}`
              );

              return (
                <div key={category.id}>
                  <div
                    className={`mb-3 flex items-center gap-2 transition-colors ${
                      isExpanded
                        ? hasActiveArticle
                          ? "px-4 py-2 bg-emerald-50"
                          : "px-4 py-2 hover:bg-zinc-50"
                        : hasActiveArticle
                          ? "bg-emerald-50 py-2 justify-center"
                          : "py-2 justify-center hover:bg-zinc-50"
                    }`}
                  >
                    {(() => {
                      const IconComponent = getCategoryIcon(category.icon);
                      return IconComponent ? (
                        <IconComponent
                          className={`flex-shrink-0 h-8 w-5 ${
                            hasActiveArticle ? "text-emerald-600" : "text-zinc-700"
                          }`}
                        />
                      ) : null;
                    })()}
                    {showContent && (
                      <h3 className="text-sm font-bold text-zinc-700">
                        <span className="whitespace-nowrap">
                          {categoryIndex + 1}. {category.title}
                        </span>
                      </h3>
                    )}
                  </div>
                  {showContent && (
                    <ul className="space-y-2 px-4">
                      {category.articles.map((article) => {
                        const isActive = pathname === `/learn/${article.slug}`;
                        return (
                          <li key={article.id}>
                            <Link
                              href={`/learn/${article.slug}`}
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
                  )}
                </div>
              );
            })}
          </div>
        </nav>
      </div>
    </aside>
  );
}
