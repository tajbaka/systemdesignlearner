"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";

const PROBLEMS = [
  {
    slug: "url-shortener",
    name: "URL Shortener",
    difficulty: "Easy",
    topic: "Storage & Caching",
    description: "Design a scalable URL shortening service like bit.ly or TinyURL",
    estimatedTime: "15-20 min",
    keyTopics: ["Hashing algorithms", "Database design", "Caching", "Scalability"],
    learnings: "Learn base62 encoding, distributed ID generation, and cache-aside patterns",
    available: true,
  },
  {
    slug: "pastebin",
    name: "Pastebin",
    difficulty: "Easy",
    topic: "Storage & CDN",
    description: "Design a text paste sharing service for creating, storing, and sharing text snippets",
    estimatedTime: "15-20 min",
    keyTopics: ["Object storage", "CDN caching", "Unique ID generation", "TTL expiration"],
    learnings: "Learn blob storage patterns, CDN for static content, and metadata vs content separation",
    available: true,
  },
  {
    slug: "twitter-feed",
    name: "Twitter Feed",
    difficulty: "Medium",
    topic: "Fan-out & Real-time",
    description: "Design a social media timeline that handles millions of users",
    estimatedTime: "25-30 min",
    keyTopics: ["Fan-out architecture", "Feed generation", "Caching", "Real-time updates"],
    learnings: "Push vs pull models, Redis for timeline caching, and handling celebrity users",
    available: false,
  },
  {
    slug: "instagram-photo",
    name: "Instagram Photo Sharing",
    difficulty: "Medium",
    topic: "CDN & Storage",
    description: "Build a photo sharing platform with upload, storage, and feed",
    estimatedTime: "25-30 min",
    keyTopics: ["CDN", "Object storage", "Image processing", "Feed ranking"],
    learnings: "S3 for storage, CloudFront CDN, image optimization, and ML ranking",
    available: false,
  },
  {
    slug: "netflix-streaming",
    name: "Netflix Video Streaming",
    difficulty: "Hard",
    topic: "Content Delivery",
    description: "Design a video streaming service that serves millions globally",
    estimatedTime: "35-45 min",
    keyTopics: ["Adaptive bitrate", "CDN strategy", "Content delivery", "DRM"],
    learnings: "HLS/DASH protocols, edge caching, regional replication, bandwidth optimization",
    available: false,
  },
  {
    slug: "uber-matching",
    name: "Uber Ride Matching",
    difficulty: "Hard",
    topic: "Geo-location",
    description: "Real-time ride matching system with geo-location",
    estimatedTime: "35-45 min",
    keyTopics: ["Geo-hashing", "WebSockets", "Real-time matching", "Surge pricing"],
    learnings: "QuadTrees for location, WebSocket connections, pub-sub for real-time updates",
    available: false,
  },
  {
    slug: "whatsapp-messaging",
    name: "WhatsApp Messaging",
    difficulty: "Hard",
    topic: "Messaging & Encryption",
    description: "End-to-end encrypted messaging system at scale",
    estimatedTime: "35-45 min",
    keyTopics: ["Message queues", "Encryption", "Presence system", "Group chats"],
    learnings: "Kafka for message delivery, Signal protocol, last-seen tracking",
    available: false,
  },
  {
    slug: "amazon-catalog",
    name: "Amazon Product Catalog",
    difficulty: "Medium",
    topic: "Search & Inventory",
    description: "E-commerce catalog with search, filtering, and inventory",
    estimatedTime: "25-30 min",
    keyTopics: ["Search indexing", "Inventory management", "Caching", "Sharding"],
    learnings: "Elasticsearch for search, Redis for inventory, database sharding strategies",
    available: false,
  },
  {
    slug: "youtube-upload",
    name: "YouTube Video Upload",
    difficulty: "Hard",
    topic: "Video Processing",
    description: "Handle video uploads, transcoding, and storage",
    estimatedTime: "35-45 min",
    keyTopics: ["Upload optimization", "Video transcoding", "CDN", "Storage"],
    learnings: "Chunked uploads, FFmpeg transcoding pipeline, S3 + CloudFront architecture",
    available: false,
  },
  {
    slug: "slack-messaging",
    name: "Slack Messaging Platform",
    difficulty: "Medium",
    topic: "Real-time & Search",
    description: "Team communication with channels, threads, and search",
    estimatedTime: "25-30 min",
    keyTopics: ["WebSockets", "Message persistence", "Search", "Notifications"],
    learnings: "Real-time messaging, Elasticsearch for search, push notifications",
    available: false,
  },
  {
    slug: "dropbox-sync",
    name: "Dropbox File Sync",
    difficulty: "Hard",
    topic: "File Sync & Versioning",
    description: "File synchronization across devices with conflict resolution",
    estimatedTime: "35-45 min",
    keyTopics: ["Chunking", "Delta sync", "Conflict resolution", "Versioning"],
    learnings: "Block-level deduplication, Merkle trees, CRDT for conflict resolution",
    available: false,
  },
];

