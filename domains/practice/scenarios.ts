// Extended Scenario schema for Content & Taxonomy (Workstream A)
export type Difficulty = "easy" | "medium" | "hard";
export type Category =
  | "Caching"
  | "Messaging"
  | "Search"
  | "Streaming"
  | "Realtime"
  | "Storage"
  | "Payments"
  | "Batch"
  | "Rate Limiting"
  | "Other";

export type Prerequisite = {
  title: string;
  href: string;
};

export type Scenario = {
  id: string;
  title: string;
  description: string;
  /** Brief description for card/list views */
  briefDescription?: string;
  category: Category;
  difficulty: Difficulty;
  estimatedTime?: string;
  prerequisites?: Prerequisite[];
  /** Whether this scenario has a practice mode implementation */
  hasPractice?: boolean;
  /** Slug for the /learn article about this scenario (if one exists) */
  learnArticleSlug?: string;
};

export const SCENARIOS: Scenario[] = [
  {
    id: "spotify-play",
    title: "Spotify: Play a Track",
    description:
      "Serve a playback request within 200ms P95. Use CDN/cache; DB must not be on hot path.",
    category: "Streaming",
    difficulty: "hard",
  },
  {
    id: "spotify-search",
    title: "Spotify: Search Catalog",
    description: "Handle search bursts quickly. Cache and minimize DB lookups.",
    category: "Search",
    difficulty: "medium",
  },
  {
    id: "url-shortener",
    title: "URL Shortener",
    description:
      "Design a scalable URL shortening service that converts long URLs into short, shareable links. The system should support a large number of users using the redirect service. Consider storage design, ensuring uniqueness, fault tolerance, and high-performance operation at large scale. Extra points for considering custom aliases, link expiration, and analytics.",
    briefDescription: "Design a scalable URL shortening service like bit.ly or TinyURL",
    category: "Caching",
    difficulty: "easy",
    estimatedTime: "15-20 minutes",
    prerequisites: [
      {
        title: "Databases & Caching",
        href: "/learn/database-caching",
      },
      {
        title: "Scaling: Vertical vs Horizontal",
        href: "/learn/scaling",
      },
      {
        title: "How to Calculate Throughput & Database Size",
        href: "/learn/size-calculation",
      },
    ],
    hasPractice: true,
    learnArticleSlug: "tinyurl",
  },
  {
    id: "rate-limiter",
    title: "Rate Limiter",
    description: "Enforce 100 req/min per user without introducing high latency.",
    category: "Rate Limiting",
    difficulty: "easy",
  },
  {
    id: "cdn-design",
    title: "CDN Design",
    description: "Serve static assets globally with P95 < 80ms at 8k RPS.",
    category: "Streaming",
    difficulty: "easy",
  },
  {
    id: "webhook-delivery",
    title: "Webhook Delivery",
    description: "Reliable async callbacks with retries and DLQ.",
    category: "Messaging",
    difficulty: "medium",
  },
  {
    id: "typeahead",
    title: "Typeahead Search",
    description: "Autocomplete results < 100ms P95.",
    category: "Search",
    difficulty: "medium",
  },
  {
    id: "leaderboard",
    title: "Leaderboard",
    description: "Top-N reads low latency; frequent score updates.",
    category: "Realtime",
    difficulty: "easy",
  },
  {
    id: "pastebin",
    title: "Pastebin",
    description: "Create/view text pastes; serve in <150ms P95.",
    briefDescription:
      "Design a text paste sharing service for creating, storing, and sharing text snippets",
    category: "Storage",
    difficulty: "easy",
    estimatedTime: "15-20 minutes",
    hasPractice: true,
  },
];
