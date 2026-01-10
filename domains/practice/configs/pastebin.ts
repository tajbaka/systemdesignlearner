import type { ProblemScoringConfig, DesignSolution } from "../types";

/**
 * Pastebin scoring configuration
 * This file is type-checked at compile time to ensure it matches the expected structure.
 */
const config: ProblemScoringConfig = {
  problemId: "pastebin",
  title: "Pastebin",
  description:
    "Design a text paste sharing service that allows users to create, store, and share text snippets with unique URLs",
  totalScore: 100,
  steps: {
    functional: {
      maxScore: 20,
      requirements: [
        {
          id: "create-paste",
          label: "Paste Creation",
          description: "Users can submit text content and receive a unique shareable URL.",
          keywords: [
            "create",
            "upload",
            "paste",
            "submit",
            "text",
            "content",
            "share",
            "url",
            "link",
          ],
          weight: 20,
          required: true,
          solutions: [
            { text: "Submit text content to create a new paste." },
            { text: "System generates a unique URL for sharing." },
          ],
          hints: [
            { text: "What should happen when a user wants to create and share a text paste?" },
          ],
        },
        {
          id: "view-paste",
          label: "Paste Retrieval",
          description: "Access paste content via the unique URL or ID.",
          keywords: ["view", "read", "retrieve", "access", "get", "fetch", "display", "show"],
          weight: 20,
          required: true,
          solutions: [
            { text: "Anyone with the URL can view the paste." },
            { text: "Retrieve paste content by its unique ID." },
          ],
          hints: [
            { text: "What should happen when someone accesses a paste using its URL or ID?" },
          ],
        },
        {
          id: "unique-ids",
          label: "Unique Identifiers",
          description: "Each paste has a unique ID that maps to exactly one piece of content.",
          keywords: ["unique", "id", "identifier", "hash", "uuid", "distinct", "collision"],
          weight: 10,
          required: true,
          solutions: [
            { text: "Every paste gets a unique identifier." },
            { text: "No two pastes share the same ID." },
          ],
          hints: [{ text: "How should the system ensure each paste has a unique identifier?" }],
        },
        {
          id: "paste-expiration",
          label: "Paste Expiration",
          description: "Support optional expiration dates or TTL after which pastes are deleted.",
          keywords: ["expire", "ttl", "temporary", "time-limited", "timeout", "lifetime", "delete"],
          weight: 2,
          required: false,
          solutions: [
            { text: "Pastes can expire after a set period." },
            { text: "Support TTL for temporary pastes." },
          ],
          hints: [
            {
              text: "Should pastes have an expiration date or time limit after which they are deleted?",
            },
          ],
        },
        {
          id: "syntax-highlighting",
          label: "Syntax Highlighting",
          description: "Detect programming language and apply syntax highlighting.",
          keywords: ["syntax", "highlight", "code", "language", "format", "color", "programming"],
          weight: 1,
          required: false,
          solutions: [
            { text: "Auto-detect language for syntax highlighting." },
            { text: "Support code formatting for various languages." },
          ],
          hints: [
            {
              text: "Should the system detect and highlight code syntax for programming languages?",
            },
          ],
        },
        {
          id: "paste-visibility",
          label: "Visibility Options",
          description: "Control paste visibility (public, unlisted, private).",
          keywords: [
            "visibility",
            "public",
            "private",
            "unlisted",
            "hidden",
            "access",
            "permission",
          ],
          weight: 1,
          required: false,
          solutions: [
            { text: "Users can set pastes as public, unlisted, or private." },
            { text: "Control who can access the paste." },
          ],
          hints: [
            {
              text: "Should users be able to control who can view their pastes (public, private, unlisted)?",
            },
          ],
        },
        {
          id: "user-accounts",
          label: "User Accounts",
          description: "Support user accounts to manage owned pastes.",
          keywords: ["auth", "login", "account", "user", "register", "sign in", "ownership"],
          weight: 1,
          required: false,
          solutions: [
            { text: "Users can sign in to manage their pastes." },
            { text: "Track paste ownership for registered users." },
          ],
          hints: [
            { text: "Should the system support user accounts for managing and tracking pastes?" },
          ],
        },
        {
          id: "raw-access",
          label: "Raw Content Access",
          description: "Provide raw text endpoint for CLI tools and embedding.",
          keywords: ["raw", "plain", "text", "cli", "embed", "download"],
          weight: 1,
          required: false,
          solutions: [
            { text: "Access raw content via /raw/:id endpoint." },
            { text: "Support curl and CLI tools for raw access." },
          ],
          hints: [
            {
              text: "Should the system provide a way to access paste content as plain text for CLI tools?",
            },
          ],
        },
      ],
    },
    nonFunctional: {
      maxScore: 20,
      requirements: [
        {
          id: "performance",
          label: "Performance and Latency",
          description: "Paste retrieval should be fast. Aim for sub 150ms p95 on reads.",
          keywords: ["fast", "quick", "responsive", "low latency", "speed", "milliseconds", "p95"],
          weight: 5,
          required: true,
          solutions: [
            { text: "Reads should target p95 under 150ms." },
            { text: "Keep response times low for good UX." },
          ],
          hints: [
            { text: "What performance requirements should the system meet for retrieving pastes?" },
          ],
        },
        {
          id: "scalability",
          label: "Scalability and Throughput",
          description: "Handle growing traffic and content volume.",
          keywords: ["scale", "traffic", "load", "growth", "volume", "requests", "throughput"],
          weight: 5,
          required: true,
          solutions: [
            { text: "Support millions of pastes." },
            { text: "Handle thousands of requests per second." },
          ],
          hints: [{ text: "What scale and throughput requirements should the system support?" }],
        },
        {
          id: "availability",
          label: "Availability",
          description: "Service should be highly available.",
          keywords: ["available", "uptime", "reliable", "fault tolerant", "99.9"],
          weight: 5,
          required: true,
          solutions: [
            { text: "Target 99.9% availability." },
            { text: "Avoid single points of failure." },
          ],
          hints: [{ text: "What availability requirements should the service meet?" }],
        },
        {
          id: "storage-efficiency",
          label: "Storage Efficiency",
          description: "Optimize storage costs for large text content.",
          keywords: ["storage", "cost", "efficient", "compress", "s3", "object"],
          weight: 2,
          required: false,
          solutions: [
            { text: "Use object storage for cost-effective content storage." },
            { text: "Compress content to reduce storage costs." },
          ],
          hints: [
            {
              text: "How should the system optimize storage costs for large amounts of text content?",
            },
          ],
        },
        {
          id: "caching",
          label: "Caching Strategy",
          description: "Cache frequently accessed pastes.",
          keywords: ["cache", "cdn", "edge", "hot", "popular", "ttl"],
          weight: 2,
          required: false,
          solutions: [
            { text: "Cache popular pastes at the edge." },
            { text: "Use CDN for global distribution." },
          ],
          hints: [
            { text: "Should the system cache frequently accessed pastes to improve performance?" },
          ],
        },
        {
          id: "security",
          label: "Security",
          description: "Protect against abuse and malicious content.",
          keywords: ["security", "abuse", "rate limit", "spam", "malware", "scan"],
          weight: 1,
          required: false,
          solutions: [
            { text: "Rate limit paste creation." },
            { text: "Scan content for malicious patterns." },
          ],
          hints: [
            {
              text: "What security measures should be in place to protect against abuse and malicious content?",
            },
          ],
        },
      ],
    },
    api: {
      maxScore: 25,
      requirements: [
        {
          id: "create-paste-endpoint",
          label: "Paste Creation Endpoint",
          description:
            "POST endpoint to create new pastes with documented request/response. Request body should include content, optional title, and optional expiration. Response returns 201 with { id: string, url: string, createdAt: string }. Handle errors: 400 (invalid content), 429 (rate limited).",
          keywords: ["POST", "create", "paste", "content", "body", "request", "api/v1"],
          weight: 25,
          required: true,
          solutions: [
            {
              overview: "POST endpoint to create new pastes",
              request: "{ content: string, title?: string, expiresAt?: string }",
              response: {
                statusCode: "201",
                text: "{ id: string, url: string, createdAt: string }",
              },
              errors: [
                { statusCode: "400", text: "invalid content" },
                { statusCode: "429", text: "rate limited" },
              ],
            },
          ],
          endpoint: {
            method: "POST",
            purpose: "Create a new paste from text content",
            requiredBy: ["create-paste"],
            weight: 25,
            required: true,
            minDocumentationLength: 40,
            correctPath: "/api/v1/pastes",
          },
        },
        {
          id: "get-paste-endpoint",
          label: "Paste Retrieval Endpoint",
          description:
            "GET endpoint to retrieve paste content with documented request/response. Request should include the paste ID (in path parameter). Response returns 200 with { id, content, title, createdAt }. Handle errors: 404 (not found), 410 (expired).",
          keywords: ["GET", "retrieve", "paste", "content", "id", "404", "410"],
          weight: 25,
          required: true,
          solutions: [
            {
              overview: "GET endpoint to retrieve paste content",
              request: "id: string (path parameter)",
              response: {
                statusCode: "200",
                text: "{ id: string, content: string, title?: string, createdAt: string }",
              },
              errors: [
                { statusCode: "404", text: "not found" },
                { statusCode: "410", text: "expired" },
              ],
            },
          ],
          endpoint: {
            method: "GET",
            purpose: "Retrieve paste content by ID",
            requiredBy: ["view-paste"],
            weight: 25,
            required: true,
            minDocumentationLength: 30,
            correctPath: "/api/v1/pastes/:id",
          },
        },
        {
          id: "raw-endpoint",
          label: "Raw Content Endpoint",
          description:
            "GET endpoint for raw text content with documented request/response. Request should include the paste ID (in path parameter). Response returns 200 with plain text content. Handle errors: 404 (not found), 410 (expired).",
          keywords: ["raw", "plain", "text", "GET"],
          weight: 2,
          required: false,
          solutions: [
            {
              overview: "GET endpoint for raw text content",
              request: "id: string (path parameter)",
              response: {
                statusCode: "200",
                text: "plain text content",
              },
              errors: [
                { statusCode: "404", text: "not found" },
                { statusCode: "410", text: "expired" },
              ],
            },
          ],
          endpoint: {
            method: "GET",
            purpose: "Get raw text content without formatting",
            requiredBy: ["raw-access"],
            weight: 2,
            required: false,
            minDocumentationLength: 15,
            correctPath: "/raw/:id",
          },
        },
        {
          id: "delete-endpoint",
          label: "Delete Endpoint",
          description:
            "DELETE endpoint to remove pastes with documented request/response. Request should include the paste ID (in path parameter). Response returns 204. Handle errors: 404 (not found).",
          keywords: ["DELETE", "remove", "delete"],
          weight: 2,
          required: false,
          solutions: [
            {
              overview: "DELETE endpoint to remove pastes",
              request: "id: string (path parameter)",
              response: {
                statusCode: "204",
                text: "No content",
              },
              errors: [{ statusCode: "404", text: "not found" }],
            },
          ],
          endpoint: {
            method: "DELETE",
            purpose: "Delete a paste",
            requiredBy: ["user-accounts"],
            weight: 2,
            required: false,
            minDocumentationLength: 15,
            correctPath: "/api/v1/pastes/:id",
          },
        },
        {
          id: "error-handling",
          label: "Error Handling",
          description: "Document error codes (400, 404, 410, 429)",
          keywords: ["error", "400", "404", "410", "429", "expired", "not found"],
          weight: 2,
          required: false,
          solutions: [{ text: "404 for not found, 410 for expired pastes" }],
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
            { id: "Service", type: "service" },
            { id: "Object Store (S3)", type: "object-store" },
            { id: "CDN", type: "cdn" },
            { id: "DB (Postgres)", type: "db" },
          ],
          edges: [
            {
              from: "Client",
              to: "API Gateway",
              protocol: "HTTP",
              percentage: 20,
              hints: [{ text: "Client must connect to API Gateway to send requests" }],
            },
            {
              from: "API Gateway",
              to: "Service",
              protocol: "HTTP",
              percentage: 20,
              hints: [{ text: "API Gateway routes requests to the paste service" }],
            },
            {
              from: "Service",
              to: "Object Store (S3)",
              op: "write",
              percentage: 20,
              hints: [
                {
                  text: "Service needs to store paste content in object storage for cost-effective blob storage",
                },
              ],
            },
            {
              from: "Service",
              to: "Object Store (S3)",
              op: "read",
              percentage: 15,
              hints: [
                {
                  text: "Service retrieves paste content from object storage when serving requests",
                },
              ],
            },
            {
              from: "CDN",
              to: "Object Store (S3)",
              op: "read",
              percentage: 10,
              hints: [
                {
                  text: "CDN caches popular pastes at edge locations and fetches from object store on cache misses",
                },
              ],
            },
            {
              from: "Service",
              to: "DB (Postgres)",
              op: "query",
              percentage: 15,
              hints: [
                {
                  text: "Service stores paste metadata (IDs, expiration, ownership) in database for efficient queries",
                },
              ],
            },
          ],
        },
      ],
    },
  },
  metadata: {
    version: "1.0.0",
    author: "System Design Sandbox",
    lastUpdated: "2025-12-20",
  },
};

export default config;

// Re-export DesignSolution for convenience
export type { DesignSolution };