export function PracticePageClient() {
  const [completedProblems, setCompletedProblems] = useState<Set<string>>(new Set());

  const checkCompletionStatus = () => {
    const completed = new Set<string>();
    PROBLEMS.forEach((problem) => {
      const storageKey = `sds-practice-${problem.slug}`;
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const data = JSON.parse(stored);
          // Check if the score step is completed (using 'completed' not 'progress')
          if (data.completed?.score === true) {
            completed.add(problem.slug);
          }
        }
      } catch (_e) {
        // Ignore parsing errors
      }
    });
    setCompletedProblems(completed);
  };

  useEffect(() => {
    // Initial check
    checkCompletionStatus();

    // Listen for storage changes and focus events (when returning to the page)
    window.addEventListener("storage", checkCompletionStatus);
    window.addEventListener("focus", checkCompletionStatus);

    return () => {
      window.removeEventListener("storage", checkCompletionStatus);
      window.removeEventListener("focus", checkCompletionStatus);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <Navbar />
      <main className="mx-auto flex w-full max-w-screen-xl flex-col gap-8 px-4 py-8 sm:px-6 md:gap-10 md:py-12 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <header className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
              Guided tracks
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                System design practice
              </h1>
              <p className="mt-2 text-sm text-zinc-300 sm:text-base sm:leading-relaxed">
                Tackle curated drills with a friendly walkthrough, then jump straight into the
                sandbox to validate your architecture.
              </p>
            </div>
          </header>
          <Card className="w-full max-w-md md:max-w-xs bg-zinc-900/70 border-zinc-800">
            <CardHeader className="space-y-2 pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                id="practice-search"
                type="search"
                disabled
                className="h-11 w-full border-dashed border-zinc-700 bg-zinc-900 text-zinc-500 min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-500"
                placeholder="Filter problems"
              />
              <p className="text-xs text-zinc-500">
                Looking for something specific? Drop a request on{" "}
                <Link href="/feedback" className="text-blue-200 underline-offset-2 hover:underline">
                  feedback
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Problems Grid */}
        <div className="grid gap-4 sm:gap-6">
          {PROBLEMS.map((problem) => {
            const isCompleted = completedProblems.has(problem.slug);
            const isAvailable = problem.available;
            return (
              <Card
                key={problem.slug}
                className={`bg-zinc-900 transition-all duration-300 hover:shadow-lg ${
                  !isAvailable
                    ? "border-zinc-700/50 opacity-75"
                    : isCompleted
                      ? "border-green-500/50 hover:border-green-500/70 hover:shadow-green-500/10"
                      : "border-zinc-700 hover:border-zinc-600 hover:shadow-blue-500/10"
                }`}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    {/* Problem Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-lg sm:text-xl text-white">
                            {problem.name}
                          </CardTitle>
                          {isCompleted && isAvailable && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                              <Check className="h-3 w-3 text-green-400" />
                              <span className="text-xs font-medium text-green-400">Completed</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              problem.difficulty === "Easy"
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : problem.difficulty === "Medium"
                                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                  : "bg-red-500/20 text-red-400 border border-red-500/30"
                            }`}
                          >
                            {problem.difficulty}
                          </span>
                        </div>
                      </div>

                      <CardDescription className="text-sm text-zinc-400 mb-3 leading-relaxed">
                        {problem.description}
                      </CardDescription>

                      {/* Key Topics */}
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-2">
                          {problem.keyTopics.map((topic, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-1 bg-zinc-800 text-zinc-300 rounded border border-zinc-700"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* What You'll Learn */}
                      <p className="text-xs text-zinc-400 mb-3">{problem.learnings}</p>

                      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-500">Topic:</span>
                          <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-200">
                            {problem.topic}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-500">Time:</span>
                          <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-200">
                            {problem.estimatedTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex-shrink-0 w-full sm:w-auto">
                      {isAvailable ? (
                        <Button
                          asChild
                          size="lg"
                          className={`h-12 w-full font-semibold transition-all duration-300 min-h-[44px] touch-manipulation sm:w-auto ${
                            isCompleted
                              ? "bg-green-600 hover:bg-green-500 text-white"
                              : "bg-blue-600 hover:bg-blue-500 text-white"
                          }`}
                        >
                          <Link
                            href={
                              isCompleted
                                ? `/practice/${problem.slug}`
                                : `/practice/${problem.slug}/intro`
                            }
                            onClick={() =>
                              track("practice_problem_selected", {
                                slug: problem.slug,
                                difficulty: problem.difficulty,
                                topic: problem.topic,
                                completed: isCompleted,
                              })
                            }
                          >
                            {isCompleted ? "View Results" : "Start Practice"}
                          </Link>
                        </Button>
                      ) : (
                        <span className="text-sm text-zinc-500 italic">Coming soon...</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
