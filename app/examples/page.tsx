import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "System Design Examples - Real-World Architecture Patterns 2025",
  description:
    "Learn from 10+ real-world system design examples: URL shortener, Twitter feed, Instagram, Netflix streaming, Uber matching, Amazon catalog. Complete architecture diagrams and explanations.",
  keywords: [
    "system design examples",
    "system design case studies",
    "real world system design",
    "architecture examples",
    "distributed systems examples",
    "scalability examples",
    "twitter system design",
    "instagram system design",
    "netflix system design",
    "uber system design",
  ],
  openGraph: {
    title: "Real-World System Design Examples - Complete Architecture Guide",
    description:
      "Master system design with 10+ real-world examples. Learn from Twitter, Instagram, Netflix, and more.",
    type: "website",
  },
};

const EXAMPLES = [
  {
    title: "URL Shortener",
    description: "Design a scalable URL shortening service like bit.ly or TinyURL",
    difficulty: "Beginner",
    keyTopics: ["Hashing algorithms", "Database design", "Caching", "Scalability"],
    learnings: "Learn base62 encoding, distributed ID generation, and cache-aside patterns",
    href: "/practice/url-shortener/intro",
  },
  {
    title: "Twitter Feed",
    description: "Design a social media timeline that handles millions of users",
    difficulty: "Intermediate",
    keyTopics: ["Fan-out architecture", "Feed generation", "Caching", "Real-time updates"],
    learnings: "Push vs pull models, Redis for timeline caching, and handling celebrity users",
    href: "#",
  },
  {
    title: "Instagram Photo Sharing",
    description: "Build a photo sharing platform with upload, storage, and feed",
    difficulty: "Intermediate",
    keyTopics: ["CDN", "Object storage", "Image processing", "Feed ranking"],
    learnings: "S3 for storage, CloudFront CDN, image optimization, and ML ranking",
    href: "#",
  },
  {
    title: "Netflix Video Streaming",
    description: "Design a video streaming service that serves millions globally",
    difficulty: "Advanced",
    keyTopics: ["Adaptive bitrate", "CDN strategy", "Content delivery", "DRM"],
    learnings: "HLS/DASH protocols, edge caching, regional replication, bandwidth optimization",
    href: "#",
  },
  {
    title: "Uber Ride Matching",
    description: "Real-time ride matching system with geo-location",
    difficulty: "Advanced",
    keyTopics: ["Geo-hashing", "WebSockets", "Real-time matching", "Surge pricing"],
    learnings: "QuadTrees for location, WebSocket connections, pub-sub for real-time updates",
    href: "#",
  },
  {
    title: "WhatsApp Messaging",
    description: "End-to-end encrypted messaging system at scale",
    difficulty: "Advanced",
    keyTopics: ["Message queues", "Encryption", "Presence system", "Group chats"],
    learnings: "Kafka for message delivery, Signal protocol, last-seen tracking",
    href: "#",
  },
  {
    title: "Amazon Product Catalog",
    description: "E-commerce catalog with search, filtering, and inventory",
    difficulty: "Intermediate",
    keyTopics: ["Search indexing", "Inventory management", "Caching", "Sharding"],
    learnings: "Elasticsearch for search, Redis for inventory, database sharding strategies",
    href: "#",
  },
  {
    title: "YouTube Video Upload",
    description: "Handle video uploads, transcoding, and storage",
    difficulty: "Advanced",
    keyTopics: ["Upload optimization", "Video transcoding", "CDN", "Storage"],
    learnings: "Chunked uploads, FFmpeg transcoding pipeline, S3 + CloudFront architecture",
    href: "#",
  },
  {
    title: "Slack Messaging Platform",
    description: "Team communication with channels, threads, and search",
    difficulty: "Intermediate",
    keyTopics: ["WebSockets", "Message persistence", "Search", "Notifications"],
    learnings: "Real-time messaging, Elasticsearch for search, push notifications",
    href: "#",
  },
  {
    title: "Dropbox File Sync",
    description: "File synchronization across devices with conflict resolution",
    difficulty: "Advanced",
    keyTopics: ["Chunking", "Delta sync", "Conflict resolution", "Versioning"],
    learnings: "Block-level deduplication, Merkle trees, CRDT for conflict resolution",
    href: "#",
  },
];

export default function ExamplesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-emerald-200 mb-6">
            Real-World Examples
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
            System Design Examples
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-zinc-300 max-w-3xl mx-auto">
            Learn from real-world architecture patterns used by top tech companies. Each example
            covers key concepts, trade-offs, and scalability considerations.
          </p>
        </div>

        {/* Examples Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {EXAMPLES.map((example, index) => (
            <Card
              key={index}
              className="bg-zinc-900/70 border-zinc-700 hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-500/10"
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-xl text-white">{example.title}</CardTitle>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      example.difficulty === "Beginner"
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : example.difficulty === "Intermediate"
                          ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                          : "bg-red-500/20 text-red-400 border border-red-500/30"
                    }`}
                  >
                    {example.difficulty}
                  </span>
                </div>
                <CardDescription className="text-zinc-400">{example.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-300 mb-2">Key Topics:</h4>
                    <div className="flex flex-wrap gap-2">
                      {example.keyTopics.map((topic, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 bg-zinc-800 text-zinc-300 rounded border border-zinc-700"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-zinc-300 mb-2">
                      What You&apos;ll Learn:
                    </h4>
                    <p className="text-xs text-zinc-400">{example.learnings}</p>
                  </div>

                  {example.href === "#" ? (
                    <div className="pt-2">
                      <span className="text-sm text-zinc-500 italic">Coming soon...</span>
                    </div>
                  ) : (
                    <Button
                      asChild
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      <Link style={{ cursor: "pointer" }} href={example.href}>
                        Start Practice
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Ready to Practice?</h2>
          <p className="text-lg text-zinc-300 mb-8 max-w-2xl mx-auto">
            Start with our interactive URL Shortener tutorial and work your way through real-world
            system design challenges.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="px-8 py-6 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-lg"
            >
              <Link href="/practice/url-shortener/intro">Start with URL Shortener</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="px-8 py-6 border-2 border-zinc-600 hover:border-emerald-500/50 text-zinc-300 hover:text-white font-semibold text-lg"
            >
              <Link href="/practice">View All Practice Problems</Link>
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
