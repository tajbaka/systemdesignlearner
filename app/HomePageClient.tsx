"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { logger } from "@/lib/logger";
import { Navbar } from "@/components/Navbar";
import DemoBoard from "./components/DemoBoard";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function HomePageClient() {
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [newsletterMessage, setNewsletterMessage] = useState<string>('');

  const handleNewsletterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNewsletterStatus('submitting');

    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get('email') as string;
    const data = {
      email,
    };

    track("email_capture_submitted", { source: "homepage-footer", emailDomain: email.split("@")[1] ?? "unknown" });

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to subscribe');
      }

      // Handle already subscribed case
      if (result.message === 'Already subscribed!') {
        setNewsletterStatus('success');
        setNewsletterMessage('Thanks for subscribing, you\'re already on our list!');
        track("email_capture_already_subscribed", { source: "homepage-footer" });
        // Reset form after success
        form.reset();
        setTimeout(() => {
          setNewsletterStatus('idle');
          setNewsletterMessage('');
        }, 3000);
        return;
      }

      setNewsletterStatus('success');
      setNewsletterMessage('Successfully subscribed!');
      track("email_capture_success", { source: "homepage-footer" });

      // Reset form after success
      form.reset();

      // Reset status after showing success message
      setTimeout(() => {
        setNewsletterStatus('idle');
        setNewsletterMessage('');
      }, 3000);
    } catch (error) {
      logger.error('Newsletter subscription error:', error);
      setNewsletterStatus('error');
      track("email_capture_error", { source: "homepage-footer" });

      // Reset status after showing error message
      setTimeout(() => setNewsletterStatus('idle'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header/Navbar */}
      <Navbar />

      {/* Hero Section */}
<section className="relative border-b border-zinc-800">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16" style={{ paddingTop: '120px' }}>
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
        Master System Design Through
        <span className="block text-emerald-400 mt-2">
          Visual Practice
        </span>
      </motion.h1>

      <motion.p
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-3xl mx-auto leading-relaxed"
      >
        Drag components, connect flows, and simulate production-scale architectures.
        Get instant feedback on latency, capacity, and design decisions.
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
            href="/practice/url-shortener"
            aria-label="Try URL Shortener Scenario"
            onClick={() => track("homepage_try_url_shortener_clicked")}
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
        <div className="absolute inset-0 opacity-[0.08]" style={{
          backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px), radial-gradient(#10b981 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px'
        }}></div>
        <div className="max-w-7xl mx-auto relative">
          {/* Section Header */}
          <div className="border-b border-zinc-800 px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <span className="text-sm font-mono text-zinc-500 tracking-wider">[01] HOW IT WORKS</span>
            </div>
          </div>

          {/* Step 1: Pick a Scenario */}
          <div className="border-b border-zinc-800">
            <div className="grid lg:grid-cols-2">
              <div className="flex flex-col p-8 lg:p-12 border-r border-zinc-800">
                <p className="mb-2 font-mono text-xs font-medium text-emerald-400">STEP 01</p>
                <h3 className="mb-4 text-3xl font-bold tracking-tight">Pick a Scenario</h3>
                <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                  Choose from real-world challenges with clear requirements: target latency, RPS capacity,
                  and success criteria. Each scenario is designed to teach specific system design patterns.
                </p>
                <ul className="space-y-3 text-zinc-400">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Production-scale requirements (P95 latency, RPS targets)
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Real-world patterns (CDN, caching, load balancing)
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
                      <CardDescription className="text-sm text-zinc-300">P95 Latency: 100ms | Target RPS: 5k</CardDescription>
                    </CardHeader>
                  </Card>
                  <Card className="bg-zinc-800/80 border-zinc-600 hover:border-emerald-500/50 transition-colors cursor-pointer">
                    <CardHeader>
                      <CardTitle className="text-lg text-white">Spotify Play</CardTitle>
                      <CardDescription className="text-sm text-zinc-300">P95 Latency: 200ms | Target RPS: 2k</CardDescription>
                    </CardHeader>
                  </Card>
                  <Card className="bg-zinc-800/80 border-zinc-600 hover:border-emerald-500/50 transition-colors cursor-pointer">
                    <CardHeader>
                      <CardTitle className="text-lg text-white">CDN Design</CardTitle>
                      <CardDescription className="text-sm text-zinc-300">P95 Latency: 80ms | Target RPS: 8k</CardDescription>
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
                  Each component has realistic performance characteristics based on industry standards.
                </p>
                <ul className="space-y-3 text-zinc-400">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    9 component types: Web, CDN, API Gateway, Service, Redis, Postgres, S3, Kafka, Load Balancer
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Directional connections show data flow
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
                <h3 className="mb-4 text-3xl font-bold tracking-tight">Run Simulation & Get Feedback</h3>
                <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                  Our simulation engine analyzes your architecture in real-time. Get instant feedback on
                  performance, capacity, and bottlenecks without writing a single line of code.
                </p>
                <ul className="space-y-3 text-zinc-400">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    P95 latency calculations with component-level breakdown
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Capacity analysis and bottleneck identification
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
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
                  Understand why your design works (or doesn&apos;t). Share your solutions with others
                  or fork existing designs to learn different approaches to the same problem.
                </p>
                <ul className="space-y-3 text-zinc-400">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    Share via URL with compressed Base64 encoding
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    Fork and modify existing solutions
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
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
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>

                  <Card className="bg-zinc-900/50 border-emerald-500/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm text-white">Version 2: With Caching</CardTitle>
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
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
        <div className="max-w-7xl mx-auto relative">
          {/* Section Header */}
          <div className="border-b border-zinc-800 px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <span className="text-sm font-mono text-zinc-500 tracking-wider">[02] KEY FEATURES</span>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 border-zinc-800">
            {/* Feature 1 */}
            <div className="border-b md:border-r border-zinc-800 p-8 lg:p-12 hover:bg-zinc-800/20 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Drag-and-Drop Canvas</h3>
                  <p className="text-zinc-400 leading-relaxed">
                    Build architectures visually on an infinite grid. Place components and connect them
                    with directional edges. Pan and zoom to manage complex designs.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="border-b border-zinc-800 p-8 lg:p-12 hover:bg-zinc-800/20 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Real-Time Simulation</h3>
                  <p className="text-zinc-400 leading-relaxed">
                    Get instant feedback on P95 latency, capacity, and bottlenecks. Our simulation engine
                    analyzes your design without requiring any code.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="border-b md:border-r border-zinc-800 p-8 lg:p-12 hover:bg-zinc-800/20 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Production-Scale Scenarios</h3>
                  <p className="text-zinc-400 leading-relaxed">
                    Practice with real-world requirements like Spotify Play (200ms P95, 2k RPS),
                    URL Shortener (100ms, 5k RPS), and CDN Design (80ms, 8k RPS).
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="border-b border-zinc-800 p-8 lg:p-12 hover:bg-zinc-800/20 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
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
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
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
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
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

      {/* CTA Section */}
      <section className="border-b border-zinc-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          background: 'repeating-linear-gradient(-45deg, #10b981, #10b981 5px, transparent 5px, transparent 25px)'
        }}></div>
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-transparent to-zinc-900"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Ready to Master System Design?
            </h2>
            <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Start practicing with real-world scenarios. No theory, just hands-on experience
              with instant feedback on your architectural decisions.
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

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 pb-8">
            {/* Brand Section */}
            <div className="lg:col-span-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">SD</span>
                </div>
                <span className="text-xl font-bold text-white">System Design Sandbox</span>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-md mb-6">
                Interactive system design playground — drag, connect, and simulate realistic architectures. Master system design through hands-on practice.
              </p>

              {/* Social Links */}
              <div className="flex items-center gap-4">
                <a
                  href="https://www.linkedin.com/in/antonio-coppe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
                  aria-label="LinkedIn Profile"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                <a
                  href="https://antoniocoppe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
                  aria-label="Portfolio Website"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
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
                <li>
                  <Link href="/feedback" className="text-zinc-400 hover:text-white transition-colors text-sm">
                    Feedback
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company Column */}
            <div className="lg:col-span-2">
              <h3 className="text-white font-semibold text-sm mb-4">Company</h3>
              <ul className="space-y-3">
                <li>
                  <a href="https://github.com/AntonioCoppe" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors text-sm">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="https://www.linkedin.com/in/antonio-coppe" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors text-sm">
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a href="https://antoniocoppe.com" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors text-sm">
                    Portfolio
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal Column */}
            <div className="lg:col-span-2">
              <h3 className="text-white font-semibold text-sm mb-4">Legal</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/privacy" className="text-zinc-400 hover:text-white transition-colors text-sm">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-zinc-400 hover:text-white transition-colors text-sm">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="text-zinc-400 hover:text-white transition-colors text-sm">
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>

            {/* Newsletter Column */}
            <div className="lg:col-span-2">
              <h3 className="text-white font-semibold text-sm mb-4">Stay Updated</h3>
              <p className="text-zinc-400 text-sm mb-4">Get updates and help validate this idea.</p>
              <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                <Input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  className="w-full bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  required
                />
                <Button
                  type="submit"
                  disabled={newsletterStatus === 'submitting'}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-700 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all duration-300"
                  aria-label="Subscribe to Newsletter"
                  size="sm"
                >
                  {newsletterStatus === 'submitting' && (
                    <svg className="animate-spin h-3 w-3 mr-2 inline" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {newsletterStatus === 'success' ? 'Subscribed!' :
                   newsletterStatus === 'error' ? 'Try again' :
                   'Subscribe'}
                </Button>
                {newsletterStatus === 'error' && (
                  <p className="text-red-400 text-xs text-center">Subscription failed. Please try again.</p>
                )}
                {newsletterStatus === 'success' && newsletterMessage && (
                  <p className="text-green-400 text-xs text-center">{newsletterMessage}</p>
                )}
              </form>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-zinc-800">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-zinc-500 text-sm">
                © {new Date().getFullYear()} System Design Sandbox. Built by Antonio Coppe.
              </p>
              <div className="flex items-center gap-6">
                <Link href="/privacy" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
                  Privacy
                </Link>
                <Link href="/terms" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
                  Terms
                </Link>
                <Link href="/cookies" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
                  Cookies
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
