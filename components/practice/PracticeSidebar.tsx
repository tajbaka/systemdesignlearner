"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser, UserButton } from "@clerk/nextjs";

export function PracticeSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isSignedIn } = useUser();

  return (
    <>
      {/* Mobile: Hamburger button in top left corner */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="fixed left-4 top-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/95 backdrop-blur-sm text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:hidden"
        aria-label="Open menu"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile: Backdrop when menu is open */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[45] bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile: Slide-in menu */}
      <aside
        className={`fixed left-0 top-0 z-[60] h-full w-64 border-r border-zinc-800 bg-zinc-950 transition-transform duration-300 lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Mobile navigation"
      >
        <div className="flex h-full flex-col">
          {/* Mobile header with close button */}
          <div className="flex h-16 items-center justify-between border-b border-zinc-800 px-4">
            <Link
              href="/"
              className="flex items-center space-x-2 transition-opacity hover:opacity-80"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-400">
                <span className="text-sm font-bold text-zinc-900">SD</span>
              </div>
              <span className="text-lg font-bold leading-tight text-white whitespace-nowrap">System Design</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Close menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mobile navigation links */}
          <nav className="flex-1 space-y-1 p-2">
            <Link
              href="/practice"
              className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Practice</span>
            </Link>
            <Link
              href="/docs"
              className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Docs</span>
            </Link>
            <Link
              href="/feedback"
              className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span>Feedback</span>
            </Link>
            <Link
              href="/play"
              className="mt-4 flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              onClick={() => setMobileMenuOpen(false)}
            >
              <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="whitespace-nowrap">Try Sandbox</span>
            </Link>
          </nav>

          {/* Mobile user button */}
          {isSignedIn && (
            <div className="border-t border-zinc-800 p-2">
              <div className="flex items-center justify-start px-1">
                <UserButton
                  appearance={{
                    elements: {
                      rootBox: "flex items-center",
                      userButtonTrigger: "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg",
                      userButtonAvatarBox: "w-8 h-8",
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Desktop only: Sidebar with hover to expand */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full border-r border-zinc-800 bg-zinc-950 transition-all duration-300 max-lg:hidden ${
          isExpanded ? "w-64" : "w-16"
        }`}
        aria-label="Main navigation"
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="flex h-full flex-col">
          {/* Logo / Toggle area */}
          <div className="flex h-16 items-center justify-between border-b border-zinc-800 px-4">
            {isExpanded ? (
              <Link
                href="/"
                className="flex items-center space-x-2 transition-opacity hover:opacity-80"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-400">
                  <span className="text-sm font-bold text-zinc-900">SD</span>
                </div>
                <span className="text-lg font-bold leading-tight text-white whitespace-nowrap">System Design</span>
              </Link>
            ) : (
              <Link
                href="/"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400 transition-opacity hover:opacity-80"
                title="System Design Sandbox"
              >
                <span className="text-sm font-bold text-zinc-900">SD</span>
              </Link>
            )}
          </div>

          {/* Navigation links */}
          <nav className="flex-1 space-y-1 p-2">
            <Link
              href="/practice"
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white ${
                isExpanded ? "" : "justify-center"
              }`}
              title={!isExpanded ? "Practice" : undefined}
            >
              <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {isExpanded && <span>Practice</span>}
            </Link>
            <Link
              href="/docs"
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white ${
                isExpanded ? "" : "justify-center"
              }`}
              title={!isExpanded ? "Docs" : undefined}
            >
              <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isExpanded && <span>Docs</span>}
            </Link>
            <Link
              href="/feedback"
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white ${
                isExpanded ? "" : "justify-center"
              }`}
              title={!isExpanded ? "Feedback" : undefined}
            >
              <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              {isExpanded && <span>Feedback</span>}
            </Link>
            <Link
              href="/play"
              className={`mt-4 flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                isExpanded ? "" : "justify-center"
              }`}
              title={!isExpanded ? "Try Sandbox" : undefined}
            >
              <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {isExpanded && <span className="whitespace-nowrap">Try Sandbox</span>}
            </Link>
          </nav>

          {/* User button at bottom */}
          {isSignedIn && (
            <div className="border-t border-zinc-800 p-2">
              <div className={`flex items-center ${isExpanded ? "justify-start px-1" : "justify-center"}`}>
                <UserButton
                  appearance={{
                    elements: {
                      rootBox: "flex items-center",
                      userButtonTrigger: "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg",
                      userButtonAvatarBox: "w-8 h-8",
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
