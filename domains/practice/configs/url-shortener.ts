import type { ProblemScoringConfig, DesignSolution } from "../types";

/**
 * URL Shortener scoring configuration
 * This file is type-checked at compile time to ensure it matches the expected structure.
 */
const config: ProblemScoringConfig = {
  problemId: "url-shortener",
  title: "URL Shortener",
  description:
    "Design a scalable URL shortening service like TinyURL or Bitly that takes creates short, unique links and redirects users to original URLs",
  totalScore: 100,
  steps: {
    functional: {
      maxScore: 20,
      requirements: [
        {
          id: "url-shortening",
          label: "URL Shortening",
          description:
            "Accept a long URL and return a short, Users should be able to submit a long URL and receive a shortened version.",
          keywords: ["shorten", "create", "alias"],
          weight: 20,
          required: true,
          solutions: [{ text: "The Url Shortener maps a long URL to a short URL" }],
          hints: [
            {
              text: "What should happen when a user wants to create a shortened link from a long URL?",
            },
          ],
        },
        {
          id: "redirection",
          label: "URL Redirection",
          description: "Resolve a short URL and redirect the client to the original long URL.",
          keywords: ["redirect", "resolve", "302"],
          weight: 20,
          required: true,
          solutions: [{ text: "Opening the short URL takes the user to the long URL." }],
          hints: [{ text: "What should happen when someone clicks on or accesses a short URL?" }],
        },
        {
          id: "uniqueness",
          label: "Uniqueness Guarantee",
          description: "Each short URL is unique and maps to exactly one long URL.",
          keywords: ["unique", "pre-generate", "pool"],
          weight: 20,
          required: true,
          solutions: [{ text: "Every short URL that gets generated is unique." }],
          hints: [
            {
              text: "How should the system ensure that each short URL is different from all others?",
            },
          ],
        },
        {
          id: "custom-aliases",
          label: "Custom Aliases",
          description:
            "Allow users to provide a custom short code instead of a generated one. Users can choose their own custom URLs.",
          keywords: ["custom", "vanity"],
          weight: 1,
          required: false,
          solutions: [
            { text: "Users can set the short URL to something custom like tinyUrl.com/my-link." },
          ],
          hints: [
            {
              text: "Should users be able to choose their own custom short codes instead of auto-generated ones?",
            },
          ],
        },
        {
          id: "link-expiration",
          label: "Link Expiration",
          description:
            "Support optional expiration dates or TTL after which links are invalid. Links can expire after a set period.",
          keywords: ["expire", "ttl"],
          weight: 1,
          required: false,
          solutions: [
            { text: "Links will expire after a set period, lets say 5 years in our case." },
          ],
          hints: [
            {
              text: "Should links have a time limit or expiration date after which they become invalid?",
            },
          ],
        },
        {
          id: "basic-analytics",
          label: "Analytics and Metrics",
          description:
            "Track usage per short URL such as click counts and referrers. Monitor how many times each short URL is accessed.",
          keywords: ["analytics", "clicks", "track"],
          weight: 1,
          required: false,
          solutions: [{ text: "Track number of clicks of the short URL." }],
          hints: [
            {
              text: "Should the system track how many times each short URL is accessed or clicked?",
            },
          ],
        },
      ],
    },
    nonFunctional: {
      maxScore: 20,
      requirements: [
        {
          id: "latency",
          label: "Performance and Latency",
          description:
            "Redirects should be really fast, low latency is critical for user experience.",
          keywords: ["latency", "fast", "100ms"],
          weight: 5,
          required: true,
          solutions: [
            {
              text: "We want to prioritize low latency on the redirect going for under a 100ms for the redirect service. If a redirect takes too long, its just not great user experience.",
            },
          ],
          hints: [
            {
              text: "What performance requirements should the redirect service meet in terms of response time?",
            },
          ],
        },
        {
          id: "availability",
          label: "Availability vs consistency",
          description:
            "Redirect Service should be highly available with no single points of failure. Applying CAP theorem here, we can sacrifice consistency for availability because its fine if a created url is not immediately available, but we can't afford to have a link that doesn't work.",
          keywords: ["availability", "uptime", "99.99"],
          weight: 5,
          required: true,
          solutions: [
            {
              text: "The system needs to be available 99.99% of the time, because we can't afford to have a link that doesn't work. We can sacrifice consistency for availability here, as eventual concistency is good enough for urls that are created.",
            },
          ],
          hints: [
            {
              text: "What availability requirements should the system meet, and should we prioritize availability over consistency?",
            },
          ],
        },
        {
          id: "scalability",
          label: "Scalability and Throughput",
          description:
            "We can expect their to be a lot more reads than writes. To support traffic spikes we can support 1 billion reads per day and 100 million writes. We can not be more than 5 times less accurate than these numbers.",
          keywords: ["scale", "throughput", "rps"],
          weight: 5,
          required: true,
          solutions: [
            {
              text: "Support about 1B reads per day vs 10 million writes, this is because more urls will be redirected than created. We should also seperate these services so that they can scale independently.",
            },
          ],
          hints: [
            {
              text: "What scale and throughput requirements should the system support, and how should read and write operations be handled?",
            },
          ],
        },
      ],
    },
    api: {
      maxScore: 25,
      requirements: [
        {
          id: "create-url-endpoint",
          label: "URL Creation Endpoint",
          description:
            "POST endpoint to create shortened URLs with documented request/response. Request body should include the long URL, optional custom alias, and optional expiration. Response returns 201 with { shortUrl: string }. Handle errors: 400 (invalid URL), 409 (alias taken), 429 (rate limit).",
          keywords: ["POST", "create", "api/v1/urls"],
          weight: 25,
          required: true,
          solutions: [
            {
              overview: "POST endpoint to create shortened URLs",
              request: "{ url: string, customAlias?: string, expiresAt?: string }",
              response: {
                statusCode: "201",
                text: "{ shortUrl: string }",
              },
              errors: [
                { statusCode: "400", text: "invalid URL" },
                { statusCode: "409", text: "alias taken" },
                { statusCode: "429", text: "rate limit" },
              ],
            },
          ],
          endpoint: {
            method: "POST",
            purpose: "Create a new short URL from a long URL",
            requiredBy: ["url-shortening"],
            weight: 25,
            required: true,
            minDocumentationLength: 40,
            correctPath: "api/v1/urls",
          },
        },
        {
          id: "redirect-endpoint",
          label: "Redirect Endpoint",
          description:
            "GET endpoint to redirect short URLs with documented request/response. Request should include the short code (in path parameter). Response returns 301 or 302 redirect to original URL (302 recommended for analytics or 301 for faster redirects via caching). Handle errors: 404 (not found), 410 (expired).",
          keywords: ["GET", "redirect", "302", "301"],
          weight: 25,
          required: true,
          solutions: [
            {
              overview: "GET endpoint to redirect short URLs to original long URLs",
              request: "slug as path parameter (e.g. https://tinyUrl.com/:slug)",
              response: {
                statusCode: "301 or 302",
                text: "redirect to original URL",
              },
              errors: [
                { statusCode: "404", text: "not found" },
                { statusCode: "410", text: "expired" },
              ],
            },
          ],
          endpoint: {
            method: "GET",
            purpose: "Redirect to the original long URL",
            requiredBy: ["redirection"],
            weight: 25,
            required: true,
            minDocumentationLength: 30,
            correctPath: "/:slug",
          },
        },
        {
          id: "analytics-endpoint",
          label: "Analytics Endpoint",
          description:
            "GET endpoint to retrieve click stats and analytics with documented request/response. Request should include the short URL (in path parameter). Response returns 200 with { totalClicks: number, lastAccessedAt: string, expiresAt: string }. Handle errors: 404 (not found).",
          keywords: ["analytics", "clicks"],
          weight: 2,
          required: false,
          solutions: [
            {
              overview: "GET endpoint to retrieve click stats and analytics",
              request: "slug: string (path parameter)",
              response: {
                statusCode: "200",
                text: "{ totalClicks: number, lastAccessedAt: string, expiresAt: string }",
              },
              errors: [{ statusCode: "404", text: "not found" }],
            },
          ],
          endpoint: {
            method: "GET",
            purpose: "Retrieve analytics and metrics for a short URL",
            requiredBy: ["basic-analytics"],
            weight: 6,
            required: false,
            minDocumentationLength: 30,
            correctPath: "/api/v1/urls/:slug",
          },
        },
        {
          id: "update-endpoint",
          label: "Update Endpoint",
          description:
            "PUT endpoint to modify URL properties with documented request/response. Request body should include the longUrl. Response returns 200 with { shortUrl: string, longUrl: string }. Handle errors: 400 (invalid URL), 404 (not found), 409 (alias taken).",
          keywords: ["PUT", "update"],
          weight: 1,
          required: false,
          solutions: [
            {
              overview: "PUT endpoint to modify URL properties",
              request: "{ slug: string (path parameter), longUrl: string }",
              response: {
                statusCode: "200",
                text: "{ shortUrl: string, longUrl: string }",
              },
              errors: [
                { statusCode: "400", text: "invalid URL" },
                { statusCode: "404", text: "not found" },
                { statusCode: "409", text: "alias taken" },
              ],
            },
          ],
          endpoint: {
            method: "PUT",
            purpose: "Update a short URL's properties",
            requiredBy: ["admin-delete"],
            weight: 1,
            required: false,
            minDocumentationLength: 20,
            correctPath: "/api/v1/urls/:slug",
          },
        },
        {
          id: "delete-endpoint",
          label: "Delete Endpoint",
          description:
            "DELETE endpoint to remove URLs with documented request/response. Request should include the short URL (in path parameter). Response returns 204. Handle errors: 404 (not found).",
          keywords: ["DELETE", "remove"],
          weight: 1,
          required: false,
          solutions: [
            {
              overview: "DELETE endpoint to remove URLs",
              request: "slug: string (path parameter)",
              response: {
                statusCode: "204",
                text: "No content",
              },
              errors: [{ statusCode: "404", text: "not found" }],
            },
          ],
          endpoint: {
            method: "DELETE",
            purpose: "Delete a short URL",
            requiredBy: ["admin-delete"],
            weight: 2,
            required: false,
            minDocumentationLength: 20,
            correctPath: "/api/v1/urls/:slug",
          },
        },
      ],
    },
    highLevelDesign: {
      maxScore: 35,
      solutions: [
        {
          nodes: [
            { id: "Client", type: "client" },
            { id: "API Gateway", type: "gateway" },
            { id: "Service1", type: "service" },
            { id: "Service2", type: "service" },
            { id: "DB (Postgres)", type: "db" },
            { id: "Cache (Redis)", type: "cache" },
          ],
          edges: [
            {
              from: "Client",
              to: "API Gateway",
              protocol: "HTTP",
              percentage: 17,
              hints: [{ text: "Client must connect to API Gateway to send requests" }],
            },
            {
              from: "API Gateway",
              to: "Service1",
              protocol: "HTTP",
              percentage: 17,
              hints: [{ text: "API Gateway routes requests to the URL shortening service" }],
            },
            {
              from: "Service1",
              to: "DB (Postgres)",
              op: "read",
              percentage: 17,
              hints: [{ text: "Service needs to query the database to retrieve URL mappings" }],
            },
            {
              from: "API Gateway",
              to: "Service2",
              protocol: "HTTP",
              percentage: 17,
              hints: [{ text: "API Gateway routes redirect requests to the redirect service" }],
            },
            {
              from: "Service1",
              to: "Cache (Redis)",
              op: "read",
              percentage: 15,
              hints: [
                { text: "Using a cache avoids DB load and reduces latency for popular URLs" },
              ],
            },
            {
              from: "Service2",
              to: "DB (Postgres)",
              op: "write",
              percentage: 17,
              hints: [{ text: "Service needs to write to database when cache misses occur" }],
            },
          ],
        },
      ],
    },
  },
  metadata: {
    version: "1.0.0",
    author: "System Design Sandbox",
    lastUpdated: "2025-10-31",
  },
};

export default config;

// Re-export DesignSolution for convenience
export type { DesignSolution };
