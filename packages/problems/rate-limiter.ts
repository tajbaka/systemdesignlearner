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
            weight: 10,
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
            weight: 10,
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
          {
            id: "feedback-mechanism",
            label: "Client Feedback",
            description:
              "Inform clients when they are throttled using standard HTTP status codes and headers.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Return HTTP 429 Too Many Requests. Include 'Retry-After' header to tell client when to try again.",
              },
            ],
            hints: [
              {
                id: "hint-feedback",
                title: "Response Handling",
                text: "How does the client know they've been blocked? What HTTP status code is standard for this?",
                href: "/learn/design-rate-limiter#response-headers",
              },
            ],
            evaluationCriteria:
              "User must mention returning HTTP 429 and helpful headers (Retry-After/X-RateLimit-Remaining).",
            feedbackOnMissing:
              "If a user is blocked, how do they know? We need to send a specific error code and maybe tell them when to come back.",
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
            weight: 10,
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
            weight: 5,
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
            weight: 5,
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
                overview: "POST endpoint to check if a request is allowed under rate limits",
                request: '{ "key": "user-123", "cost": 1 }',
                response: {
                  statusCode: "200",
                  text: '{ "allowed": true, "remaining": 45, "resetAt": "2024-01-01T12:00:00Z" }',
                },
                errors: [
                  {
                    statusCode: "429",
                    text: "Too Many Requests - Rate limit exceeded. Retry-After: 60",
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
                text: "What information does the rate limiter need to decide? (Identifier, Cost/Weight).",
                href: "/learn/system-design-structure#api-design",
              },
              {
                id: "hint-check-response",
                title: "Response Headers",
                text: "What headers should be returned to help the client? (X-Ratelimit-Remaining, Reset-Time).",
                href: "/learn/system-design-structure#api-design",
              },
              {
                id: "hint-check-decision",
                title: "Decision Logic",
                text: "The response is a simple boolean decision: Allow or Deny. How is this represented in HTTP?",
                href: "/learn/system-design-structure#api-design",
              },
            ],
            evaluationCriteria:
              "Endpoint description must include: " +
              "1) Request body format (accepts a key/identifier and optional cost), " +
              "2) Response format (returns allow/deny decision with remaining quota), " +
              "3) Success status code (200) and rate limit status code (429), " +
              "4) Rate limit headers (X-RateLimit-Remaining, Retry-After).",
            feedbackOnMissing:
              "How does the App Server ask the Rate Limiter if a request is allowed?",
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
              { id: "Workers-1", type: "worker-service", name: "Workers", icon: "service" },
            ],
            edges: [
              {
                id: "Client-Gateway",
                from: "Client-1",
                to: "API-Gateway-1",
                description: "Client sends requests to the API Gateway",
                weight: 3,
                hints: [
                  {
                    id: "hint-client-gateway",
                    title: "Entry Point",
                    text: "Where do requests first land? Usually a Gateway or Load Balancer.",
                    href: "/learn/scaling#api-gateway-load-balancer-the-traffic-cop",
                  },
                ],
              },
              {
                id: "Gateway-RateLimiter",
                from: "API-Gateway-1",
                to: "Rate-Limiter-1",
                description:
                  "Gateway (or Middleware) calls Rate Limiter Service to check eligibility before processing",
                weight: 9,
                hints: [
                  {
                    id: "hint-middleware",
                    title: "Middleware Check",
                    text: "Before doing the heavy work, the Gateway checks with the Rate Limiter.",
                    href: "/learn/design-rate-limiter#high-level-design",
                  },
                ],
              },
              {
                id: "RateLimiter-Cache",
                from: "Rate-Limiter-1",
                to: "Cache-1",
                description:
                  "Rate Limiter reads/writes counters in Redis. Uses Lua scripts for atomicity.",
                weight: 9,
                hints: [
                  {
                    id: "hint-cache-redis",
                    title: "Storage Engine",
                    text: "We need fast shared storage for counters. Redis is the standard choice here.",
                    href: "/learn/rate-limiting-algorithms#the-solution-redis",
                  },
                  {
                    id: "hint-atomicity",
                    title: "Race Conditions",
                    text: "How do we prevent race conditions when two requests update the counter at the exact same time? (Lua Scripts).",
                    href: "/learn/rate-limiting-algorithms#lua-scripts-for-atomicity",
                  },
                ],
              },
              {
                id: "Gateway-Workers",
                from: "API-Gateway-1",
                to: "Workers-1",
                description: "If allowed (200 OK), Gateway forwards request to backend services.",
                weight: 9,
                hints: [
                  {
                    id: "hint-forwarding",
                    title: "Happy Path",
                    text: "If the limiter says 'Yes', where does the request go next?",
                    href: "/learn/design-rate-limiter#high-level-design",
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
