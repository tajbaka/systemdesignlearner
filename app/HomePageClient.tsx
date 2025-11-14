"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { logger } from "@/lib/logger";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import DemoBoard from "./components/DemoBoard";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function HomePageClient() {
  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header/Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 lg:pt-32 pb-16">
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.h1
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 leading-tight tracking-tight"
            >
              Ace Your System Design Interview
              <span className="block text-emerald-400 mt-2">Interactive Practice & Tutorials</span>
            </motion.h1>

            <motion.p
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-3xl mx-auto leading-relaxed"
            >
              Learn distributed systems, scalability patterns, and architecture design through hands-on practice.
              Drag components, simulate production architectures, and get instant feedback on your designs.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3, type: "spring", stiffness: 100 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            >
              <Button
                asChild
                size="lg"
                className="px-10 py-6 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-lg shadow-lg hover:shadow-emerald-500/50 transition-all duration-300"
              >
                <Link
                  href="/practice/url-shortener/intro"
                  aria-label="Try URL Shortener Scenario"
                  onClick={() => {
                    track("homepage_try_url_shortener_clicked");
                    // Fire Meta Conversions API event
                    fetch("/api/meta-analytics", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ event_name: "try_url_shortener" }),
                    }).catch((err) => logger.error("Meta analytics error:", err));
                  }}
                >
                  Try URL Shortener Scenario
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="px-10 py-6 border-2 border-zinc-600 hover:border-emerald-500/50 text-zinc-300 hover:text-white font-semibold text-lg transition-all duration-300"
              >
                <Link
                  href="/practice"
                  aria-label="Explore All Scenarios"
                  onClick={() => track("homepage_explore_scenarios_clicked")}
                >
                  Explore All Scenarios
                </Link>
              </Button>
            </motion.div>

            {/* Interactive Demo */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="max-w-6xl mx-auto"
            >
              <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-6 sm:p-10 shadow-2xl">
                <DemoBoard />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="border-b border-zinc-800 relative">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(#10b981 1px, transparent 1px), radial-gradient(#10b981 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            backgroundPosition: "0 0, 10px 10px",
          }}
        ></div>
        <div className="max-w-7xl mx-auto relative">
          {/* Section Header */}
          <div className="border-b border-zinc-800 px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <span className="text-sm font-mono text-zinc-500 tracking-wider">
                [01] HOW IT WORKS
              </span>
            </div>
          </div>

          {/* Step 1: Pick a Scenario */}
          <div className="border-b border-zinc-800">
            <div className="grid lg:grid-cols-2">
              <div className="flex flex-col p-8 lg:p-12 border-r border-zinc-800">
                <p className="mb-2 font-mono text-xs font-medium text-emerald-400">STEP 01</p>
                <h3 className="mb-4 text-3xl font-bold tracking-tight">Pick a Scenario</h3>
                <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                  Choose from real-world challenges with clear requirements: target latency, RPS
                  capacity, and success criteria. Each scenario is designed to teach specific system
                  design patterns.
                </p>
                <ul className="space-y-3 text-zinc-400">
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Production-scale requirements (P95 latency, RPS targets)
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Real-world patterns (CDN, caching, load balancing)
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Clear success criteria for validation
                  </li>
                </ul>
              </div>
              <div className="bg-zinc-800/40 flex items-center justify-center p-8 lg:p-12 min-h-[400px]">
                <div className="w-full max-w-md space-y-4">
                  <Card className="bg-zinc-800/80 border-zinc-600 hover:border-emerald-500/50 transition-colors cursor-pointer">
                    <CardHeader>
                      <CardTitle className="text-lg text-white">URL Shortener</CardTitle>
                      <CardDescription className="text-sm text-zinc-300">
                        P95 Latency: 100ms | Target RPS: 5k
                      </CardDescription>
                    </CardHeader>
                  </Card>
                  <Card className="bg-zinc-800/80 border-zinc-600 hover:border-emerald-500/50 transition-colors cursor-pointer">
                    <CardHeader>
                      <CardTitle className="text-lg text-white">Spotify Play</CardTitle>
                      <CardDescription className="text-sm text-zinc-300">
                        P95 Latency: 200ms | Target RPS: 2k
                      </CardDescription>
                    </CardHeader>
                  </Card>
                  <Card className="bg-zinc-800/80 border-zinc-600 hover:border-emerald-500/50 transition-colors cursor-pointer">
                    <CardHeader>
                      <CardTitle className="text-lg text-white">CDN Design</CardTitle>
                      <CardDescription className="text-sm text-zinc-300">
                        P95 Latency: 80ms | Target RPS: 8k
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Design Your Architecture */}
          <div className="border-b border-zinc-800">
            <div className="grid lg:grid-cols-2">
              <div className="flex flex-col p-8 lg:p-12 border-r border-zinc-800">
                <p className="mb-2 font-mono text-xs font-medium text-emerald-400">STEP 02</p>
                <h3 className="mb-4 text-3xl font-bold tracking-tight">Design Your Architecture</h3>
                <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                  Drag components onto an infinite canvas and connect them to build your system.
                  Each component has realistic performance characteristics based on industry
                  standards.
                </p>
                <ul className="space-y-3 text-zinc-400">
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    9 component types: Web, CDN, API Gateway, Service, Redis, Postgres, S3, Kafka,
                    Load Balancer
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Directional connections show data flow
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Pan and zoom to manage complex designs
                  </li>
                </ul>
              </div>
              <div className="bg-zinc-800/40 flex items-center justify-center p-8 lg:p-12 min-h-[400px]">
                <div className="w-full max-w-2xl">
                  <Image
                    src="/Screen Recording 2025-11-03 at 11.36.04-fast.gif"
                    alt="Drag-and-drop interface with visual feedback"
                    width={800}
                    height={600}
                    className="w-full h-auto rounded-lg shadow-2xl border border-zinc-700"
                    unoptimized
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Run Simulation */}
          <div className="border-b border-zinc-800">
            <div className="grid lg:grid-cols-2">
              <div className="flex flex-col p-8 lg:p-12 border-r border-zinc-800">
                <p className="mb-2 font-mono text-xs font-medium text-emerald-400">STEP 03</p>
                <h3 className="mb-4 text-3xl font-bold tracking-tight">
                  Run Simulation & Get Feedback
                </h3>
                <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                  Our simulation engine analyzes your architecture in real-time. Get instant
                  feedback on performance, capacity, and bottlenecks without writing a single line
                  of code.
                </p>
                <ul className="space-y-3 text-zinc-400">
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    P95 latency calculations with component-level breakdown
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Capacity analysis and bottleneck identification
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    SLO compliance validation
                  </li>
                </ul>
              </div>
              <div className="bg-zinc-800/40 flex items-center justify-center p-8 lg:p-12 min-h-[400px]">
                <div className="w-full max-w-md">
                  <Card className="bg-zinc-900/50 border-emerald-500/50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        Simulation Results
                        <span className="text-emerald-400 text-sm">✓ Passed</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-700">
                          <span className="text-zinc-400">P95 Latency</span>
                          <span className="text-white font-mono">98ms</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-700">
                          <span className="text-zinc-400">Capacity</span>
                          <span className="text-white font-mono">5.2k RPS</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">SLO Status</span>
                          <span className="text-emerald-400 font-mono">Compliant</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Learn & Iterate */}
          <div>
            <div className="grid lg:grid-cols-2">
              <div className="flex flex-col p-8 lg:p-12 border-r border-zinc-800">
                <p className="mb-2 font-mono text-xs font-medium text-emerald-400">STEP 04</p>
                <h3 className="mb-4 text-3xl font-bold tracking-tight">Learn & Iterate</h3>
                <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                  Understand why your design works (or doesn&apos;t). Share your solutions with
                  others or fork existing designs to learn different approaches to the same problem.
                </p>
                <ul className="space-y-3 text-zinc-400">
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                      />
                    </svg>
                    Share via URL with compressed Base64 encoding
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                      />
                    </svg>
                    Fork and modify existing solutions
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                      />
                    </svg>
                    Compare different architectural approaches
                  </li>
                </ul>
              </div>
              <div className="bg-zinc-800/40 flex items-center justify-center p-8 lg:p-12 min-h-[400px]">
                <div className="w-full max-w-md space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 h-px bg-zinc-700"></div>
                    <span className="text-xs text-zinc-500 font-mono">ITERATIONS</span>
                    <div className="flex-1 h-px bg-zinc-700"></div>
                  </div>

                  <Card className="bg-zinc-900/50 border-zinc-700">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm text-white">Version 1: Basic Setup</CardTitle>
                        <span className="text-xs text-red-400">Failed</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-zinc-400">
                          <span>P95 Latency</span>
                          <span className="text-red-400 font-mono">145ms</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-center">
                    <svg
                      className="w-4 h-4 text-emerald-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  </div>

                  <Card className="bg-zinc-900/50 border-emerald-500/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm text-white">
                          Version 2: With Caching
                        </CardTitle>
                        <span className="text-xs text-emerald-400">Passed</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-zinc-400">
                          <span>P95 Latency</span>
                          <span className="text-emerald-400 font-mono">82ms</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="border-b border-zinc-800 relative">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        ></div>
        <div className="max-w-7xl mx-auto relative">
          {/* Section Header */}
          <div className="border-b border-zinc-800 px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <span className="text-sm font-mono text-zinc-500 tracking-wider">
                [02] KEY FEATURES
              </span>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 border-zinc-800">
            {/* Feature 1 */}
            <div className="border-b md:border-r border-zinc-800 p-8 lg:p-12 hover:bg-zinc-800/20 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                  <svg
                    className="w-6 h-6 text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Drag-and-Drop Canvas</h3>
                  <p className="text-zinc-400 leading-relaxed">
                    Build architectures visually on an infinite grid. Place components and connect
                    them with directional edges. Pan and zoom to manage complex designs.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="border-b border-zinc-800 p-8 lg:p-12 hover:bg-zinc-800/20 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                  <svg
                    className="w-6 h-6 text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Real-Time Simulation</h3>
                  <p className="text-zinc-400 leading-relaxed">
                    Get instant feedback on P95 latency, capacity, and bottlenecks. Our simulation
                    engine analyzes your design without requiring any code.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="border-b md:border-r border-zinc-800 p-8 lg:p-12 hover:bg-zinc-800/20 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                  <svg
                    className="w-6 h-6 text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Production-Scale Scenarios</h3>
                  <p className="text-zinc-400 leading-relaxed">
                    Practice with real-world requirements like Spotify Play (200ms P95, 2k RPS), URL
                    Shortener (100ms, 5k RPS), and CDN Design (80ms, 8k RPS).
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="border-b border-zinc-800 p-8 lg:p-12 hover:bg-zinc-800/20 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                  <svg
                    className="w-6 h-6 text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Share & Collaborate</h3>
                  <p className="text-zinc-400 leading-relaxed">
                    One-click URL sharing with Base64 encoding. Fork existing designs to learn
                    different approaches and compare solutions.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="md:border-r border-zinc-800 p-8 lg:p-12 hover:bg-zinc-800/20 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                  <svg
                    className="w-6 h-6 text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">9 Component Types</h3>
                  <p className="text-zinc-400 leading-relaxed">
                    Web, CDN, API Gateway, Service, Redis, Postgres, S3, Kafka, and Load Balancer.
                    Each with realistic performance characteristics.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="p-8 lg:p-12 hover:bg-zinc-800/20 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                  <svg
                    className="w-6 h-6 text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Mobile-Friendly</h3>
                  <p className="text-zinc-400 leading-relaxed">
                    Touch gestures, bottom sheets, and responsive design. Practice system design
                    anywhere, anytime on any device.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Scenarios Section - Internal Linking */}
      <section className="border-b border-zinc-800 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              System Design Interview Practice Scenarios
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Master real-world system design patterns with our interactive tutorials and examples
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/practice/url-shortener/intro" onClick={() => track("homepage_scenario_url_shortener_clicked")}>
              <Card className="bg-zinc-800/40 border-zinc-700 hover:border-emerald-500/50 transition-all cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-xl">URL Shortener System</CardTitle>
                  <CardDescription>Learn distributed systems, caching, and scalability patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-zinc-400">
                    <p>• Handle millions of requests per second</p>
                    <p>• Design efficient hashing algorithms</p>
                    <p>• Implement caching strategies</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/practice" onClick={() => track("homepage_all_scenarios_clicked")}>
              <Card className="bg-zinc-800/40 border-zinc-700 hover:border-emerald-500/50 transition-all cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-xl">More Coming Soon</CardTitle>
                  <CardDescription>Twitter, Instagram, Netflix & more system design examples</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-zinc-400">
                    <p>• Social media feed design</p>
                    <p>• Video streaming architecture</p>
                    <p>• Real-time messaging systems</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/docs" onClick={() => track("homepage_docs_clicked")}>
              <Card className="bg-zinc-800/40 border-zinc-700 hover:border-emerald-500/50 transition-all cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-xl">System Design Tutorial</CardTitle>
                  <CardDescription>Complete guide to architecture patterns and best practices</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-zinc-400">
                    <p>• Architecture fundamentals</p>
                    <p>• Scalability techniques</p>
                    <p>• Interview preparation tips</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section with Schema Markup */}
      <section className="border-b border-zinc-800 relative bg-zinc-900/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-zinc-400">
              Everything you need to know about system design interview preparation
            </p>
          </div>

          <div className="space-y-6">
            <details className="bg-zinc-800/40 border border-zinc-700 rounded-lg p-6 group">
              <summary className="cursor-pointer text-xl font-semibold text-white list-none flex items-center justify-between">
                How do I prepare for a system design interview?
                <svg className="w-5 h-5 text-emerald-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-zinc-400 leading-relaxed">
                Start by practicing with interactive scenarios like our URL shortener tutorial. Focus on understanding distributed systems, scalability patterns, and architecture trade-offs. Practice designing systems end-to-end, from requirements gathering to capacity planning. Our platform provides instant feedback on your designs to accelerate learning.
              </p>
            </details>

            <details className="bg-zinc-800/40 border border-zinc-700 rounded-lg p-6 group">
              <summary className="cursor-pointer text-xl font-semibold text-white list-none flex items-center justify-between">
                What is system design and why is it important?
                <svg className="w-5 h-5 text-emerald-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-zinc-400 leading-relaxed">
                System design is the process of defining the architecture, components, and data flow of large-scale software systems. It&apos;s crucial for building scalable, reliable applications and is a key evaluation criterion in senior engineering interviews at top tech companies.
              </p>
            </details>

            <details className="bg-zinc-800/40 border border-zinc-700 rounded-lg p-6 group">
              <summary className="cursor-pointer text-xl font-semibold text-white list-none flex items-center justify-between">
                What are the most common system design interview questions?
                <svg className="w-5 h-5 text-emerald-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-zinc-400 leading-relaxed">
                Common questions include designing URL shorteners, social media feeds (Twitter/Instagram), video streaming platforms (Netflix/YouTube), messaging systems (WhatsApp), ride-sharing apps (Uber), and e-commerce sites (Amazon). Each teaches different scalability and architecture patterns.
              </p>
            </details>

            <details className="bg-zinc-800/40 border border-zinc-700 rounded-lg p-6 group">
              <summary className="cursor-pointer text-xl font-semibold text-white list-none flex items-center justify-between">
                How long does it take to learn system design?
                <svg className="w-5 h-5 text-emerald-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-zinc-400 leading-relaxed">
                With focused practice, you can learn core system design concepts in 4-8 weeks. Our interactive platform accelerates learning by providing hands-on practice with real-time feedback. Practice 3-4 scenarios per week to build strong fundamentals for your system design interview.
              </p>
            </details>

            <details className="bg-zinc-800/40 border border-zinc-700 rounded-lg p-6 group">
              <summary className="cursor-pointer text-xl font-semibold text-white list-none flex items-center justify-between">
                Is System Design Sandbox free to use?
                <svg className="w-5 h-5 text-emerald-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-zinc-400 leading-relaxed">
                Yes! System Design Sandbox is completely free. We provide interactive tutorials, practice scenarios, and instant feedback at no cost. Our mission is to make high-quality system design education accessible to everyone preparing for technical interviews.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-b border-zinc-800 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            background:
              "repeating-linear-gradient(-45deg, #10b981, #10b981 5px, transparent 5px, transparent 25px)",
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-transparent to-zinc-900"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">Ready to Ace Your System Design Interview?</h2>
            <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Start practicing with real-world scenarios. No theory, just hands-on experience with
              instant feedback on your architectural decisions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="px-10 py-6 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-lg shadow-lg hover:shadow-emerald-500/50 transition-all duration-300"
              >
                <Link
                  href="/practice/url-shortener"
                  aria-label="Start Practicing Now"
                  onClick={() => track("homepage_cta_practice_clicked")}
                >
                  Start Practicing Now
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="px-10 py-6 border-2 border-zinc-600 hover:border-emerald-500/50 text-zinc-300 hover:text-white font-semibold text-lg transition-all duration-300"
              >
                <Link
                  href="/practice"
                  aria-label="Browse Scenarios"
                  onClick={() => track("homepage_cta_browse_clicked")}
                >
                  Browse All Scenarios
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
