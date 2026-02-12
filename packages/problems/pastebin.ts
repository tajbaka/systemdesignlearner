import { buildLinks } from "./article-links";

export const PASTEBIN_PROBLEM = {
  slug: "pastebin",
  category: "backend" as const,
  version: {
    versionNumber: 1,
    title: "Pastebin",
    description:
      "Design a text paste sharing service that allows users to create, store, and share text snippets with unique URLs",
    difficulty: "medium" as const,
    timeToComplete: "45 min",
    topic: "System Design",
    links: buildLinks([
      "object-storage-cdn",
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
      description: "Define what the Pastebin service must do",
      required: true,
      data: {
        scoreWeight: 20,
        requirements: [
          {
            id: "create-paste",
            label: "Paste Creation",
            description: "Users can submit text content and receive a unique shareable URL.",
            weight: 6,
            required: true,
            solutions: [
              {
                text: "Submit text content to create a new paste. System generates a unique URL for sharing.",
              },
            ],
            hints: [
              {
                id: "hint-create-paste",
                title: "Paste Creation",
                text: "What should happen when a user wants to create and share a text paste?",
                href: "/learn/design-pastebin#functional-requirements",
              },
            ],
            evaluationCriteria:
              "User must mention submitting text content to generate a new paste with a unique URL.",
            feedbackOnMissing:
              "How does a user start? They need to be able to upload their text and get a link back.",
          },
          {
            id: "view-paste",
            label: "Paste Retrieval",
            description: "Access paste content via the unique URL or ID.",
            weight: 6,
            required: true,
            solutions: [
              {
                text: "Anyone with the URL can view the paste. Retrieve paste content by its unique ID.",
              },
            ],
            hints: [
              {
                id: "hint-view-paste",
                title: "Paste Retrieval",
                text: "What should happen when someone accesses a paste using its URL or ID?",
                href: "/learn/design-pastebin#functional-requirements",
              },
            ],
            evaluationCriteria:
              "User must mention retrieving or viewing the paste using the generated URL or ID.",
            feedbackOnMissing: "Once a paste is created, how do other people read it?",
          },
          {
            id: "unique-ids",
            label: "Unique Identifiers",
            description: "Each paste has a unique ID that maps to exactly one piece of content.",
            weight: 4,
            required: true,
            solutions: [
              { text: "Every paste gets a unique identifier. No two pastes share the same ID." },
            ],
            hints: [
              {
                id: "hint-unique-ids",
                title: "Unique Identifiers",
                text: "How should the system ensure each paste has a unique identifier?",
                href: "/learn/design-pastebin#functional-requirements",
              },
            ],
            evaluationCriteria: "User must mention that every paste ID must be unique.",
            feedbackOnMissing: "How do we make sure two different pastes don't get the same link?",
          },
          {
            id: "paste-expiration",
            label: "Paste Expiration",
            description: "Support optional expiration dates or TTL after which pastes are deleted.",
            weight: 1,
            required: false,
            solutions: [
              { text: "Pastes can expire after a set period. Support TTL for temporary pastes." },
            ],
            hints: [
              {
                id: "hint-paste-expiration",
                title: "Paste Expiration",
                text: "Should pastes have an expiration date or time limit after which they are deleted?",
                href: "/learn/design-pastebin#functional-requirements",
              },
            ],
            evaluationCriteria: "User mentions setting expiration times (TTL) for pastes.",
            feedbackOnMissing: "Can users create temporary pastes that disappear after a while?",
          },
          {
            id: "syntax-highlighting",
            label: "Syntax Highlighting",
            description: "Detect programming language and apply syntax highlighting.",
            weight: 1,
            required: false,
            solutions: [
              {
                text: "Auto-detect language for syntax highlighting. Support code formatting for various languages.",
              },
            ],
            hints: [
              {
                id: "hint-syntax-highlighting",
                title: "Syntax Highlighting",
                text: "Should the system detect and highlight code syntax for programming languages?",
                href: "/learn/design-pastebin#functional-requirements",
              },
            ],
            evaluationCriteria: "User mentions syntax highlighting or language detection.",
            feedbackOnMissing:
              "If users paste code, can we make it look nice with syntax highlighting?",
          },
          {
            id: "paste-visibility",
            label: "Visibility Options",
            description: "Control paste visibility (public, unlisted, private).",
            weight: 1,
            required: false,
            solutions: [
              {
                text: "Users can set pastes as public, unlisted, or private. Control who can access the paste.",
              },
            ],
            hints: [
              {
                id: "hint-paste-visibility",
                title: "Visibility Options",
                text: "Should users be able to control who can view their pastes (public, private, unlisted)?",
                href: "/learn/design-pastebin#functional-requirements",
              },
            ],
            evaluationCriteria:
              "User mentions visibility controls like public, private, or unlisted pastes.",
            feedbackOnMissing:
              "Can users control who sees their paste (e.g. password protected or unlisted)?",
          },
          {
            id: "user-accounts",
            label: "User Accounts",
            description: "Support user accounts to manage owned pastes.",
            weight: 1,
            required: false,
            solutions: [
              {
                text: "Users can sign in to manage their pastes. Track paste ownership for registered users.",
              },
            ],
            hints: [
              {
                id: "hint-user-accounts",
                title: "User Accounts",
                text: "Should the system support user accounts for managing and tracking pastes?",
                href: "/learn/design-pastebin#functional-requirements",
              },
            ],
            evaluationCriteria: "User mentions user accounts, login, or paste ownership.",
            feedbackOnMissing: "Do users need to log in to track their history of pastes?",
          },
          {
            id: "raw-access",
            label: "Raw Content Access",
            description: "Provide raw text endpoint for CLI tools and embedding.",
            weight: 0,
            required: false,
            solutions: [
              {
                text: "Access raw content via /raw/:id endpoint. Support curl and CLI tools for raw access.",
              },
            ],
            hints: [
              {
                id: "hint-raw-access",
                title: "Raw Content Access",
                text: "Should the system provide a way to access paste content as plain text for CLI tools?",
                href: "/learn/design-pastebin#functional-requirements",
              },
            ],
            evaluationCriteria: "User mentions accessing the raw/plain text content directly.",
            feedbackOnMissing: "How can I download just the text without the HTML page wrapper?",
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
            id: "performance",
            label: "Performance and Latency",
            description: "Paste retrieval should be fast. Aim for sub 150ms p95 on reads.",
            weight: 5,
            required: true,
            solutions: [
              { text: "Reads should target p95 under 150ms. Keep response times low for good UX." },
            ],
            hints: [
              {
                id: "hint-performance",
                title: "Performance and Latency",
                text: "What performance requirements should the system meet for retrieving pastes?",
                href: "/learn/database-caching#latency-numbers-you-should-know",
              },
            ],
            evaluationCriteria: "User mentions low latency reads (e.g., <150ms).",
            feedbackOnMissing: "How fast should the text load? We need strict latency targets.",
          },
          {
            id: "scalability",
            label: "Scalability and Throughput",
            description: "Handle growing traffic and content volume.",
            weight: 5,
            required: true,
            solutions: [
              { text: "Support millions of pastes. Handle thousands of requests per second." },
            ],
            hints: [
              {
                id: "hint-scalability",
                title: "Scalability and Throughput",
                text: "What scale and throughput requirements should the system support?",
                href: "/learn/scaling#horizontal-scaling-scale-out",
              },
            ],
            evaluationCriteria: "User mentions scaling to millions of pastes or high RPS.",
            feedbackOnMissing: "Will this system handle 10 users or 10 million? Mention scale.",
          },
          {
            id: "availability",
            label: "Availability",
            description: "Service should be highly available.",
            weight: 5,
            required: true,
            solutions: [{ text: "Target 99.9% availability. Avoid single points of failure." }],
            hints: [
              {
                id: "hint-availability",
                title: "Availability",
                text: "What availability requirements should the service meet?",
                href: "/learn/cap-theorem#availability-a",
              },
            ],
            evaluationCriteria: "User targets high availability (e.g., 99.9% or higher).",
            feedbackOnMissing: "Is it okay if the site is down often? What is our uptime target?",
          },
          {
            id: "storage-efficiency",
            label: "Storage Efficiency",
            description: "Optimize storage costs for large text content.",
            weight: 2,
            required: false,
            solutions: [
              {
                text: "Use object storage for cost-effective content storage. Compress content to reduce storage costs.",
              },
            ],
            hints: [
              {
                id: "hint-storage-efficiency",
                title: "Storage Efficiency",
                text: "How should the system optimize storage costs for large amounts of text content?",
                href: "/learn/object-storage-cdn#object-storage-the-basics",
              },
            ],
            evaluationCriteria: "User mentions compression or cost-effective storage (like S3).",
            feedbackOnMissing:
              "Storing text is cheap, but storing billions of texts isn't. How do we save space/money?",
          },
          {
            id: "caching",
            label: "Caching Strategy",
            description: "Cache frequently accessed pastes.",
            weight: 2,
            required: false,
            solutions: [
              { text: "Cache popular pastes at the edge. Use CDN for global distribution." },
            ],
            hints: [
              {
                id: "hint-caching",
                title: "Caching Strategy",
                text: "Should the system cache frequently accessed pastes to improve performance?",
                href: "/learn/object-storage-cdn#cdn-caching-at-the-edge",
              },
            ],
            evaluationCriteria: "User mentions caching popular content (CDN/Redis).",
            feedbackOnMissing: "If a paste goes viral, will the database crash? Consider caching.",
          },
          {
            id: "security",
            label: "Security",
            description: "Protect against abuse and malicious content.",
            weight: 1,
            required: false,
            solutions: [
              { text: "Rate limit paste creation. Scan content for malicious patterns." },
            ],
            hints: [
              {
                id: "hint-security",
                title: "Security",
                text: "What security measures should be in place to protect against abuse and malicious content?",
                href: "/learn/rate-limiting-algorithms#why-rate-limiting-matters",
              },
            ],
            evaluationCriteria: "User mentions rate limiting or spam/malware protection.",
            feedbackOnMissing: "How do we stop a bot from creating 1 million pastes in a second?",
          },
        ],
      },
    },
    {
      stepType: "api" as const,
      order: 2,
      title: "API Design",
      description: "Design the API endpoints for the Pastebin service",
      required: true,
      data: {
        scoreWeight: 25,
        requirements: [
          {
            id: "create-paste-endpoint",
            scope: "endpoint",
            label: "Paste Creation Endpoint",
            description:
              "POST endpoint to create new pastes with documented request/response. Request body should include content, optional title, and optional expiration. Response returns 201 with { id: string, url: string, createdAt: string }. Handle errors: 400 (invalid content), 429 (rate limited).",
            weight: 11,
            required: true,
            method: "POST",
            correctPath: "/api/v1/pastes",
            solutions: [
              {
                overview: "POST endpoint to create new pastes",
                request:
                  '{ "content": "Hello World!", "title": "My Paste", "expiresAt": "2024-12-31T23:59:59Z" }',
                response: {
                  statusCode: "201",
                  text: '{ "id": "abc123", "url": "https://paste.ly/abc123", "createdAt": "2024-01-01T12:00:00Z" }',
                },
                errors: [
                  {
                    statusCode: "400",
                    text: "Invalid content or missing required fields",
                  },
                  {
                    statusCode: "429",
                    text: "Rate limit exceeded",
                  },
                ],
              },
            ],
            hints: [
              {
                id: "hint-create-paste-method",
                title: "HTTP Method",
                text: "Creating a new resource typically uses POST. What HTTP method should be used to create a new paste?",
                href: "/learn/system-design-structure#api-design",
              },
              {
                id: "hint-create-paste-path",
                title: "Endpoint Path",
                text: "The path should be a RESTful endpoint for creating pastes. Consider something like /api/v1/pastes.",
                href: "/learn/system-design-structure#api-design",
              },
              {
                id: "hint-create-paste-description",
                title: "API Request/Response",
                text: "What fields should the request body contain (content, title, expiresAt)? What does a successful response look like (id, url)? What errors can occur (400, 429)?",
                href: "/learn/system-design-structure#api-design",
              },
            ],
            evaluationCriteria:
              "Endpoint description must include: " +
              "1) Request body format (accepts content, with optional title and expiration), " +
              "2) Response format (returns the paste ID and URL), " +
              "3) Success status code (201 Created), " +
              "4) At least one error case (e.g., 400 Invalid content, 429 Rate limit).",
            feedbackOnMissing: "What endpoint do we call to actually upload the text?",
          },
          {
            id: "get-paste-endpoint",
            scope: "endpoint",
            label: "Paste Retrieval Endpoint",
            description:
              "GET endpoint to retrieve paste content with documented request/response. Request should include the paste ID (in path parameter). Response returns 200 with { id, content, title, createdAt }. Handle errors: 404 (not found), 410 (expired).",
            weight: 11,
            required: true,
            method: "GET",
            correctPath: "/api/v1/pastes/:id",
            solutions: [
              {
                overview: "GET endpoint to retrieve paste content by ID",
                request: "GET /api/v1/pastes/:id (e.g., /api/v1/pastes/abc123)",
                response: {
                  statusCode: "200",
                  text: '{ "id": "abc123", "content": "Hello World!", "title": "My Paste", "createdAt": "2024-01-01T12:00:00Z" }',
                },
                errors: [
                  {
                    statusCode: "404",
                    text: "Paste not found",
                  },
                  {
                    statusCode: "410",
                    text: "Paste has expired",
                  },
                ],
              },
            ],
            hints: [
              {
                id: "hint-get-paste-method",
                title: "HTTP Method",
                text: "Retrieving content is a read operation. What HTTP method should be used to fetch a paste?",
                href: "/learn/system-design-structure#api-design",
              },
              {
                id: "hint-get-paste-path",
                title: "Endpoint Path",
                text: "The path should identify which paste to retrieve. Consider /api/v1/pastes/:id to target a specific paste.",
                href: "/learn/system-design-structure#api-design",
              },
              {
                id: "hint-get-paste-description",
                title: "API Request/Response",
                text: "What data should be returned when retrieving a paste (id, content, title, createdAt)? What errors can occur (404, 410)?",
                href: "/learn/system-design-structure#api-design",
              },
            ],
            evaluationCriteria:
              "Endpoint description must include: " +
              "1) Takes the paste ID as a path parameter, " +
              "2) Returns the paste content and metadata, " +
              "3) Success status code (200), " +
              "4) Error cases (e.g., 404 Not Found, 410 Expired).",
            feedbackOnMissing: "What endpoint allows reading the content of a specific paste?",
          },
          {
            id: "raw-endpoint",
            scope: "endpoint",
            label: "Raw Content Endpoint",
            description:
              "GET endpoint for raw text content with documented request/response. Request should include the paste ID (in path parameter). Response returns 200 with plain text content. Handle errors: 404 (not found), 410 (expired).",
            weight: 2,
            required: false,
            method: "GET",
            correctPath: "/raw/:id",
            solutions: [
              {
                overview: "GET endpoint for raw text content (CLI-friendly)",
                request: "GET /raw/:id (e.g., /raw/abc123)",
                response: {
                  statusCode: "200",
                  text: "Plain text content (Content-Type: text/plain)",
                },
                errors: [
                  {
                    statusCode: "404",
                    text: "Paste not found",
                  },
                  {
                    statusCode: "410",
                    text: "Paste has expired",
                  },
                ],
              },
            ],
            hints: [
              {
                id: "hint-raw-method",
                title: "HTTP Method",
                text: "Retrieving raw text is a read operation. What HTTP method should be used?",
                href: "/learn/system-design-structure#api-design",
              },
              {
                id: "hint-raw-path",
                title: "Endpoint Path",
                text: "The path should be simple for CLI tools. Consider /raw/:id at the root level.",
                href: "/learn/system-design-structure#api-design",
              },
              {
                id: "hint-raw-description",
                title: "Raw Text Response",
                text: "Explain that this endpoint returns plain text content (not JSON) for easy CLI access.",
                href: "/learn/system-design-structure#api-design",
              },
            ],
            evaluationCriteria:
              "Endpoint description must include: " +
              "1) Takes the paste ID as a path parameter, " +
              "2) Returns plain text content (not JSON), " +
              "3) Success status code (200) with text/plain content type, " +
              "4) Error cases (e.g., 404 Not Found, 410 Expired).",
            feedbackOnMissing:
              "Do we have a simple URL that just returns the text (for curl/wget)?",
          },
          {
            id: "delete-endpoint",
            scope: "endpoint",
            label: "Delete Endpoint",
            description:
              "DELETE endpoint to remove pastes with documented request/response. Request should include the paste ID (in path parameter). Response returns 204. Handle errors: 404 (not found).",
            weight: 1,
            required: false,
            method: "DELETE",
            correctPath: "/api/v1/pastes/:id",
            solutions: [
              {
                overview: "DELETE endpoint to remove a paste",
                request: "DELETE /api/v1/pastes/:id (e.g., /api/v1/pastes/abc123)",
                response: {
                  statusCode: "204",
                  text: "No content (paste deleted successfully)",
                },
                errors: [
                  {
                    statusCode: "404",
                    text: "Paste not found",
                  },
                  {
                    statusCode: "403",
                    text: "Not authorized to delete this paste",
                  },
                ],
              },
            ],
            hints: [
              {
                id: "hint-delete-method",
                title: "HTTP Method",
                text: "Removing a resource uses DELETE. What HTTP method should be used to delete a paste?",
                href: "/learn/system-design-structure#api-design",
              },
              {
                id: "hint-delete-path",
                title: "Endpoint Path",
                text: "The path should identify which paste to delete. Consider /api/v1/pastes/:id to target a specific paste.",
                href: "/learn/system-design-structure#api-design",
              },
              {
                id: "hint-delete-description",
                title: "Delete Response Format",
                text: "Explain that the id identifies the paste to delete, the response is 204 No Content on success, and 404 if not found.",
                href: "/learn/system-design-structure#api-design",
              },
            ],
            evaluationCriteria:
              "Endpoint description must include: " +
              "1) Takes the paste ID as a path parameter, " +
              "2) Returns no content on success, " +
              "3) Success status code (204 No Content), " +
              "4) Error cases (e.g., 404 Not Found, 403 Forbidden).",
            feedbackOnMissing: "How can a user delete a paste they own?",
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
        scoreWeight: 35,
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
              { id: "Service-1", type: "paste-service", name: "Paste Service", icon: "service" },
              { id: "Store-1", type: "object-storage", name: "Object Storage", icon: "bucket" },
              { id: "CDN-1", type: "cdn", name: "CDN", icon: "cdn" },
              { id: "DB-1", type: "metadata-database", name: "SQL Database", icon: "sql" },
            ],
            edges: [
              {
                id: "Client-1-API-Gateway-1",
                from: "Client-1",
                to: "API-Gateway-1",
                description: "API Gateway will route all requests to the appropriate service",
                weight: 7,
                hints: [
                  {
                    id: "hint-client-gateway",
                    title: "Client to API Gateway",
                    text: "Client must connect to API Gateway to send requests",
                    href: "/learn/scaling#api-gateway-load-balancer-the-traffic-cop",
                  },
                ],
              },
              {
                id: "API-Gateway-1-Service-1",
                from: "API-Gateway-1",
                to: "Service-1",
                description: "API Gateway routes requests to the paste service",
                weight: 7,
                hints: [
                  {
                    id: "hint-gateway-service",
                    title: "API Gateway to Service",
                    text: "API Gateway routes requests to the paste service",
                    href: "/learn/scaling#api-gateway-load-balancer-the-traffic-cop",
                  },
                ],
              },
              {
                id: "Service-1-Store-1",
                from: "Service-1",
                to: "Store-1",
                description:
                  "Service stores and retrieves paste content in object storage for cost-effective blob storage",
                weight: 7,
                hints: [
                  {
                    id: "hint-service-s3",
                    title: "Service to Object Store",
                    text: "Service needs to store paste content in object storage for cost-effective blob storage",
                    href: "/learn/object-storage-cdn#write-path-creating-a-paste",
                  },
                ],
              },
              {
                id: "Store-1-CDN-1",
                from: "Store-1",
                to: "CDN-1",
                description:
                  "CDN caches popular pastes at edge locations. On cache miss, CDN fetches content from object storage.",
                weight: 4,
                hints: [
                  {
                    id: "hint-s3-cdn",
                    title: "Object Store to CDN",
                    text: "CDN pulls content from object storage on cache miss and caches it at edge locations for subsequent requests.",
                    href: "/learn/object-storage-cdn#cdn-caching-at-the-edge",
                  },
                ],
              },
              {
                id: "Service-1-CDN-1",
                from: "Service-1",
                to: "CDN-1",
                description:
                  "Service constructs CDN URLs for read requests, directing clients to fetch cached content from edge locations.",
                weight: 5,
                hints: [
                  {
                    id: "hint-service-cdn",
                    title: "Service to CDN",
                    text: "On reads, the service returns CDN URLs so clients fetch cached content from edge locations instead of hitting object storage directly.",
                    href: "/learn/object-storage-cdn#cdn-caching-at-the-edge",
                  },
                ],
              },
              {
                id: "Service-1-DB-1",
                from: "Service-1",
                to: "DB-1",
                description:
                  "Service stores paste metadata (IDs, expiration, ownership) in database for efficient queries",
                weight: 5,
                hints: [
                  {
                    id: "hint-service-db",
                    title: "Service to Database",
                    text: "Service stores paste metadata (IDs, expiration, ownership) in database for efficient queries",
                    href: "/learn/database-caching#sql-vs-nosql-the-real-differences",
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
