"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <Navbar />

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-24">
        <div className="text-center">
          <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6">
            Master System Design
            <span className="block text-emerald-400">Through Play</span>
          </h1>
          <p className="text-xl text-zinc-300 mb-8 max-w-3xl mx-auto">
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
              href="/docs"
              className="px-8 py-4 border border-zinc-600 hover:border-zinc-500 text-zinc-300 hover:text-white rounded-lg font-semibold text-lg transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-zinc-400 text-lg">Three simple steps to master system design</p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">1</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Set Requirements</h3>
            <p className="text-zinc-400">
              Define functional needs and non-functional targets like RPS, latency, and availability.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">2</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Choose Architecture</h3>
            <p className="text-zinc-400">
              Pick from proven patterns like cache-first, global CDN, or DB-only architectures.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">3</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Design Details</h3>
            <p className="text-zinc-400">
              Define schemas, APIs, and capacity planning with real-time validation and hints.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">4</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Review & Validate</h3>
            <p className="text-zinc-400">
              Get scored feedback, share your design, and test it in the sandbox simulator.
            </p>
          </div>
        </div>
      </div>

      {/* Real-World Scenarios */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Real-World Scenarios</h2>
          <p className="text-zinc-400 text-lg">Practice with production-scale challenges</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 hover:border-emerald-400/50 transition-colors">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">🔗</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">URL Shortener</h3>
            <p className="text-zinc-400 mb-4">Redirect requests within 100ms P95 at 5k RPS. Cache hot URLs and optimize for reads.</p>
            <div className="flex items-center text-sm text-zinc-500">
              <span className="px-2 py-1 bg-zinc-700 rounded">5k RPS</span>
              <span className="px-2 py-1 bg-zinc-700 rounded ml-2">100ms P95</span>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <Link
            href="/play"
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-semibold text-lg transition-colors"
          >
            Try All Scenarios
          </Link>
        </div>

      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-emerald-400 rounded-lg flex items-center justify-center">
                <span className="text-zinc-900 font-bold text-sm">SD</span>
              </div>
              <span className="text-xl font-bold text-white">System Design Sandbox</span>
            </div>
            <div className="flex items-center space-x-6">
              <Link href="/docs" className="text-zinc-400 hover:text-white transition-colors">
                Documentation
              </Link>
              <Link href="/feedback" className="text-zinc-400 hover:text-white transition-colors">
                Feedback
              </Link>
              <Link href="/play" className="text-zinc-400 hover:text-white transition-colors">
                Start Designing
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-zinc-800 text-center text-zinc-500 text-sm">
            Learn system design through interactive simulations
          </div>
        </div>
      </footer>
    </div>
  );
}
