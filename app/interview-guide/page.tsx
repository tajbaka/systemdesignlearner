import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Clock, Target } from "lucide-react";

export const metadata: Metadata = {
  title: "System Design Interview Guide - Complete Preparation Roadmap 2025",
  description:
    "Master system design interviews with our complete guide. Learn the framework, common questions, mistakes to avoid, and 8-week preparation timeline. Free resources and practice problems included.",
  keywords: [
    "system design interview guide",
    "system design interview preparation",
    "how to prepare system design interview",
    "system design interview tips",
    "system design interview questions",
    "system design interview framework",
    "system design interview roadmap",
  ],
  openGraph: {
    title: "System Design Interview Guide - Complete Preparation Roadmap",
    description:
      "Everything you need to ace system design interviews: framework, timeline, common questions, and practice resources.",
    type: "website",
  },
};

export default function InterviewGuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/15 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-blue-200 mb-6">
            Interview Preparation
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
            System Design Interview Guide
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-zinc-300">
            Your complete roadmap to mastering system design interviews at top tech companies
          </p>
        </div>

        {/* The Framework */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-emerald-400">
            The 5-Step Framework
          </h2>
          <p className="text-zinc-300 mb-8">
            Follow this proven framework to structure your system design interview answers. This is
            the same approach used in our interactive practice scenarios:
          </p>

          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Functional Requirements",
                desc: "Clarify what the system should do. List core features, user actions, and use cases. Ask about scope and priorities.",
              },
              {
                step: "2",
                title: "Non-Functional Requirements",
                desc: "Define scale, performance, and reliability constraints. Calculate traffic (RPS), storage, latency (P95), and availability targets.",
              },
              {
                step: "3",
                title: "API Design",
                desc: "Design clean REST/GraphQL APIs for core features. Define request/response formats, endpoints, and data contracts.",
              },
              {
                step: "4",
                title: "High-Level Design",
                desc: "Draw the overall architecture: clients, load balancers, services, databases, caches, and message queues. Show data flow and component interactions.",
              },
              {
                step: "5",
                title: "Low-Level Design",
                desc: "Deep dive into critical components: database schema, caching strategies, algorithms, and data structures. Discuss trade-offs, bottlenecks, and optimizations.",
              },
            ].map((item, index) => (
              <Card key={index} className="bg-zinc-900/70 border-zinc-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                      {item.step}
                    </span>
                    <span className="text-white">{item.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-zinc-400">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-emerald-400 flex items-center gap-2">
            <Clock className="w-8 h-8" />
            8-Week Preparation Timeline
          </h2>

          <div className="space-y-4">
            {[
              {
                weeks: "Weeks 1-2",
                title: "Fundamentals",
                tasks: [
                  "Learn basic architecture patterns",
                  "Study CAP theorem, consistency models",
                  "Understand load balancers, caches, databases",
                  "Practice 2-3 simple designs (URL shortener, pastebin)",
                ],
              },
              {
                weeks: "Weeks 3-4",
                title: "Intermediate Concepts",
                tasks: [
                  "Deep dive into distributed systems",
                  "Study sharding, replication, partitioning",
                  "Learn about message queues and pub-sub",
                  "Practice 3-4 medium problems (Twitter, Instagram)",
                ],
              },
              {
                weeks: "Weeks 5-6",
                title: "Advanced Topics",
                tasks: [
                  "Master rate limiting, API gateways",
                  "Study CDNs, microservices, event sourcing",
                  "Learn monitoring and observability",
                  "Practice 4-5 complex designs (Netflix, Uber)",
                ],
              },
              {
                weeks: "Weeks 7-8",
                title: "Mock Interviews",
                tasks: [
                  "Do 5-7 mock interviews with peers",
                  "Review real interview questions from Glassdoor",
                  "Practice whiteboarding and communication",
                  "Fine-tune your presentation skills",
                ],
              },
            ].map((phase, index) => (
              <Card key={index} className="bg-zinc-900/70 border-zinc-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-400" />
                    {phase.weeks}: {phase.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {phase.tasks.map((task, i) => (
                      <li key={i} className="flex items-start gap-2 text-zinc-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Common Questions */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-emerald-400">
            Most Common Interview Questions
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "Design a URL shortener (bit.ly)",
              "Design Twitter feed / timeline",
              "Design Instagram photo sharing",
              "Design YouTube / Netflix streaming",
              "Design WhatsApp / messaging system",
              "Design Uber / ride-sharing",
              "Design web crawler / search engine",
              "Design rate limiter",
              "Design notification system",
              "Design news feed ranking",
              "Design autocomplete / typeahead",
              "Design e-commerce product catalog",
            ].map((question, index) => (
              <Card key={index} className="bg-zinc-900/70 border-zinc-700">
                <CardContent className="p-4">
                  <p className="text-zinc-300 text-sm">{question}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Common Mistakes */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-emerald-400 flex items-center gap-2">
            <AlertCircle className="w-8 h-8" />
            Mistakes to Avoid
          </h2>

          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
            <ul className="space-y-3">
              {[
                "Jumping straight into design without clarifying requirements",
                "Ignoring scale and performance constraints",
                "Over-engineering the solution with unnecessary complexity",
                "Not considering trade-offs between different approaches",
                "Forgetting to discuss failure scenarios and monitoring",
                "Poor communication and not thinking out loud",
                "Not asking questions or validating assumptions",
                "Spending too much time on one component",
              ].map((mistake, index) => (
                <li key={index} className="flex items-start gap-2 text-red-200">
                  <span className="text-red-400 font-bold mt-0.5">✗</span>
                  <span>{mistake}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Tips for Success */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-emerald-400">Tips for Success</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                title: "Think Out Loud",
                tip: "Verbalize your thought process. Interviewers want to see how you think, not just the final answer.",
              },
              {
                title: "Ask Questions",
                tip: "Clarify ambiguities early. It shows you understand real-world constraints and requirements.",
              },
              {
                title: "Start Simple",
                tip: "Begin with a basic design, then iterate. Don't try to solve everything at once.",
              },
              {
                title: "Use Numbers",
                tip: "Back your decisions with calculations. Show math for capacity, latency, and storage.",
              },
              {
                title: "Draw Diagrams",
                tip: "Visual representations are crucial. Practice drawing clean architecture diagrams.",
              },
              {
                title: "Discuss Trade-offs",
                tip: "Every design choice has pros and cons. Explain why you chose one approach over another.",
              },
            ].map((item, index) => (
              <Card key={index} className="bg-zinc-900/70 border-zinc-700">
                <CardHeader>
                  <CardTitle className="text-emerald-300 text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-zinc-400 text-sm">{item.tip}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to Start Practicing?
          </h2>
          <p className="text-lg text-zinc-300 mb-8 max-w-2xl mx-auto">
            Apply this framework with our interactive practice scenarios. Get instant feedback and
            learn by doing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="px-8 py-6 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-lg"
            >
              <Link href="/practice">Start Practice Problems</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="px-8 py-6 border-2 border-zinc-600 hover:border-blue-500/50 text-zinc-300 hover:text-white font-semibold text-lg"
            >
              <Link href="/play">Try the Sandbox</Link>
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
