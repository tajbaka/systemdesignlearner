"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import DemoBoard from "./components/DemoBoard";

export function HomePageClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  // Animation variants for features section
  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.3 } }
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormStatus('submitting');

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('email'),
      name: formData.get('name'),
      feedback: formData.get('feedback'),
      timestamp: new Date().toISOString(),
    };

    try {
      // For now, just log the data. In production, you'd send this to an API
      console.log('Feedback submitted:', data);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setFormStatus('success');

      // Reset form after success
      e.currentTarget.reset();

      // Reset status after showing success message
      setTimeout(() => setFormStatus('idle'), 3000);
    } catch (error) {
      console.error('Form submission error:', error);
      setFormStatus('error');

      // Reset status after showing error message
      setTimeout(() => setFormStatus('idle'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header/Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-32">
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
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
            >
              Practice System Design.
              <span className="block text-emerald-400 mt-2">Visually. Fast Feedback.</span>
            </motion.h1>

            <motion.p
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="text-lg sm:text-xl text-zinc-300 mb-8 max-w-3xl mx-auto leading-relaxed"
            >
              Drag, connect, and simulate realistic architectures in an infinite grid. Get instant insights on capacity, latency, and SLOs.
            </motion.p>

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            >
              <Link
                href="/play"
                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-lg rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
                aria-label="Try URL Shortener Scenario"
              >
                Try URL Shortener Scenario
              </Link>
              <Link
                href="/practice"
                className="px-8 py-4 border-2 border-zinc-600 hover:border-zinc-400 text-zinc-300 hover:text-white font-semibold text-lg rounded-lg transition-colors duration-200"
                aria-label="Explore All Scenarios"
              >
                Explore All Scenarios
              </Link>
            </motion.div>

            {/* Interactive Demo Board */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="max-w-4xl mx-auto mb-12"
            >
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-8 text-center">
                <DemoBoard />
              </div>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              className="text-center"
            >
              <p className="text-zinc-400 mb-2">Built by Antonio Coppe – loved by devs for hands-on practice</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything You Need to Practice</h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Built for developers who want to learn system design through practical, interactive experience
            </p>
          </div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* Feature 1 */}
            <motion.div variants={item} className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-6 hover:border-emerald-500/30 transition-colors duration-200">
              <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Drag-and-Design</h3>
              <p className="text-zinc-400 leading-relaxed">
                Place components (Web, CDN, API Gateway, Service, Redis, Postgres, S3, Kafka, Load Balancer) on an infinite grid and connect them with directional edges.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div variants={item} className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-6 hover:border-emerald-500/30 transition-colors duration-200">
              <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Scenario-Driven Practice</h3>
              <p className="text-zinc-400 leading-relaxed">
                Pick from real-world scenarios like Spotify Play (200ms P95, 2k RPS), URL Shortener (100ms P95, 5k RPS), and CDN Design (80ms P95, 8k RPS).
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div variants={item} className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-6 hover:border-emerald-500/30 transition-colors duration-200">
              <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Fast Simulation</h3>
              <p className="text-zinc-400 leading-relaxed">
                Get instant feedback with P95 latency calculations, RPS capacity checks, SLO validation, and bottleneck identification through our lightweight simulation engine.
              </p>
            </motion.div>

            {/* Feature 4 */}
            {/* Feature 4 */}
            <motion.div variants={item} className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-6 hover:border-emerald-500/30 transition-colors duration-200 md:col-span-2 lg:col-span-3">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-3">Share &amp; Fork</h3>
                  <p className="text-zinc-400 leading-relaxed">
                    One-click URL encoding of your designs with compressed Base64. Recipients can fork your architecture and build upon it. Perfect for collaborative learning and sharing solutions.
                  </p>
                </div>
              </div>
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-zinc-400">Four simple steps to master system design</p>
          </div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={item} className="text-center">
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-4">Pick a Scenario</h3>
              <p className="text-zinc-400 leading-relaxed">
                Choose from real-world challenges like &ldquo;Spotify Play at 200ms P95, 2k RPS&rdquo; or &ldquo;URL Shortener at 100ms P95, 5k RPS&rdquo; with clear requirements and success criteria.
              </p>
            </motion.div>

            <motion.div variants={item} className="text-center">
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-4">Drag Components</h3>
              <p className="text-zinc-400 leading-relaxed">
                Place Web, API Gateway, Service, Redis, Postgres, S3, Kafka, and Load Balancer components on the infinite grid. Connect them with directional edges to build your architecture.
              </p>
            </motion.div>

            <motion.div variants={item} className="text-center">
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-4">Connect & Simulate</h3>
              <p className="text-zinc-400 leading-relaxed">
                Wire up your components and run the simulation. Get instant feedback on P95 latency, capacity bottlenecks, SLO compliance, and backlog growth analysis.
              </p>
            </motion.div>

            <motion.div variants={item} className="text-center">
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                4
              </div>
              <h3 className="text-xl font-semibold mb-4">Review & Iterate</h3>
              <p className="text-zinc-400 leading-relaxed">
                Analyze results, identify bottlenecks, and optimize your design. Share your solution via URL encoding or fork existing designs to learn from others.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-zinc-400">Start free, upgrade when you&apos;re ready</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-8 hover:border-emerald-500/30 transition-colors duration-200">
              <h3 className="text-2xl font-bold mb-4">Free</h3>
              <p className="text-zinc-400 mb-6">Perfect for getting started and learning the basics</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-zinc-300">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Limited scenarios (3-5)
                </li>
                <li className="flex items-center text-zinc-300">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Basic simulation features
                </li>
                <li className="flex items-center text-zinc-300">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  URL sharing
                </li>
              </ul>
              <Link
                href="/play"
                className="w-full block text-center px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold rounded-lg transition-colors duration-200"
                aria-label="Start Free"
              >
                Start Free
              </Link>
            </div>

            {/* Premium Tier */}
            <div className="bg-zinc-800/30 border-2 border-emerald-500/50 rounded-xl p-8 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-semibold">Coming Soon</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Premium</h3>
              <p className="text-zinc-400 mb-6">For serious system design practice and advanced features</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-zinc-300">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Unlimited scenarios
                </li>
                <li className="flex items-center text-zinc-300">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Advanced analytics
                </li>
                <li className="flex items-center text-zinc-300">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Chaos mode & stress testing
                </li>
                <li className="flex items-center text-zinc-300">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Priority support
                </li>
              </ul>
              <button
                disabled
                className="w-full block text-center px-6 py-3 bg-emerald-500/50 text-zinc-400 font-semibold rounded-lg cursor-not-allowed"
                aria-label="Coming Soon"
              >
                Sign Up for Updates
              </button>
              <p className="text-xs text-zinc-500 text-center mt-2">Details coming soon at x.ai/grok</p>
            </div>
          </div>

          {/* Validation Note */}
          <div className="text-center mt-12">
            <p className="text-zinc-400">
              <strong>Help Validate This Idea:</strong> We&apos;re building this for the developer community. Your feedback shapes the future of system design education.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-zinc-400">Everything you need to know about practicing system design</p>
          </div>

          <div className="space-y-4">
            {/* FAQ Item 1 */}
            <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl">
              <button
                onClick={() => toggleFaq(0)}
                className="w-full text-left p-6 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl"
                aria-expanded={openFaq === 0}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">What makes System Design Sandbox special?</h3>
                  <svg
                    className={`w-5 h-5 text-zinc-400 transform transition-transform duration-200 ${openFaq === 0 ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              <AnimatePresence>
                {openFaq === 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-6 pb-6 pt-4 overflow-hidden"
                  >
                    <p className="text-zinc-400 leading-relaxed">
                      Unlike abstract theory or expensive courses, we provide hands-on practice where you can immediately see the impact of your architectural decisions. Drag components, connect them, and get real-time feedback on latency, capacity, and bottlenecks.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* FAQ Item 2 */}
            <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl">
              <button
                onClick={() => toggleFaq(1)}
                className="w-full text-left p-6 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl"
                aria-expanded={openFaq === 1}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">What scenarios are included?</h3>
                  <svg
                    className={`w-5 h-5 text-zinc-400 transform transition-transform duration-200 ${openFaq === 1 ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              <AnimatePresence>
                {openFaq === 1 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-6 pb-6 pt-4 overflow-hidden"
                  >
                    <p className="text-zinc-400 leading-relaxed mb-3">
                      We include production-scale scenarios like:
                    </p>
                    <ul className="text-zinc-400 space-y-1 ml-4">
                      <li>• <strong>Spotify Play</strong> (200ms P95, 2k RPS) - Stream media with caching and CDN</li>
                      <li>• <strong>Spotify Search</strong> (300ms P95, 1.5k RPS) - Catalog search with Redis and Postgres</li>
                      <li>• <strong>URL Shortener</strong> (100ms P95, 5k RPS) - Redirect service with caching</li>
                      <li>• <strong>Rate Limiter</strong> (120ms P95, 2k RPS) - Token bucket in Redis</li>
                      <li>• <strong>CDN Design</strong> (80ms P95, 8k RPS) - Global asset delivery</li>
                      <li>• <strong>Webhook Delivery</strong> (300ms P95, 3k RPS) - Async processing with Kafka</li>
                      <li>• And more: Typeahead Search, Leaderboard, Pastebin</li>
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* FAQ Item 3 */}
            <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl">
              <button
                onClick={() => toggleFaq(2)}
                className="w-full text-left p-6 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl"
                aria-expanded={openFaq === 2}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">What&apos;s the tech stack?</h3>
                  <svg
                    className={`w-5 h-5 text-zinc-400 transform transition-transform duration-200 ${openFaq === 2 ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              <AnimatePresence>
                {openFaq === 2 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-6 pb-6 pt-4 overflow-hidden"
                  >
                    <p className="text-zinc-400 leading-relaxed">
                      Built with Next.js 15, React 19, and TypeScript for the frontend. Uses Vitest for testing, Tailwind CSS 4 for styling, and framer-motion for animations. The simulation engine is a custom lightweight model that calculates latency and capacity.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* FAQ Item 4 */}
            <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl">
              <button
                onClick={() => toggleFaq(3)}
                className="w-full text-left p-6 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl"
                aria-expanded={openFaq === 3}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Is it mobile-friendly?</h3>
                  <svg
                    className={`w-5 h-5 text-zinc-400 transform transition-transform duration-200 ${openFaq === 3 ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              <AnimatePresence>
                {openFaq === 3 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-6 pb-6 pt-4 overflow-hidden"
                  >
                    <p className="text-zinc-400 leading-relaxed">
                      Yes! We support touch gestures, bottom sheets for mobile interactions, and responsive design that works great on phones and tablets. You can practice system design anywhere, anytime.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Validation Form Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-zinc-900/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Help Validate This Idea</h2>
            <p className="text-lg text-zinc-400 mb-8">
              We&apos;re building this tool for the developer community. What scenarios would you add? What features matter most to you?
            </p>
          </div>

          <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-8">
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-2">
                    Name (Optional)
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Your Name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="feedback" className="block text-sm font-medium text-zinc-300 mb-2">
                  What scenarios would you add? Any feature requests?
                </label>
                <textarea
                  id="feedback"
                  name="feedback"
                  rows={4}
                  className="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-vertical"
                  placeholder="I'd love to see a video streaming scenario, or support for custom components..."
                  required
                />
              </div>

              <div className="text-center">
                <motion.button
                  type="submit"
                  disabled={formStatus === 'submitting'}
                  className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  aria-label="Submit Feedback"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {formStatus === 'submitting' && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {formStatus === 'success' ? 'Thanks for your feedback!' :
                    formStatus === 'error' ? 'Something went wrong. Please try again.' :
                      'Submit Feedback'}
                </motion.button>
              </div>
            </form>
          </div>
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

            {/* Newsletter Column */}
            <div className="lg:col-span-2">
              <h3 className="text-white font-semibold text-sm mb-4">Stay Updated</h3>
              <p className="text-zinc-400 text-sm mb-4">Get updates and help validate this idea.</p>
              <form className="space-y-3">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
                <button
                  type="submit"
                  className="w-full px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded transition-colors duration-200"
                  aria-label="Subscribe to Newsletter"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-zinc-800">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-zinc-500 text-sm">
                © {new Date().getFullYear()} System Design Sandbox. Built by Antonio Coppe.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
