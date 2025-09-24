"use client";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-white mb-6">Documentation</h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400">
            Learn how to interpret results and master system design principles
          </p>
        </div>

        {/* Understanding Results */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-emerald-500 dark:text-emerald-400">Understanding Your Results</h2>

          <div className="space-y-8">
            <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4 text-emerald-600 dark:text-emerald-300">Capacity (RPS)</h3>
              <p className="text-zinc-600 dark:text-zinc-300 mb-4">
                The maximum requests per second your system can handle before becoming a bottleneck.
                This is determined by the slowest component in your architecture.
              </p>
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  <strong>💡 Tip:</strong> If you&apos;re below the required RPS, look for the
                  component with the lowest capacity in your path. Consider adding replicas,
                  caching, or optimization.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4 text-emerald-600 dark:text-emerald-300">Latency (P95)</h3>
              <p className="text-zinc-600 dark:text-zinc-300 mb-4">
                The 95th percentile response time. This means 95% of requests are faster than this
                value. P95 is more meaningful than averages for understanding user experience.
              </p>
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  <strong>💡 Tip:</strong> Network latency between components adds up quickly. Use
                  CDNs, edge computing, and regional replicas to reduce geographic latency.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4 text-emerald-600 dark:text-emerald-300">Outcome States</h3>
              <div className="grid md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold">✓</span>
                  </div>
                  <div className="text-emerald-600 dark:text-emerald-300 font-semibold">Pass</div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">Both metrics met</div>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold">~</span>
                  </div>
                  <div className="text-amber-600 dark:text-amber-300 font-semibold">Partial</div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">One metric met</div>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold">✗</span>
                  </div>
                  <div className="text-rose-600 dark:text-rose-300 font-semibold">Fail</div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">Neither met</div>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold">⚡</span>
                  </div>
                  <div className="text-red-600 dark:text-red-300 font-semibold">Chaos Fail</div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">Component crashed</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4 text-emerald-600 dark:text-emerald-300">Hints System</h3>
              <p className="text-zinc-600 dark:text-zinc-300 mb-4">
                After failing a scenario, you&apos;ll get progressive hints to guide your solution.
                The more you struggle with a scenario, the more specific the guidance becomes.
              </p>
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  <strong>💡 Tip:</strong> Don&apos;t rush to look at hints! The learning comes from
                  discovering solutions yourself. Use hints when you&apos;re truly stuck.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* System Design Resources */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-emerald-500 dark:text-emerald-400">Essential Reading</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-white">📚 Fundamentals</h3>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                <li>
                  <a
                    href="https://www.amazon.com/System-Design-Interview-Insiders-Guide/dp/1736049119"
                    className="text-emerald-600 dark:text-emerald-300 hover:text-emerald-500 dark:hover:text-emerald-200 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    System Design Interview (Alex Xu)
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/donnemartin/system-design-primer"
                    className="text-emerald-600 dark:text-emerald-300 hover:text-emerald-500 dark:hover:text-emerald-200 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    System Design Primer (GitHub)
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.amazon.ca/Designing-Data-Intensive-Applications-Reliable-Maintainable/dp/1449373321"
                    className="text-emerald-600 dark:text-emerald-300 hover:text-emerald-500 dark:hover:text-emerald-200 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Designing Data-Intensive Applications
                  </a>
                </li>
              </ul>
            </div>

            <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-white">🏗️ Architecture Patterns</h3>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                <li>
                  <a
                    href="https://microservices.io/patterns/"
                    className="text-emerald-600 dark:text-emerald-300 hover:text-emerald-500 dark:hover:text-emerald-200 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Microservices Patterns
                  </a>
                </li>
                <li>
                  <a
                    href="https://aws.amazon.com/architecture/well-architected/"
                    className="text-emerald-600 dark:text-emerald-300 hover:text-emerald-500 dark:hover:text-emerald-200 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    AWS Well-Architected Framework
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.nginx.com/blog/building-microservices-using-an-api-gateway/"
                    className="text-emerald-600 dark:text-emerald-300 hover:text-emerald-500 dark:hover:text-emerald-200 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    API Gateway Pattern
                  </a>
                </li>
              </ul>
            </div>

            <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-white">⚡ Performance & Scaling</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="https://www.scylladb.com/learn/dynamodb/introduction-to-dynamodb/"
                    className="text-emerald-600 dark:text-emerald-300 hover:text-emerald-500 dark:hover:text-emerald-200 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Amazon&apos;s DynamoDB Paper
                  </a>
                </li>
                <li>
                  <a
                    href="https://netflixtechblog.com/tagged/chaos-monkey"
                    className="text-emerald-600 dark:text-emerald-300 hover:text-emerald-500 dark:hover:text-emerald-200 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Netflix Chaos Engineering
                  </a>
                </li>
                <li>
                  <a
                    href="https://blog.bytebytego.com/p/how-facebook-served-billions-of-requests"
                    className="text-emerald-600 dark:text-emerald-300 hover:text-emerald-500 dark:hover:text-emerald-200 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Facebook&apos;s Memcached Scaling
                  </a>
                </li>
              </ul>
            </div>

            <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-white">🔧 Tools & Technologies</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="https://redis.io/documentation"
                    className="text-emerald-600 dark:text-emerald-300 hover:text-emerald-500 dark:hover:text-emerald-200 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Redis Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/"
                    className="text-emerald-600 dark:text-emerald-300 hover:text-emerald-500 dark:hover:text-emerald-200 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Nginx Load Balancing
                  </a>
                </li>
                <li>
                  <a
                    href="https://aws.amazon.com/s3/"
                    className="text-emerald-600 dark:text-emerald-300 hover:text-emerald-500 dark:hover:text-emerald-200 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Amazon S3 Object Storage
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Common Patterns */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-emerald-500 dark:text-emerald-400">Common Design Patterns</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-white">Cache-Aside Pattern</h3>
              <p className="text-zinc-600 dark:text-zinc-300 mb-3">
                Application checks cache first, then database if miss. Updates cache on writes.
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                <strong>Use when:</strong> Read-heavy workloads, acceptable stale data, fast
                database queries
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-white">Circuit Breaker</h3>
              <p className="text-zinc-600 dark:text-zinc-300 mb-3">
                Stop calling failing services to prevent cascade failures. Automatically retry when
                healthy.
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                <strong>Use when:</strong> External service dependencies, network failures, timeout
                handling
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-white">Database Sharding</h3>
              <p className="text-zinc-600 dark:text-zinc-300 mb-3">
                Split database across multiple servers using consistent hashing or range-based
                partitioning.
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                <strong>Use when:</strong> High write throughput, large datasets, horizontal scaling
                needed
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-white">Event Sourcing</h3>
              <p className="text-zinc-600 dark:text-zinc-300 mb-3">
                Store all state changes as events. Rebuild state by replaying events.
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                <strong>Use when:</strong> Audit trails needed, temporal queries, complex business
                logic
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/play"
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-semibold text-lg transition-colors"
          >
            Start Practicing Now
          </Link>
        </div>
      </div>
    </div>
  );
}
