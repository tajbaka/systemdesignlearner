"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { AuthenticatedNavbar } from "@/domains/authentication/AuthenticatedNavbar";
import { Footer } from "@/components/Footer";
import ReactFlowBoard from "@/domains/practice/back-end/high-level-design/components/design-board/ReactFlowBoard";
import type {
  BoardNode,
  BoardEdge,
} from "@/domains/practice/back-end/high-level-design/components/design-board/types";
import { getIcon } from "@/domains/practice/back-end/high-level-design/DesignBoardIcons";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Demo board nodes and edges for URL shortener architecture
const demoNodes: BoardNode[] = [
  {
    id: "demo-client",
    type: "Client",
    name: "Client",
    x: -250,
    y: 200,
    icon: getIcon("client"),
  },
  {
    id: "demo-gateway",
    type: "APIGateway",
    name: "API Gateway",
    x: 50,
    y: 200,
    icon: getIcon("api-gateway"),
  },
  {
    id: "demo-read-service",
    type: "Service",
    name: "Read Service",
    x: 350,
    y: 100,
    icon: getIcon("service"),
  },
  {
    id: "demo-write-service",
    type: "Service",
    name: "Write Service",
    x: 350,
    y: 280,
    icon: getIcon("service"),
  },
  {
    id: "demo-cache",
    type: "Cache",
    name: "Cache",
    x: 650,
    y: 50,
    icon: getIcon("cache"),
  },
  {
    id: "demo-main-db",
    type: "RelationDb",
    name: "SQL Database",
    x: 650,
    y: 200,
    icon: getIcon("sql"),
  },
  {
    id: "demo-background-service",
    type: "Service",
    name: "Background Service",
    x: 350,
    y: 450,
    icon: getIcon("service"),
  },
  {
    id: "demo-pregen-db",
    type: "RelationDb",
    name: "Pre-Generated URL Database",
    x: 650,
    y: 450,
    icon: getIcon("sql"),
  },
];

const demoEdges: BoardEdge[] = [
  // Client → API Gateway
  {
    id: "edge-1",
    from: "demo-client",
    to: "demo-gateway",
    sourceHandle: "right",
    targetHandle: "left",
  },
  // API Gateway → Write Service
  {
    id: "edge-2",
    from: "demo-gateway",
    to: "demo-write-service",
    sourceHandle: "bottom",
    targetHandle: "left",
  },
  // Write Service → Main Database
  {
    id: "edge-3",
    from: "demo-write-service",
    to: "demo-main-db",
    sourceHandle: "right",
    targetHandle: "left",
  },
  // API Gateway → Read Service
  {
    id: "edge-4",
    from: "demo-gateway",
    to: "demo-read-service",
    sourceHandle: "top",
    targetHandle: "left",
  },
  // Read Service → Cache
  {
    id: "edge-5",
    from: "demo-read-service",
    to: "demo-cache",
    sourceHandle: "right",
    targetHandle: "left",
  },
  // Read Service → Main Database
  {
    id: "edge-6",
    from: "demo-read-service",
    to: "demo-main-db",
    sourceHandle: "right",
    targetHandle: "left",
  },
  // Background Service → Pre-Generated Database
  {
    id: "edge-7",
    from: "demo-background-service",
    to: "demo-pregen-db",
    sourceHandle: "right",
    targetHandle: "left",
  },
  // Background Service → Main Database
  {
    id: "edge-8",
    from: "demo-background-service",
    to: "demo-main-db",
    sourceHandle: "top",
    targetHandle: "bottom",
  },
];

