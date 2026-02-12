import { buildLinks } from "./article-links";

export const LEADERBOARD_PROBLEM = {
  slug: "leaderboard",
  category: "backend" as const,
  version: {
    versionNumber: 1,
    title: "Real-time Leaderboard",
    description:
      "Design a real-time leaderboard system for a massive multiplayer online game or competitive platform, capable of handling millions of players and frequent score updates.",
    difficulty: "medium" as const,
    timeToComplete: "45 min",
    topic: "System Design",
    links: buildLinks([
      "redis-sorted-sets",
      "data-structures",
      "sharding",
      "system-design-structure",
    ]),
    isCurrent: true,
  },
  steps: [
    {
      stepType: "functional" as const,
      order: 0,
      title: "Functional Requirements",
      description: "Define the core capabilities of the Leaderboard",
      required: true,
      data: {
        scoreWeight: 30,
        requirements: [
          {
            id: "update-score",
            label: "Score Updates",
            description:
              "Users should be able to submit new scores, which immediately affect their ranking.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Real-time score submission. Rank must update immediately upon submission.",
              },
            ],
            hints: [
              {
                id: "hint-realtime-write",
                title: "Write Frequency",
                text: "In a game, scores change constantly. We need a system that handles high write throughput.",
                href: "/learn/redis-sorted-sets",
              },
            ],
            evaluationCriteria:
              "User mentions a mechanism to ingest and update scores in real-time.",
            feedbackOnMissing:
              "If I win a match, I want to see my rank go up instantly. How do we handle that?",
          },
          {
            id: "get-top-k",
            label: "Global Top K Ranks",
            description: "Display the top players (e.g., Top 10 or Top 100) globally.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Efficient retrieval of the top N players sorted by score descending.",
              },
            ],
            hints: [
              {
                id: "hint-sorting",
                title: "Sorting Efficiency",
                text: "Sorting 10 million users in SQL on every request is too slow. We need a data structure that keeps things sorted.",
                href: "/learn/data-structures",
              },
            ],
            evaluationCriteria:
              "User identifies the need for an efficient 'Top K' query (O(log n) or better).",
            feedbackOnMissing:
              "The main feature of a leaderboard is seeing who is #1. How do we get that list quickly?",
          },
          {
            id: "get-user-rank",
            label: "User's Own Rank",
            description:
              "A user should be able to see their specific rank (e.g., 'You are #12,504') and the players immediately around them.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Retrieve specific rank of a user and the 'neighborhood' (e.g., users ranked +/- 5 positions).",
              },
            ],
            hints: [
              {
                id: "hint-relative-rank",
                title: "Relative Ranking",
                text: "It's motivating to see who is just ahead of you. We need to fetch a range based on rank index.",
                href: "/learn/redis-sorted-sets",
              },
            ],
            evaluationCriteria:
              "User mentions fetching the user's specific rank and surrounding context.",
            feedbackOnMissing: "I'm not in the top 10. How do I know where I stand?",
          },
        ],
      },
    },
    {
      stepType: "nonFunctional" as const,
      order: 1,
      title: "Non-Functional Requirements",
      description: "Define system quality attributes and constraints",
      required: true,
      data: {
        scoreWeight: 20,
        requirements: [
          {
            id: "low-latency-read",
            label: "Low Latency Reads",
            description:
              "Leaderboards are viewed frequently; read latency must be very low (<20ms).",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "In-memory data structures (Redis) are essential for sub-millisecond rank retrieval.",
              },
            ],
            hints: [
              {
                id: "hint-caching",
                title: "Memory vs Disk",
                text: "Disk-based sorting is too slow for real-time gaming. We need to store this in RAM.",
                href: "/learn/database-caching",
              },
            ],
            evaluationCriteria:
              "User specifies the use of in-memory caching (Redis) to achieve low latency.",
            feedbackOnMissing:
              "Gamers are impatient. If the leaderboard loads slowly, they won't check it.",
          },
          {
            id: "scalability-users",
            label: "Scalability (Millions of Users)",
            description:
              "Support millions of active players. A single Redis instance might not hold all data.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Sharding strategy required. Partition users by range or hash, though range partitioning complicates global ranking.",
              },
            ],
            hints: [
              {
                id: "hint-sharding",
                title: "Partitioning Data",
                text: "If we have 100 million users, that won't fit in one Redis instance. How do we split it up?",
                href: "/learn/sharding",
              },
            ],
            evaluationCriteria:
              "User discusses Sharding/Partitioning strategies (e.g., Fixed Range vs. Hash) to handle scale.",
            feedbackOnMissing:
              "We have too many players for one server. How do we distribute the load?",
          },
        ],
      },
    },
    {
      stepType: "api" as const,
      order: 2,
      title: "API Design",
      description: "Design the API Interface for score submission and reading",
      required: true,
      data: {
        scoreWeight: 20,
        requirements: [
          {
            id: "submit-score",
            scope: "endpoint",
            label: "Submit Score",
            description: "Endpoint for the game client or game server to report a new score.",
            weight: 10,
            required: true,
            method: "POST",
            correctPath: "/api/v1/scores",
            solutions: [
              {
                text: "POST /scores. Body: { userId: string, score: number }. Returns new rank.",
              },
            ],
            hints: [
              {
                id: "hint-score-payload",
                title: "Score Submission",
                text: "We need the User ID and the Score value. Simple.",
                href: "/learn/system-design-structure",
              },
            ],
            evaluationCriteria: "User defines a POST endpoint to update scores.",
            feedbackOnMissing: "How does the game tell the server that I just got 5000 points?",
          },
          {
            id: "get-leaderboard",
            scope: "endpoint",
            label: "Get Leaderboard",
            description: "Endpoint to fetch the global top list or a specific range.",
            weight: 10,
            required: true,
            method: "GET",
            correctPath: "/api/v1/leaderboard",
            solutions: [
              {
                text: "GET /leaderboard?type=global&limit=10 (Top 10) OR GET /leaderboard?userId={id} (User Rank).",
              },
            ],
            hints: [
              {
                id: "hint-query-params",
                title: "Flexible Queries",
                text: "One endpoint can serve both 'Top 10' and 'My Rank' using query parameters.",
                href: "/learn/system-design-structure",
              },
            ],
            evaluationCriteria:
              "User defines a GET endpoint that supports fetching top K and user-specific ranking.",
            feedbackOnMissing: "We need to be able to ask 'Who is winning?' and 'Where am I?'.",
          },
        ],
      },
    },
    {
      stepType: "highLevelDesign" as const,
      order: 3,
      title: "High-Level Design",
      description: "Design the architecture components and data flow",
      required: true,
      data: {
        scoreWeight: 30,
        requirements: [
          {
            nodes: [
              { id: "Game-Client", type: "Client" },
              { id: "LB", type: "LoadBalancer" },
              { id: "Score-Svc", type: "Service", label: "Score Service" },
              {
                id: "Redis-Cluster",
                type: "Cache",
                label: "Redis (Sorted Sets)",
              },
              { id: "DB-Persistent", type: "Database", label: "SQL/NoSQL DB" },
            ],
            edges: [
              {
                id: "Client-LB",
                from: "Game-Client",
                to: "LB",
                description:
                  "Game client sends score updates and reads leaderboard via Load Balancer.",
                weight: 5,
                hints: [
                  {
                    id: "hint-entry",
                    title: "Entry Point",
                    text: "Standard entry point for all web traffic.",
                    href: "/learn/scaling",
                  },
                ],
              },
              {
                id: "LB-Service",
                from: "LB",
                to: "Score-Svc",
                description: "Load Balancer routes requests to the stateless Score Service.",
                weight: 5,
                hints: [
                  {
                    id: "hint-stateless",
                    title: "Stateless Logic",
                    text: "The service just validates requests and talks to the data store.",
                    href: "/learn/microservices",
                  },
                ],
              },
              {
                id: "Service-Redis",
                from: "Score-Svc",
                to: "Redis-Cluster",
                description:
                  "Uses Redis Sorted Sets (ZSET). Operations: ZADD (update), ZRANGE (top k), ZRANK (user rank).",
                weight: 15,
                hints: [
                  {
                    id: "hint-zset",
                    title: "Redis Magic",
                    text: "This is the core of the design. Redis Sorted Sets (ZSET) handle ranking automatically in O(log n).",
                    href: "/learn/redis-sorted-sets",
                  },
                  {
                    id: "hint-skiplist",
                    title: "Underlying Structure",
                    text: "Redis uses a Skip List to make these operations fast. Mentioning this shows deep knowledge.",
                    href: "/learn/data-structures",
                  },
                ],
              },
              {
                id: "Service-DB",
                from: "Score-Svc",
                to: "DB-Persistent",
                description:
                  "Persist scores to a durable database (SQL/NoSQL) for recovery if Redis crashes.",
                weight: 5,
                hints: [
                  {
                    id: "hint-persistence",
                    title: "Durability",
                    text: "Redis is fast but in-memory. We need a backup on disk (like Postgres) so we don't lose data on restart.",
                    href: "/learn/database-caching",
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  ],
};
