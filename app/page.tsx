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
      <footer className="border-t border-zinc-800 py-8 sm:py-12 mt-16 sm:mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col space-y-6 sm:space-y-8">
            {/* Logo and Description */}
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start space-x-2 mb-3">
                <div className="w-8 h-8 bg-emerald-400 rounded-lg flex items-center justify-center">
                  <span className="text-zinc-900 font-bold text-sm">SD</span>
                </div>
                <span className="text-lg sm:text-xl font-bold text-white">System Design Sandbox</span>
              </div>
              <p className="text-zinc-400 text-sm sm:text-base max-w-md mx-auto sm:mx-0">
                Learn system design through interactive simulations and hands-on practice
              </p>
            </div>

            {/* Navigation Links */}
            <div className="flex flex-col sm:flex-row justify-center sm:justify-between items-center space-y-4 sm:space-y-0">
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 sm:gap-6">
                <Link
                  href="/docs"
                  className="text-zinc-400 hover:text-white transition-colors text-sm sm:text-base min-h-[44px] flex items-center px-2"
                >
                  Documentation
                </Link>
                <Link
                  href="/feedback"
                  className="text-zinc-400 hover:text-white transition-colors text-sm sm:text-base min-h-[44px] flex items-center px-2"
                >
                  Feedback
                </Link>
                <Link
                  href="/play"
                  className="text-zinc-400 hover:text-white transition-colors text-sm sm:text-base min-h-[44px] flex items-center px-2"
                >
                  Start Designing
                </Link>
              </div>

              {/* Social/Additional Links could go here */}
            </div>

            {/* Bottom Section */}
            <div className="pt-6 sm:pt-8 border-t border-zinc-800 text-center">
              <p className="text-zinc-500 text-xs sm:text-sm">
                Built for developers who want to master system design through practice
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