export function HomePageClient() {
  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header/Navbar */}
      <AuthenticatedNavbar />

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
              className="text-lg sm:text-xl text-zinc-400 mb-6 max-w-3xl mx-auto leading-relaxed"
            >
              Learn distributed systems, scalability patterns, and architecture design through
              hands-on practice. Drag components, simulate production architectures, and get instant
              feedback on your designs.
            </motion.p>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-10 text-sm text-zinc-500"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                100% Free
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                AI-Powered Feedback
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Real Interview Scenarios
              </span>
            </motion.div>

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
                  prefetch={false}
                  href="/practice/url-shortener"
                  aria-label="Try URL Shortener Scenario"
                  onClick={() => {
                    track("homepage_try_url_shortener_clicked");
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
                  prefetch={false}
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
                <div className="relative w-full h-96 bg-zinc-900/50 border border-zinc-700 rounded-xl overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none">
                    <ReactFlowBoard
                      nodes={demoNodes}
                      edges={demoEdges}
                      onNodesChange={() => {}}
                      onEdgesChange={() => {}}
                      className="w-full h-full"
                      style={{ backgroundColor: "transparent" }}
                      showMiniMap={false}
                    />
                  </div>
                </div>
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

          {/* Step 1: Functional Requirements */}
          <div className="border-b border-zinc-800">
            <div className="grid lg:grid-cols-2">
              <div className="flex flex-col p-8 lg:p-12 border-r border-zinc-800">
                <p className="mb-2 font-mono text-xs font-medium text-emerald-400">STEP 01</p>
                <h3 className="mb-4 text-3xl font-bold tracking-tight">Functional Requirements</h3>
                <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                  Start by defining what your system must do. Describe the core features and user
                  capabilities. An AI interviewer guides you with follow-up questions to ensure you
                  cover all essential requirements.
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
                    Define core user actions and system behavior
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
                    AI feedback highlights missing requirements
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
                    Iterate until you reach 100% coverage
                  </li>
                </ul>
              </div>
              <div className="bg-zinc-800/40 flex items-center justify-center p-8 lg:p-12 min-h-[400px]">
                <div className="w-full max-w-md space-y-4">
                  <Card className="bg-zinc-900/50 border-blue-500/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white">Your Answer</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-zinc-400 italic">
                        &quot;Users can shorten long URLs and get redirected when visiting short
                        links...&quot;
                      </p>
                    </CardContent>
                  </Card>
                  <div className="flex justify-center">
                    <svg
                      className="w-4 h-4 text-blue-400"
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
                  <Card className="bg-blue-950/40 border-blue-400/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-blue-300 flex items-center gap-2">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                        AI Interviewer
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-blue-100">
                        &quot;What about link expiration? Should users be able to set custom
                        aliases?&quot;
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Non-Functional Requirements */}
          <div className="border-b border-zinc-800">
            <div className="grid lg:grid-cols-2">
              <div className="flex flex-col p-8 lg:p-12 border-r border-zinc-800">
                <p className="mb-2 font-mono text-xs font-medium text-emerald-400">STEP 02</p>
                <h3 className="mb-4 text-3xl font-bold tracking-tight">
                  Non-Functional Requirements
                </h3>
                <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                  Define performance constraints: latency targets, throughput goals, and
                  availability requirements. The AI interviewer ensures you think about scalability,
                  consistency, and reliability.
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
                    Set P95 latency and RPS targets
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
                    Define availability and consistency needs
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
                    Consider read/write ratios and data retention
                  </li>
                </ul>
              </div>
              <div className="bg-zinc-800/40 flex items-center justify-center p-8 lg:p-12 min-h-[400px]">
                <div className="w-full max-w-md">
                  <Card className="bg-zinc-900/50 border-emerald-500/50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        Score: 5/5 (100%)
                        <span className="text-emerald-400 text-sm">Perfect!</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-2 text-emerald-100">
                          <svg
                            className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0"
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
                          <span>Latency target specified (100ms P95)</span>
                        </div>
                        <div className="flex items-start gap-2 text-emerald-100">
                          <svg
                            className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0"
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
                          <span>Throughput defined (5k RPS)</span>
                        </div>
                        <div className="flex items-start gap-2 text-emerald-100">
                          <svg
                            className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0"
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
                          <span>High availability requirement (99.9%)</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: API Design */}
          <div className="border-b border-zinc-800">
            <div className="grid lg:grid-cols-2">
              <div className="flex flex-col p-8 lg:p-12 border-r border-zinc-800">
                <p className="mb-2 font-mono text-xs font-medium text-emerald-400">STEP 03</p>
                <h3 className="mb-4 text-3xl font-bold tracking-tight">API Design</h3>
                <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                  Design the HTTP endpoints your service exposes. Define request/response formats,
                  HTTP methods, and paths. The AI ensures you cover all necessary endpoints with
                  proper documentation.
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
                    Define endpoints with HTTP methods
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
                    Document request/response payloads
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
                    AI validates completeness and best practices
                  </li>
                </ul>
              </div>
              <div className="bg-zinc-800/40 flex items-center justify-center p-8 lg:p-12 min-h-[400px]">
                <div className="w-full max-w-md space-y-3">
                  <Card className="bg-zinc-900/50 border-zinc-700">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-mono rounded">
                          POST
                        </span>
                        <span className="text-sm text-white font-mono">/api/v1/urls</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-zinc-400">Create a new short URL</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-zinc-900/50 border-zinc-700">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-mono rounded">
                          GET
                        </span>
                        <span className="text-sm text-white font-mono">/r/:code</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-zinc-400">Redirect to original URL</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-zinc-900/50 border-zinc-700">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-mono rounded">
                          GET
                        </span>
                        <span className="text-sm text-white font-mono">
                          /api/v1/urls/:code/stats
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-zinc-400">Get click analytics</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Design Canvas */}
          <div className="border-b border-zinc-800">
            <div className="grid lg:grid-cols-2">
              <div className="flex flex-col p-8 lg:p-12 border-r border-zinc-800">
                <p className="mb-2 font-mono text-xs font-medium text-emerald-400">STEP 04</p>
                <h3 className="mb-4 text-3xl font-bold tracking-tight">Design Canvas</h3>
                <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                  Build your architecture visually with drag-and-drop components. Connect services,
                  databases, caches, and load balancers. Run simulations to validate your design
                  meets the requirements.
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
                    Drag-and-drop architecture components
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
                    Real-time simulation with P95 latency
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
                    Iterate until SLO targets are met
                  </li>
                </ul>
              </div>
              <div className="bg-zinc-800/40 flex items-center justify-center p-8 lg:p-12 min-h-[400px]">
                <div className="w-full max-w-2xl">
                  <Image
                    src="/HighLevelDesignStep_3x.gif"
                    alt="Drag-and-drop high level design canvas"
                    width={800}
                    height={600}
                    className="w-full h-auto rounded-lg shadow-2xl border border-zinc-700"
                    unoptimized
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 5: Score & Share */}
          <div>
            <div className="grid lg:grid-cols-2">
              <div className="flex flex-col p-8 lg:p-12 border-r border-zinc-800">
                <p className="mb-2 font-mono text-xs font-medium text-emerald-400">STEP 05</p>
                <h3 className="mb-4 text-3xl font-bold tracking-tight">Score & Share</h3>
                <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                  Get your final scorecard with detailed feedback on each step. Share your solution
                  via URL or continue practicing to improve your score. Bonus points are available
                  for going beyond the basics.
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
                    Detailed scorecard for each step
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
                    Bonus points for advanced features
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
                    Share your solution via URL
                  </li>
                </ul>
              </div>
              <div className="bg-zinc-800/40 flex items-center justify-center p-8 lg:p-12 min-h-[400px]">
                <div className="w-full max-w-md">
                  <Card className="bg-zinc-900/50 border-emerald-500/50">
                    <CardHeader>
                      <CardTitle className="text-2xl flex items-center justify-between">
                        Final Score
                        <span className="text-emerald-400">112%</span>
                      </CardTitle>
                      <CardDescription className="text-zinc-400">
                        You exceeded expectations!
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-700">
                          <span className="text-zinc-400">Functional Requirements</span>
                          <span className="text-emerald-400 font-mono">100%</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-700">
                          <span className="text-zinc-400">Non-Functional Requirements</span>
                          <span className="text-emerald-400 font-mono">100%</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-700">
                          <span className="text-zinc-400">API Design</span>
                          <span className="text-emerald-400 font-mono">100%</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-700">
                          <span className="text-zinc-400">High Level Design</span>
                          <span className="text-emerald-400 font-mono">100%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-blue-400">Bonus Points</span>
                          <span className="text-blue-400 font-mono">+12%</span>
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

      {/* Post How It Works CTA */}
      <section className="relative border-b border-zinc-800 overflow-hidden">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.14), transparent 36%), radial-gradient(circle at 80% 80%, rgba(16,185,129,0.14), transparent 42%)",
          }}
          aria-hidden="true"
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12 relative">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Button
                asChild
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-6 shadow-lg hover:shadow-emerald-500/50 transition-all"
              >
                <Link
                  prefetch={false}
                  href="/practice/url-shortener"
                  onClick={() => track("cta_after_how_it_works_start_practicing_clicked")}
                >
                  Start practicing
                </Link>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-zinc-600 text-emerald-300 hover:text-white hover:border-emerald-400 px-6 py-6"
              >
                <Link
                  prefetch={false}
                  href="/practice"
                  onClick={() => track("cta_after_how_it_works_see_all_scenarios_clicked")}
                >
                  See all scenarios
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Popular Scenarios Section - Internal Linking */}
      <section id="scenarios" className="border-b border-zinc-800 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden="true"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 relative">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Practice Scenarios</h2>
            <p className="text-lg text-zinc-400 max-w-3xl mx-auto">
              Master the basics with URL Shorteners and Rate Limiters, then tackle complex scenarios
              like WhatsApp, Leaderboards, and Payment Systems.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1: Available Practice Problems */}
            <Link
              prefetch={false}
              href="/practice"
              onClick={() => track("homepage_scenario_practice_clicked")}
            >
              <Card className="bg-zinc-800/40 border-zinc-700 hover:border-emerald-500/50 transition-all cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-xl">Available Now</CardTitle>
                  <CardDescription>
                    5 guided practice scenarios with interactive canvas environments to validate
                    your designs.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-zinc-400">
                    <p>1. URL Shortener - Hashing & Encoding</p>
                    <p>2. Pastebin - Object Storage & TTL</p>
                    <p>3. Rate Limiter - Sliding Window & Token Bucket</p>
                    <p>4. Notification System - Message Queues & Fan-out</p>
                    <p>5. WhatsApp - WebSockets & Presence</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Card 2: Upcoming Scenarios */}
            <Card className="bg-zinc-800/40 border-zinc-700 h-full">
              <CardHeader>
                <CardTitle className="text-xl">Upcoming Scenarios</CardTitle>
                <CardDescription>
                  New problems added regularly. Each one teaches a different distributed systems
                  concept.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-zinc-400">
                  <p>6. Leaderboard - Redis Sorted Sets & Skip Lists</p>
                  <p>7. Ticketmaster - Optimistic vs. Pessimistic Locking</p>
                  <p>8. Job Scheduler - How Cron Works at Scale</p>
                  <p>9. Payment System - Double-Entry Accounting in SQL</p>
                  <p>10. Dropbox - Merkle Trees & Block Level Sync</p>
                  <p>11. Web Crawler - Bloom Filters & DNS Caching</p>
                  <p>12. YouTube - How CDNs & Adaptive Streaming Work</p>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: System Design Playbook */}
            <Link
              href="/learn/introduction"
              onClick={() => track("homepage_scenario_playbook_clicked")}
            >
              <Card className="bg-zinc-800/40 border-zinc-700 hover:border-blue-500/50 transition-all cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-xl">System Design Playbook</CardTitle>
                  <CardDescription>
                    Read the theory first. 10 articles covering databases, caching, scaling, and
                    architecture patterns.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-zinc-400">
                    <p>• Throughput calculations & database sizing</p>
                    <p>• CAP theorem, scaling, object storage & CDN</p>
                    <p>• Rate limiting algorithms, message queues</p>
                    <p>• WebSockets & real-time communication</p>
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
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-zinc-400">
              Everything you need to know about system design interview preparation
            </p>
          </div>

          <div className="space-y-6">
            <details className="bg-zinc-800/40 border border-zinc-700 rounded-lg p-6 group">
              <summary className="cursor-pointer text-xl font-semibold text-white list-none flex items-center justify-between">
                How do I prepare for a system design interview?
                <svg
                  className="w-5 h-5 text-emerald-400 transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <p className="mt-4 text-zinc-400 leading-relaxed">
                Start by practicing with interactive scenarios like our URL shortener tutorial.
                Focus on understanding distributed systems, scalability patterns, and architecture
                trade-offs. Practice designing systems end-to-end, from requirements gathering to
                capacity planning. Our platform provides instant feedback on your designs to
                accelerate learning.
              </p>
            </details>

            <details className="bg-zinc-800/40 border border-zinc-700 rounded-lg p-6 group">
              <summary className="cursor-pointer text-xl font-semibold text-white list-none flex items-center justify-between">
                What is system design and why is it important?
                <svg
                  className="w-5 h-5 text-emerald-400 transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <p className="mt-4 text-zinc-400 leading-relaxed">
                System design is the process of defining the architecture, components, and data flow
                of large-scale software systems. It&apos;s crucial for building scalable, reliable
                applications and is a key evaluation criterion in senior engineering interviews at
                top tech companies.
              </p>
            </details>

            <details className="bg-zinc-800/40 border border-zinc-700 rounded-lg p-6 group">
              <summary className="cursor-pointer text-xl font-semibold text-white list-none flex items-center justify-between">
                What are the most common system design interview questions?
                <svg
                  className="w-5 h-5 text-emerald-400 transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <p className="mt-4 text-zinc-400 leading-relaxed">
                Common questions include designing URL shorteners, social media feeds
                (Twitter/Instagram), video streaming platforms (Netflix/YouTube), messaging systems
                (WhatsApp), ride-sharing apps (Uber), and e-commerce sites (Amazon). Each teaches
                different scalability and architecture patterns.
              </p>
            </details>

            <details className="bg-zinc-800/40 border border-zinc-700 rounded-lg p-6 group">
              <summary className="cursor-pointer text-xl font-semibold text-white list-none flex items-center justify-between">
                How long does it take to learn system design?
                <svg
                  className="w-5 h-5 text-emerald-400 transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <p className="mt-4 text-zinc-400 leading-relaxed">
                With focused practice, you can learn core system design concepts in 4-8 weeks. Our
                interactive platform accelerates learning by providing hands-on practice with
                real-time feedback. Practice 3-4 scenarios per week to build strong fundamentals for
                your system design interview.
              </p>
            </details>

            <details className="bg-zinc-800/40 border border-zinc-700 rounded-lg p-6 group">
              <summary className="cursor-pointer text-xl font-semibold text-white list-none flex items-center justify-between">
                Is System Design Learner free to use?
                <svg
                  className="w-5 h-5 text-emerald-400 transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <p className="mt-4 text-zinc-400 leading-relaxed">
                Yes! System Design Learner is completely free. We provide interactive tutorials,
                practice scenarios, and instant feedback at no cost. Our mission is to make
                high-quality system design education accessible to everyone preparing for technical
                interviews.
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
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Ready to Ace Your System Design Interview?
            </h2>
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
                  prefetch={false}
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
                  prefetch={false}
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
