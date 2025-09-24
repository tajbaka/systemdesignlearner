"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900">
      <Navbar />

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-24">
        <div className="text-center">
          <h1 className="text-5xl lg:text-7xl font-bold text-zinc-900 dark:text-white mb-6">
            Master System Design
            <span className="block text-emerald-500">Through Play</span>
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-300 mb-8 max-w-3xl mx-auto">
            Build, test, and optimize real-world system architectures. Learn by doing with
            interactive simulations of production scenarios.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/practice"
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-semibold text-lg transition-colors"
            >
              Start Practicing
            </Link>
            <Link
              href="/play"
              className="px-8 py-4 border border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white rounded-lg font-semibold text-lg transition-colors"
            >
              Try Sandbox
            </Link>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-zinc-900 dark:text-white mb-4">How It Works</h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-lg">Four steps to master system design</p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">1</span>
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 text-white mb-2">Set Requirements</h3>
            <p className="text-zinc-600 text-zinc-400">
              Define functional needs and non-functional targets like RPS, latency, and availability.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">2</span>
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 text-white mb-2">Choose Architecture</h3>
            <p className="text-zinc-600 text-zinc-400">
              Pick from proven patterns like cache-first, global CDN, or DB-only architectures.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">3</span>
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 text-white mb-2">Design Details</h3>
            <p className="text-zinc-600 text-zinc-400">
              Define schemas, APIs, and capacity planning with real-time validation and hints.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">4</span>
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 text-white mb-2">Review & Validate</h3>
            <p className="text-zinc-600 text-zinc-400">
              Get scored feedback, share your design, and test it in the sandbox simulator.
            </p>
          </div>
        </div>
      </div>

      {/* Practice Section */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-zinc-900 dark:text-white mb-4">Guided Practice</h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-lg">Step-by-step system design with expert feedback</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-8 hover:border-emerald-400/50 dark:hover:border-emerald-400/50 transition-colors">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-2xl">🔗</span>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-3">URL Shortener Service</h3>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-lg">
                  Master the fundamentals of scalable web services. Learn to balance read-heavy workloads,
                  implement caching strategies, and design for high availability with this complete guided practice.
                </p>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">5k RPS</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">Target Throughput</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">100ms</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">P95 Latency</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">99.9%</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">Availability</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 rounded-full text-sm font-medium">Beginner Friendly</span>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">Caching</span>
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 rounded-full text-sm font-medium">Scalability</span>
                </div>
                <Link
                  href="/practice/url-shortener"
                  className="inline-flex items-center px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-semibold transition-colors"
                >
                  Start Practice
                  <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">More practice problems coming soon...</p>
          <Link
            href="/play"
            className="inline-flex items-center px-6 py-3 bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-lg font-semibold transition-colors"
          >
            Or Try Free-form Sandbox
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-12 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-emerald-400 rounded-lg flex items-center justify-center">
                <span className="text-zinc-900 font-bold text-sm">SD</span>
              </div>
              <span className="text-xl font-bold text-zinc-900 dark:text-white">System Design Sandbox</span>
            </div>
            <div className="flex items-center space-x-6">
              <Link href="/practice" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                Practice
              </Link>
              <Link href="/docs" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                Documentation
              </Link>
              <Link href="/feedback" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                Feedback
              </Link>
              <Link href="/play" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                Start Designing
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800 text-center text-zinc-500 dark:text-zinc-400 text-sm">
            Learn system design through interactive simulations and guided practice
          </div>
        </div>
      </footer>
    </div>
  );
}
