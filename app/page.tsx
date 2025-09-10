"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export default function HomePage() {
  const router = useRouter();
  const warmPlay = useCallback(() => {
    router.prefetch("/play");
    // Warm heavy client chunk used on /play
    import("./components/SystemDesignEditor").catch(() => {});
  }, [router]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 lg:px-8">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-emerald-400 rounded-lg flex items-center justify-center">
            <span className="text-zinc-900 font-bold text-sm">SD</span>
          </div>
          <span className="text-xl font-bold text-white">System Design Sandbox</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/docs" prefetch className="text-zinc-300 hover:text-white transition-colors" onMouseEnter={() => router.prefetch("/docs")}>
            Docs
          </Link>
          <Link href="/feedback" prefetch className="text-zinc-300 hover:text-white transition-colors" onMouseEnter={() => router.prefetch("/feedback")}>
            Feedback
          </Link>
          <Link
            href="/play"
            prefetch
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-medium transition-colors"
            onMouseEnter={warmPlay}
          >
            Try Sandbox
          </Link>
        </div>
      </nav>

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
              href="/play"
              prefetch
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-semibold text-lg transition-colors"
              onMouseEnter={warmPlay}
            >
              Start Designing
            </Link>
            <Link
              href="/docs"
              prefetch
              className="px-8 py-4 border border-zinc-600 hover:border-zinc-500 text-zinc-300 hover:text-white rounded-lg font-semibold text-lg transition-colors"
              onMouseEnter={() => router.prefetch("/docs")}
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

        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">1</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Choose a Scenario</h3>
            <p className="text-zinc-400">
              Pick from real-world challenges like Spotify&apos;s music streaming or URL shortening
              services.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">2</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Design & Connect</h3>
            <p className="text-zinc-400">
              Drag and drop components like load balancers, caches, and databases to build your
              architecture.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">3</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Run & Optimize</h3>
            <p className="text-zinc-400">
              Simulate real traffic and see how your design performs. Get hints and iterate until
              you succeed.
            </p>
          </div>
        </div>
      </div>

      {/* Scenarios */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Real-World Scenarios</h2>
          <p className="text-zinc-400 text-lg">Practice with production-scale challenges</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 hover:border-emerald-400/50 transition-colors">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">🎵</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Spotify: Play Track</h3>
            <p className="text-zinc-400 mb-4">
              Serve playback requests within 200ms P95 at 2k RPS. Balance speed vs cost with CDN and
              caching.
            </p>
            <div className="flex items-center text-sm text-zinc-500">
              <span className="px-2 py-1 bg-zinc-700 rounded">2k RPS</span>
              <span className="px-2 py-1 bg-zinc-700 rounded ml-2">200ms P95</span>
            </div>
          </div>

          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 hover:border-emerald-400/50 transition-colors">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">🔍</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Spotify: Search Catalog</h3>
            <p className="text-zinc-400 mb-4">
              Handle search bursts quickly with smart caching. Minimize expensive database lookups.
            </p>
            <div className="flex items-center text-sm text-zinc-500">
              <span className="px-2 py-1 bg-zinc-700 rounded">1.5k RPS</span>
              <span className="px-2 py-1 bg-zinc-700 rounded ml-2">300ms P95</span>
            </div>
          </div>

          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 hover:border-emerald-400/50 transition-colors">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">🔗</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">URL Shortener</h3>
            <p className="text-zinc-400 mb-4">
              Redirect requests within 100ms P95 at 5k RPS. Cache hot URLs and optimize for reads.
            </p>
            <div className="flex items-center text-sm text-zinc-500">
              <span className="px-2 py-1 bg-zinc-700 rounded">5k RPS</span>
              <span className="px-2 py-1 bg-zinc-700 rounded ml-2">100ms P95</span>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <Link
            href="/play"
            prefetch
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-semibold text-lg transition-colors"
            onMouseEnter={warmPlay}
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
              <Link href="/docs" prefetch className="text-zinc-400 hover:text-white transition-colors" onMouseEnter={() => router.prefetch("/docs")}>
                Documentation
              </Link>
              <Link href="/feedback" prefetch className="text-zinc-400 hover:text-white transition-colors" onMouseEnter={() => router.prefetch("/feedback")}>
                Feedback
              </Link>
              <Link href="/play" prefetch className="text-zinc-400 hover:text-white transition-colors" onMouseEnter={warmPlay}>
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
