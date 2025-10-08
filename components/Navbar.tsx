"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function Navbar() {
  const pathname = usePathname();
  const isOnSandbox = pathname === "/play";
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 sticky top-0 z-50 safe-area-inset">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          onClick={closeMenu}
        >
          <div className="w-8 h-8 bg-emerald-400 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-zinc-900 font-bold text-sm">SD</span>
          </div>
          <span className="text-lg sm:text-xl font-bold text-white hidden sm:block leading-tight">
            System Design Sandbox
          </span>
          <span className="text-lg font-bold text-white sm:hidden leading-tight">
            SDS
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <Link
            href="/practice"
            className="px-3 py-2 text-zinc-300 hover:text-white transition-colors text-sm font-medium rounded-lg hover:bg-zinc-800"
          >
            Practice
          </Link>
          <Link
            href="/docs"
            className="px-3 py-2 text-zinc-300 hover:text-white transition-colors text-sm font-medium rounded-lg hover:bg-zinc-800"
          >
            Docs
          </Link>
          <Link
            href="/feedback"
            className="px-3 py-2 text-zinc-300 hover:text-white transition-colors text-sm font-medium rounded-lg hover:bg-zinc-800"
          >
            Feedback
          </Link>


          {isOnSandbox ? (
            <div className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium">
              Sandbox Active
            </div>
          ) : (
            <Link
              href="/play"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Try Sandbox
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={toggleMenu}
          className="md:hidden p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center justify-center"
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-900/98 backdrop-blur-sm">
          <div className="px-4 py-4 space-y-3">
            <Link
              href="/practice"
              className="block px-3 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-base font-medium"
              onClick={closeMenu}
            >
              Practice
            </Link>
            <Link
              href="/docs"
              className="block px-3 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-base font-medium"
              onClick={closeMenu}
            >
              Docs
            </Link>
            <Link
              href="/feedback"
              className="block px-3 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-base font-medium"
              onClick={closeMenu}
            >
              Feedback
            </Link>

            <div className="pt-2">
              {isOnSandbox ? (
                <div className="px-3 py-3 bg-emerald-600 text-white rounded-lg text-base font-medium text-center">
                  Sandbox Active
                </div>
              ) : (
                <Link
                  href="/play"
                  className="block px-3 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-base font-medium text-center transition-colors"
                  onClick={closeMenu}
                >
                  Try Sandbox
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
