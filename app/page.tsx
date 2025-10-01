"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";

export default function HomePage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  useEffect(() => {
    let startY = 0;
    let isPulling = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || window.scrollY > 0) return;

      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - startY);

      if (distance > 0) {
        e.preventDefault();
        setPullDistance(distance);
      }
    };

    const handleTouchEnd = () => {
      if (pullDistance > 80) {
        setIsRefreshing(true);
        // Simulate refresh
        setTimeout(() => {
          setIsRefreshing(false);
          window.location.reload();
        }, 1000);
      }
      setPullDistance(0);
      isPulling = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <Navbar />

      {/* Pull to Refresh Indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-zinc-800/90 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2 border border-zinc-700">
          {isRefreshing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-400"></div>
              <span className="text-sm text-zinc-300">Refreshing...</span>
            </>
          ) : (
            <>
              <svg
                className={`w-4 h-4 text-zinc-400 transition-transform ${pullDistance > 40 ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span className="text-sm text-zinc-400">
                {pullDistance > 80 ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </>
          )}
        </div>
      )}

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pt-16 sm:pb-24">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight">
            Master System Design
            <span className="block text-emerald-400 mt-1 sm:mt-2">Through Play</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-zinc-300 mb-6 sm:mb-8 max-w-3xl mx-auto px-2">
            Build, test, and optimize real-world system architectures. Learn by doing with
            interactive simulations of production scenarios.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
            <Link
              href="/practice"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-semibold text-base sm:text-lg transition-colors min-h-[44px] flex items-center justify-center"
            >
              Start Practicing
            </Link>
            <Link
              href="/docs"
              className="px-6 sm:px-8 py-3 sm:py-4 border border-zinc-600 hover:border-zinc-500 text-zinc-300 hover:text-white rounded-lg font-semibold text-base sm:text-lg transition-colors min-h-[44px] flex items-center justify-center"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">How It Works</h2>
          <p className="text-zinc-400 text-base sm:text-lg px-4">Four simple steps to master system design</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          <div className="text-center bg-zinc-800/30 rounded-xl p-4 sm:p-6 border border-zinc-700/50 hover:border-emerald-400/30 transition-colors">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <span className="text-white font-bold text-lg sm:text-xl">1</span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Set Requirements</h3>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              Define functional needs and non-functional targets like RPS, latency, and availability.
            </p>
          </div>

          <div className="text-center bg-zinc-800/30 rounded-xl p-4 sm:p-6 border border-zinc-700/50 hover:border-emerald-400/30 transition-colors">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <span className="text-white font-bold text-lg sm:text-xl">2</span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Choose Architecture</h3>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              Pick from proven patterns like cache-first, global CDN, or DB-only architectures.
            </p>
          </div>

          <div className="text-center bg-zinc-800/30 rounded-xl p-4 sm:p-6 border border-zinc-700/50 hover:border-emerald-400/30 transition-colors">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <span className="text-white font-bold text-lg sm:text-xl">3</span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Design Details</h3>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              Define schemas, APIs, and capacity planning with real-time validation and hints.
            </p>
          </div>

          <div className="text-center bg-zinc-800/30 rounded-xl p-4 sm:p-6 border border-zinc-700/50 hover:border-emerald-400/30 transition-colors">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <span className="text-white font-bold text-lg sm:text-xl">4</span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Review & Validate</h3>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              Get scored feedback, share your design, and test it in the sandbox simulator.
            </p>
          </div>
        </div>
      </div>

      {/* Real-World Scenarios */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">Real-World Scenarios</h2>
          <p className="text-zinc-400 text-base sm:text-lg px-4">Practice with production-scale challenges</p>
        </div>

        <div className="max-w-4xl mx-auto mb-8 sm:mb-12">
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 sm:p-6 hover:border-emerald-400/50 transition-colors">
            <div className="flex items-start space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white font-bold text-lg sm:text-xl">🔗</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">URL Shortener</h3>
                <p className="text-zinc-400 text-sm sm:text-base mb-3 sm:mb-4 leading-relaxed">
                  Redirect requests within 100ms P95 at 5k RPS. Cache hot URLs and optimize for reads.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-zinc-700 rounded text-xs sm:text-sm text-zinc-300">5k RPS</span>
                  <span className="px-2 py-1 bg-zinc-700 rounded text-xs sm:text-sm text-zinc-300">100ms P95</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/play"
            className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-semibold text-base sm:text-lg transition-colors min-h-[44px]"
          >
            Try All Scenarios
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-16 sm:mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          {/* Main Footer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 pb-8">
            {/* Brand Section - Takes up more space on desktop */}
            <div className="lg:col-span-5">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-emerald-400 rounded-lg flex items-center justify-center">
                  <span className="text-zinc-900 font-bold text-sm">SD</span>
                </div>
                <span className="text-xl font-bold text-white">System Design Sandbox</span>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-md mb-6">
                Master system design through interactive simulations and hands-on practice. Build, test, and learn from real-world scenarios.
              </p>
              {/* Social Links */}
              <div className="flex items-center gap-4">
                <a 
                  href="https://github.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
                  aria-label="GitHub"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
                <a 
                  href="https://twitter.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
                  aria-label="Twitter"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a 
                  href="https://linkedin.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
                  aria-label="LinkedIn"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Product Column */}
            <div className="lg:col-span-2">
              <h3 className="text-white font-semibold text-sm mb-4">Product</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/play" className="text-zinc-400 hover:text-white transition-colors text-sm">
                    Playground
                  </Link>
                </li>
                <li>
                  <Link href="/practice" className="text-zinc-400 hover:text-white transition-colors text-sm">
                    Practice
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="text-zinc-400 hover:text-white transition-colors text-sm">
                    Documentation
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources Column */}
            <div className="lg:col-span-2">
              <h3 className="text-white font-semibold text-sm mb-4">Resources</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/docs" className="text-zinc-400 hover:text-white transition-colors text-sm">
                    Guides
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="text-zinc-400 hover:text-white transition-colors text-sm">
                    Examples
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="text-zinc-400 hover:text-white transition-colors text-sm">
                    Tutorials
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company Column */}
            <div className="lg:col-span-2">
              <h3 className="text-white font-semibold text-sm mb-4">Company</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/feedback" className="text-zinc-400 hover:text-white transition-colors text-sm">
                    Feedback
                  </Link>
                </li>
                <li>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors text-sm">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="#" className="text-zinc-400 hover:text-white transition-colors text-sm">
                    Community
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal Column (hidden on mobile, shown on desktop) */}
            <div className="hidden lg:block lg:col-span-1">
              <h3 className="text-white font-semibold text-sm mb-4">Legal</h3>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-zinc-400 hover:text-white transition-colors text-sm">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-zinc-400 hover:text-white transition-colors text-sm">
                    Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-zinc-800">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-zinc-500 text-sm">
                © {new Date().getFullYear()} System Design Sandbox. All rights reserved.
              </p>
              {/* Mobile Legal Links */}
              <div className="flex items-center gap-6 lg:hidden">
                <a href="#" className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm">
                  Privacy
                </a>
                <a href="#" className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm">
                  Terms
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
