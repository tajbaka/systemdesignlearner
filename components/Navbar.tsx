"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserButton, SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs";

export function Navbar() {
  const pathname = usePathname();
  const isOnSandbox = pathname === "/play";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [logoPosition, setLogoPosition] = useState({ x: 0, y: 0 });

  // Check if this is the initial page load on landing page and calculate logo position
  useEffect(() => {
    // Only animate on the landing page (root path)
    const isLandingPage = pathname === '/';

    // Clear the animation flag on every mount (page load/reload)
    // This ensures the animation plays every time someone visits or reloads the landing page
    if (isLandingPage) {
      sessionStorage.removeItem('logoAnimated');
    }

    const animated = sessionStorage.getItem('logoAnimated');

    if (isLandingPage && !animated) {
      sessionStorage.setItem('logoAnimated', 'true');
      setHasAnimated(false);

      // Calculate the final position of the logo after a small delay to ensure navbar is rendered
      setTimeout(() => {
        const logoElement = document.getElementById('navbar-logo-inner');
        if (logoElement) {
          const navbarRect = logoElement.getBoundingClientRect();

          // Calculate offset from viewport center (50%, 50%) to navbar logo position
          // We need to account for the -50% translate that centers the animated logo
          const centerX = window.innerWidth / 2;
          const centerY = window.innerHeight / 2;

          // Get the actual position where we want the logo's left/top to be
          // The animated logo is centered with translate(-50%, -50%), so we need to
          // position it such that after the translate, it aligns with navbar
          const xOffset = navbarRect.left - centerX;
          const yOffset = navbarRect.top - centerY;

          console.log('Navbar rect:', navbarRect);
          console.log('Window center:', { x: centerX, y: centerY });
          console.log('Calculated offset:', { x: xOffset, y: yOffset });

          setLogoPosition({
            x: xOffset,
            y: yOffset,
          });
        }
      }, 100);
    } else {
      setHasAnimated(true);
    }
  }, [pathname]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      {/* Centered Logo Overlay - only shows on initial load */}
      {!hasAnimated && (
        <>
          {/* Background overlay that fades out */}
          <motion.div
            className="fixed inset-0 z-[90] bg-zinc-900"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            style={{ pointerEvents: 'none' }}
          />

          {/* Logo that animates from center to navbar position */}
          <motion.div
            id="animated-logo"
            className="fixed z-[100] left-1/2 top-1/2"
            style={{
              pointerEvents: 'none',
              originX: 0,
              originY: 0
            }}
            initial={{
              scale: 1.5,
              x: '-50%',
              y: '-50%'
            }}
            animate={{
              scale: 1,
              x: logoPosition.x,
              y: logoPosition.y,
            }}
            transition={{
              duration: 1,
              delay: 0.5,
              ease: [0.43, 0.13, 0.23, 0.96]
            }}
            onAnimationComplete={() => {
              setHasAnimated(true);
            }}
          >
            <div id="animated-logo-inner" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-emerald-400 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-zinc-900 font-bold text-sm">SD</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-white hidden sm:block leading-tight">
                System Design Sandbox
              </span>
              <span className="text-lg font-bold text-white sm:hidden leading-tight">
                SDS
              </span>
            </div>
          </motion.div>
        </>
      )}

      <nav className="bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 sticky top-0 z-50 safe-area-inset">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <div id="navbar-logo" style={{ opacity: hasAnimated ? 1 : 0 }}>
            <Link
              href="/"
              className="hover:opacity-80 transition-opacity"
              onClick={closeMenu}
            >
              <div id="navbar-logo-inner" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-emerald-400 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-zinc-900 font-bold text-sm">SD</span>
                </div>
                <span className="text-lg sm:text-xl font-bold text-white hidden sm:block leading-tight">
                  System Design Sandbox
                </span>
                <span className="text-lg font-bold text-white sm:hidden leading-tight">
                  SDS
                </span>
              </div>
            </Link>
          </div>

        {/* Desktop Navigation */}
        <div
          className="hidden md:flex items-center space-x-6"
          style={{ opacity: hasAnimated ? 1 : 0, transition: 'opacity 0.3s' }}
        >
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

          {/* Auth Buttons */}
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-4 py-2 text-zinc-300 hover:text-white transition-colors text-sm font-medium rounded-lg hover:bg-zinc-800">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors">
                Sign Up
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9"
                }
              }}
            />
          </SignedIn>
        </div>

        {/* Mobile Menu Button */}
        <button
          style={{ opacity: hasAnimated ? 1 : 0, transition: 'opacity 0.3s' }}
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

            <div className="pt-2 space-y-3">
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

              {/* Mobile Auth Buttons */}
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="w-full px-3 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg text-base font-medium transition-colors">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="w-full px-3 py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-base font-medium transition-colors">
                    Sign Up
                  </button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <div className="flex items-center justify-center gap-3 px-3 py-3 bg-zinc-800 rounded-lg">
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: "w-9 h-9"
                      }
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
