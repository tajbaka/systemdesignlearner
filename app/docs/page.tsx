import type { Metadata } from "next";
import { DocsPageClient } from "./DocsPageClient";

export const metadata: Metadata = {
  title: "System Design Tutorial & Documentation - Complete Guide 2025",
  description:
    "Master system design fundamentals: capacity planning (RPS), latency optimization (P95), caching patterns, and architecture best practices. Complete guide with interactive examples for interview preparation.",
  keywords: [
    "system design tutorial",
    "system design guide",
    "system design documentation",
    "architecture patterns",
    "scalability tutorial",
    "distributed systems guide",
    "caching patterns",
    "system design best practices",
  ],
  openGraph: {
    title: "System Design Tutorial & Documentation - Complete Guide",
    description:
      "Learn capacity planning, latency optimization, caching strategies, and common architecture patterns. Essential guide for system design mastery.",
    type: "website",
  },
};

export default function DocsPage() {
  return <DocsPageClient />;
}
