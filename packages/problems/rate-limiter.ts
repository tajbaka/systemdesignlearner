import { buildLinks } from "./article-links";

export const RATE_LIMITER_PROBLEM = {
  slug: "rate-limiter",
  category: "backend" as const,
  version: {
    versionNumber: 1,
    title: "Distributed Rate Limiter",
    description:
      "Design a distributed service that limits the number of requests a client can send to an API within a time window, preventing abuse and managing traffic surges.",
    difficulty: "medium" as const,
    timeToComplete: "45 min",
    topic: "System Design",
    links: buildLinks([
      "rate-limiting-algorithms",
      "database-caching",
      "cap-theorem",
      "scaling",
      "system-design-structure",
    ]),
    isCurrent: true,
  },
  steps: [
    {
      stepType: "functional" as const,
      order: 0,
      title: "Functional Requirements",
      description: "Define what the Rate Limiter must do",
      required: true,
      data: {
        scoreWeight: 30,
        requirements: [
          {
            id: "request-throttling",
            label: "Throttling Rules",
            description:
              "Limit requests based on various attributes (User ID, IP Address, API Key) and time windows.",
            weight: 15,
            required: true,
            solutions: [
              {
                text: "Limit requests based on client attributes (IP, User ID) within a specific time window.",
              },
            ],
            hints: [
              {
                id: "hint-throttling",
                title: "Throttling Granularity",
                text: "How do we identify who to limit? Should it be by IP address, User ID, or API Key?",
                href: "/learn/rate-limiting-algorithms#where-to-put-the-rate-limiter",
              },
            ],
            evaluationCriteria:
              "User must mention limiting based on identifiers like IP, UserID, or API Key.",
            feedbackOnMissing:
              "Who are we limiting? We need to identify the client (IP, UserID, etc.) to apply the limit.",
          },
          {
            id: "configurable-limits",
            label: "Configurable Limits",
            description:
              "Support different rules for different endpoints or user tiers (e.g., 10 req/sec for free users, 100 req/sec for paid).",
            weight: 15,
            required: true,
            solutions: [
              {
                text: "Support configurable limits per user tier (free vs paid) and per endpoint. Different rules for different API paths.",
              },
            ],
            hints: [
              {
                id: "hint-configuration",
                title: "Flexible Rules",
                text: "Should every user have the same limit, or do we need different tiers (Free vs Premium)?",
                href: "/learn/design-rate-limiter#functional-requirements",
              },
            ],
            evaluationCriteria:
              "User mentions support for different limits based on user tiers or specific API endpoints.",
            feedbackOnMissing:
              "Do all users get the same limit? What about paid users or critical internal services?",
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
            id: "low-latency",
            label: "Low Latency",
            description:
              "The rate limiter is middleware; it must add minimal overhead to the request path.",
            weight: 8,
            required: true,
            solutions: [
              {
                text: "Latency should be extremely low (< 20ms) as this sits on the critical path of every request.",
              },
            ],
            hints: [
              {
                id: "hint-latency",
                title: "Performance Impact",
                text: "Since this checks every single request, how much time can it afford to take?",
                href: "/learn/database-caching#latency-numbers-you-should-know",
              },
            ],
            evaluationCriteria:
              "User emphasizes ultra-low latency (e.g., <20ms) to avoid slowing down legitimate traffic.",
            feedbackOnMissing:
              "This runs before every API call. If it's slow, the whole app is slow. What is our latency target?",
          },
          {
            id: "high-availability",
            label: "High Availability",
            description:
              "The system should be always up. Decide between 'Fail-Open' (allow traffic) or 'Fail-Closed' (block traffic) on failure.",
            weight: 6,
            required: true,
            solutions: [
              {
                text: "System must be highly available. If the limiter fails, usually we 'fail-open' to not degrade UX.",
              },
            ],
            hints: [
              {
                id: "hint-availability",
                title: "Failure Strategy",
                text: "If the Rate Limiter crashes, should the API stop working (Fail-Closed) or let everyone in (Fail-Open)?",
                href: "/learn/rate-limiting-algorithms#fail-open-vs-fail-closed",
              },
            ],
            evaluationCriteria:
              "User discusses Availability and mentions a failure strategy (usually Fail-Open).",
            feedbackOnMissing:
              "If the rate limiter goes down, do we block everyone or let everyone through?",
          },
          {
            id: "distributed-consistency",
            label: "Distributed Consistency",
            description:
              "Limits must be shared across multiple servers; local memory counters are insufficient.",
            weight: 6,
            required: true,
            solutions: [
              {
                text: "Must support distributed counting (e.g. Redis) so requests hitting different servers count toward the same limit.",
              },
            ],
            hints: [
              {
                id: "hint-distributed",
                title: "Global vs Local",
                text: "If we have 10 servers, does the user get 10x the limit? How do we synchronize counters?",
                href: "/learn/rate-limiting-algorithms#distributed-rate-limiting",
              },
            ],
            evaluationCriteria:
              "User mentions the need for a shared store (Redis) to handle limits in a distributed cluster.",
            feedbackOnMissing:
              "We have multiple servers. How do we make sure a user doesn't just hit a different server to bypass the limit?",
          },
        ],
      },
    },
    {
      stepType: "api" as const,
      order: 2,
      title: "API Design",
      description: "Design the API or Middleware Interface for the Rate Limiter",
      required: true,
      data: {
        scoreWeight: 20,
        requirements: [
          {
            id: "check-limit-endpoint",
            scope: "endpoint",
            label: "Check Limit Endpoint / Middleware",
            description:
              "Internal API or Middleware logic to check if a request is allowed. Returns status and headers.",
            weight: 20,
            required: true,
            method: "POST",
            correctPath: "/api/v1/ratelimit/check",
            solutions: [
              {
                overview: "Middleware endpoint to check if a request is allowed under rate limits",
                request: '{ "key": string, "cost": number }',
                response: {
                  statusCode: "200",
                  text: '{ "allowed": bool, "remaining": number, "resetAt": timestamp }',
                },
                errors: [
                  {
                    statusCode: "429",
                    text: "Too Many Requests. Headers: Retry-After, X-RateLimit-Reset",
                  },
                  {
                    statusCode: "400",
                    text: "Invalid key format or missing required fields",
                  },
                ],
              },
            ],
            hints: [
              {
                id: "hint-check-method",
                title: "Interface Design",
                text: "The rate limiter is middleware. What does it need to make a decision? A client identifier (user ID, IP, API key) and a request cost.",
                href: "/learn/design-rate-limiter#api-design",
              },
              {
                id: "hint-check-response",
                title: "Response Headers",
                text: "Include standard rate limit headers: X-RateLimit-Remaining (requests left), Retry-After (seconds to wait), X-RateLimit-Reset (window reset time).",
                href: "/learn/design-rate-limiter#response-headers",
              },
              {
                id: "hint-check-decision",
                title: "Decision Logic",
                text: "The rate limiter makes a boolean allow/deny decision. Allowed requests return 200 OK; denied requests return 429 Too Many Requests.",
                href: "/learn/design-rate-limiter#api-design",
              },
            ],
            evaluationCriteria:
              "Description must cover the middleware interface: " +
              "1) Request inputs (client identifier like user ID/IP/API key, and optional cost), " +
              "2) Response format (allow/deny decision with remaining quota and reset time), " +
              "3) Status codes (200 for allowed, 429 for denied), " +
              "4) Rate limit headers (X-RateLimit-Remaining, Retry-After).",
            feedbackOnMissing:
              "Describe the rate limiter's middleware interface: what inputs does it need (client identifier, cost), what does it return (allow/deny, remaining quota), and what HTTP status codes and headers does it use?",
          },
        ],
      },
    },
    {
      stepType: "highLevelDesign" as const,
      order: 3,
      title: "High-Level Design",
      description: "Design the system architecture and components",
      required: true,
      data: {
        scoreWeight: 30,
        requirements: [
          {
            nodes: [
              { id: "Client-1", type: "client", name: "Client", icon: "client" },
              {
                id: "API-Gateway-1",
                type: "api-gateway",
                name: "API Gateway",
                icon: "api-gateway",
              },
              {
                id: "Rate-Limiter-1",
                type: "rate-limiter-service",
                name: "Rate Limiter",
                icon: "service",
              },
              { id: "Cache-1", type: "cache", name: "Redis", icon: "cache" },
              {
                id: "API-Services-1",
                type: "api-service",
                name: "API Services",
                icon: "service",
              },
            ],
            edges: [
              {
                id: "Client-Gateway",
                from: "Client-1",
                to: "API-Gateway-1",
                description: "Client sends requests to the API Gateway",
                weight: 5,
              },
              {
                id: "Gateway-RateLimiter",
                from: "API-Gateway-1",
                to: "Rate-Limiter-1",
                description: "Gateway checks if the request is within limits before processing.",
                weight: 10,
              },
              {
                id: "RateLimiter-Cache",
                from: "Rate-Limiter-1",
                to: "Cache-1",
                description:
                  "Rate Limiter updates counters in Redis using Lua scripts for atomicity.",
                weight: 10,
              },
              {
                id: "Gateway-APIServices",
                from: "API-Gateway-1",
                to: "API-Services-1",
                description:
                  "If allowed, Gateway forwards the request to the downstream API Services.",
                weight: 5,
              },
            ],
          },
        ],
      },
    },
  ],
};
