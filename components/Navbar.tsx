"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UserButton, SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";

export function Navbar() {
  const pathname = usePathname();
  const isOnSandbox = pathname === "/play";
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Determine redirect URL based on current page
  const getRedirectUrl = () => {
    // If on landing page, redirect to /play
    if (pathname === "/") {
      return "/play";
    }
    // Otherwise, stay on current page (e.g., practice pages)
    return pathname;
  };

  const redirectUrl = getRedirectUrl();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      <nav className="bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 sticky top-0 z-50 safe-area-inset">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <div id="navbar-logo">
            <Link href="/" className="hover:opacity-80 transition-opacity" onClick={closeMenu}>
              <div id="navbar-logo-inner" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-emerald-400 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-zinc-900 font-bold text-sm">SD</span>
                </div>
                <span className="text-lg sm:text-xl font-bold text-white hidden sm:block leading-tight">
                  System Design Sandbox
                </span>
                <span className="text-lg font-bold text-white sm:hidden leading-tight">SDS</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              href="/practice"
              className="px-3 py-2 text-zinc-300 hover:text-white transition-colors text-sm font-medium rounded-lg hover:bg-zinc-800"
            >
              Practice
            </Link>
            <Link
              href="/examples"
              className="px-3 py-2 text-zinc-300 hover:text-white transition-colors text-sm font-medium rounded-lg hover:bg-zinc-800"
            >
              Examples
            </Link>
            <Link
              href="/interview-guide"
              className="px-3 py-2 text-zinc-300 hover:text-white transition-colors text-sm font-medium rounded-lg hover:bg-zinc-800"
            >
              Interview Guide
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
              <>
                <SignedOut>
                  <SignInButton mode="modal" forceRedirectUrl={redirectUrl}>
                    <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-9 rounded-md px-6 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm shadow-lg hover:shadow-emerald-500/50 transition-all duration-300">
                      Try Sandbox
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <Link
                    href="/play"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-9 rounded-md px-6 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm shadow-lg hover:shadow-emerald-500/50 transition-all duration-300"
                  >
                    Try Sandbox
                  </Link>
                </SignedIn>
              </>
            )}

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
            className="md:hidden p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center justify-center"
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
                href="/examples"
                className="block px-3 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-base font-medium"
                onClick={closeMenu}
              >
                Examples
              </Link>
              <Link
                href="/interview-guide"
                className="block px-3 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-base font-medium"
                onClick={closeMenu}
              >
                Interview Guide
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

              <div className="pt-2 space-y-3">
                {isOnSandbox ? (
                  <div className="px-3 py-3 bg-emerald-600 text-white rounded-lg text-base font-medium text-center">
                    Sandbox Active
                  </div>
                ) : (
                  <>
                    <SignedOut>
                      <SignInButton mode="modal" forceRedirectUrl={redirectUrl}>
                        <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 rounded-md px-6 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-base shadow-lg hover:shadow-emerald-500/50 transition-all duration-300 w-full">
                          Try Sandbox
                        </button>
                      </SignInButton>
                    </SignedOut>
                    <SignedIn>
                      <Link
                        href="/play"
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 rounded-md px-6 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-base shadow-lg hover:shadow-emerald-500/50 transition-all duration-300 w-full"
                        onClick={closeMenu}
                      >
                        Try Sandbox
                      </Link>
                    </SignedIn>
                  </>
                )}

                {/* Mobile User Button */}
                <SignedIn>
                  <div className="flex items-center justify-center gap-3 px-3 py-3 bg-zinc-800 rounded-lg">
                    <UserButton
                      appearance={{
                        elements: {
                          avatarBox: "w-9 h-9 border-0",
                        },
                      }}
                    />
                    <span className="text-zinc-300 text-sm font-medium">Your Account</span>
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
