"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UserButton, SignedIn } from "@clerk/nextjs";

interface NavbarProps {
  variant?: "dark" | "light";
}

export function Navbar({ variant = "dark" }: NavbarProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isLight = variant === "light";

  // Navigation link styles - can be changed in one place
  const navLinkActiveLight = "text-emerald-600 bg-emerald-50";
  const navLinkActiveDark = "text-emerald-400 bg-zinc-800";
  const navLinkInactiveLight = "text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100";
  const navLinkInactiveDark = "text-zinc-300 hover:text-white hover:bg-zinc-800";

  // Helper function to get nav link classes
  const getNavLinkClasses = (isActive: boolean) => {
    if (isActive) {
      return isLight ? navLinkActiveLight : navLinkActiveDark;
    }
    return isLight ? navLinkInactiveLight : navLinkInactiveDark;
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      <nav
        className={`${isLight ? "bg-white border-zinc-200" : "bg-zinc-900/95 border-zinc-800"} ${isLight ? "" : "backdrop-blur-sm"} border-b sticky top-0 z-50 safe-area-inset`}
      >
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <div id="navbar-logo">
            <Link href="/" className="hover:opacity-80 transition-opacity" onClick={closeMenu}>
              <div id="navbar-logo-inner" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-emerald-400 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-zinc-900 font-bold text-sm">SD</span>
                </div>
                <span
                  className={`text-lg sm:text-xl font-bold hidden sm:block leading-tight ${isLight ? "text-zinc-900" : "text-white"}`}
                >
                  System Design Sandbox
                </span>
                <span
                  className={`text-lg font-bold sm:hidden leading-tight ${isLight ? "text-zinc-900" : "text-white"}`}
                >
                  SDS
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              href="/practice"
              className={`px-3 py-2 transition-colors text-sm font-medium rounded-lg ${getNavLinkClasses(pathname.startsWith("/practice"))}`}
            >
              Practice
            </Link>
            <Link
              href="/learn"
              className={`px-3 py-2 transition-colors text-sm font-medium rounded-lg ${getNavLinkClasses(pathname.startsWith("/learn"))}`}
            >
              Learn
            </Link>
            {/* <Link
              href="/feedback"
              className={`px-3 py-2 transition-colors text-sm font-medium rounded-lg ${getNavLinkClasses(pathname === "/feedback")}`}
            >
              Feedback
            </Link> */}

            {/* User Button */}
            <SignedIn>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9 border-0",
                  },
                }}
              />
            </SignedIn>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className={`md:hidden p-2 rounded-lg transition-colors flex items-center justify-center ${isLight ? navLinkInactiveLight : navLinkInactiveDark}`}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div
            className={`md:hidden border-t ${isLight ? "border-zinc-200 bg-white" : "border-zinc-800 bg-zinc-900/98 backdrop-blur-sm"}`}
          >
            <div className="px-4 py-4 space-y-3">
              <Link
                href="/practice"
                className={`block px-3 py-3 rounded-lg transition-colors text-base font-medium ${getNavLinkClasses(pathname.startsWith("/practice"))}`}
                onClick={closeMenu}
              >
                Practice
              </Link>
              <Link
                href="/interview-guide"
                className={`block px-3 py-3 rounded-lg transition-colors text-base font-medium ${getNavLinkClasses(pathname === "/interview-guide")}`}
                onClick={closeMenu}
              >
                Interview Guide
              </Link>
              <Link
                href="/docs"
                className={`block px-3 py-3 rounded-lg transition-colors text-base font-medium ${getNavLinkClasses(pathname === "/docs")}`}
                onClick={closeMenu}
              >
                Docs
              </Link>
              <Link
                href="/feedback"
                className={`block px-3 py-3 rounded-lg transition-colors text-base font-medium ${getNavLinkClasses(pathname === "/feedback")}`}
                onClick={closeMenu}
              >
                Feedback
              </Link>

              <div className="pt-2 space-y-3">
                <Link
                  href="/practice/url-shortener/intro"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 rounded-md px-6 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-base shadow-lg hover:shadow-emerald-500/50 transition-all duration-300 w-full"
                  onClick={closeMenu}
                >
                  Start Practicing
                </Link>

                {/* Mobile User Button */}
                <SignedIn>
                  <div
                    className={`flex items-center justify-center gap-3 px-3 py-3 rounded-lg ${isLight ? "bg-zinc-100" : "bg-zinc-800"}`}
                  >
                    <UserButton
                      appearance={{
                        elements: {
                          avatarBox: "w-9 h-9 border-0",
                        },
                      }}
                    />
                    <span
                      className={`text-sm font-medium ${isLight ? "text-zinc-700" : "text-zinc-300"}`}
                    >
                      Your Account
                    </span>
                  </div>
                </SignedIn>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
