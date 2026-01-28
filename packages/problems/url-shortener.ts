export const URL_SHORTENER_PROBLEM = {
  slug: "url-shortener",
  category: "backend" as const,
  version: {
    versionNumber: 1,
    title: "URL Shortener",
    description:
      "Design a scalable URL shortening service like TinyURL or Bitly that creates short, unique links and redirects users to original URLs",
    difficulty: "medium" as const,
    timeToComplete: "45 min",
    topic: "System Design",
    links: [
      { label: "System Design Structure", href: "/learn/system-design-structure" },
      { label: "Databases & Caching", href: "/learn/database-caching" },
      { label: "CAP Theorem", href: "/learn/cap-theorem" },
      { label: "Scaling: Vertical vs Horizontal", href: "/learn/scaling" },
    ],
    isCurrent: true,
  },
  steps: [
    {
      stepType: "functional" as const,
      order: 0,
      title: "Functional Requirements",
      description: "Define what the URL shortener must do",
      required: true,
      data: {
        scoreWeight: 60,
        requirements: [
          {
            id: "url-shortening",
            label: "URL Shortening",
            description:
              "Accept a long URL and return a short, Users should be able to submit a long URL and receive a shortened version.",
            weight: 20,
            required: true,
            solutions: [
              {
                text: "The Url Shortener maps a long URL to a short URL, The url shortener should redirect the user to the original long URL when the short URL is accessed.",
              },
            ],
            hints: [
              {
                id: "hint-url-shortening",
                title: "System Design Functional Requirements",
                text: "Think about how bitly works, what is the core functionality of this site?",
                href: "/learn/system-design-structure#functional-requirements",
              },
            ],
            evaluationCriteria:
              "User must describe the ability to input a long URL and receive a shortened URL in return.",
            feedbackOnMissing:
              "Think about how bitly works, what is the core functionality of this site?",
          },
          {
            id: "redirection",
            label: "URL Redirection",
            description: "Resolve a short URL and redirect the client to the original long URL.",
            weight: 20,
            required: true,
            solutions: [{ text: "Opening the short URL takes the user to the long URL." }],
            hints: [
              {
                id: "hint-redirection",
                title: "System Design Functional Requirements",
                text: "Think about the user experience: what happens technically when someone clicks on the shortened link?",
                href: "/learn/system-design-structure#functional-requirements",
              },
            ],
            evaluationCriteria:
              "User must mention that accessing the short URL redirects or resolves to the original long URL.",
            feedbackOnMissing:
              "Think about the user experience: what happens technically when someone clicks on the shortened link?",
          },
          {
            id: "uniqueness",
            label: "Uniqueness Guarantee",
            description: "Each short URL is unique and maps to exactly one long URL.",
            weight: 20,
            required: true,
            solutions: [{ text: "Every short URL that gets generated is unique." }],
            hints: [
              {
                id: "hint-uniqueness",
                title: "System Design Functional Requirements",
                text: "How do we prevent two different long URLs from getting the exact same short code?",
                href: "/learn/system-design-structure#functional-requirements",
              },
            ],
            evaluationCriteria:
              "User must specify that every generated short code is unique to avoid collisions.",
            feedbackOnMissing:
              "How do we prevent two different long URLs from getting the exact same short code?",
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
            id: "latency",
            label: "Performance and Latency",
            description:
              "Redirects should be really fast, low latency is critical for user experience.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "We want to prioritize low latency on the redirect going for under a 100ms for the redirect service.",
              },
            ],
            hints: [
              {
                id: "hint-latency",
                title: "Performance and Latency",
                text: "Consider the speed of the redirect. Does this need to be fast? How fast should the system respond to ensure a good user experience?",
                href: "/learn/system-design-structure#non-functional-requirements",
              },
            ],
            evaluationCriteria:
              "User mentions having low latency because the redirect service needs to be fast. They mention a latency target for the redirect service of 100ms or less.",
            feedbackOnMissing:
              "Consider the speed of the redirect. Does this need to be fast? How fast should the system respond to ensure a good user experience?",
          },
          {
            id: "availability",
            label: "Availability vs consistency",
            description:
              "Redirect Service should be highly available with no single points of failure.",
            weight: 5,
            required: true,
            solutions: [
              {
                text: "The system needs to be available 99.99% of the time. We can sacrifice consistency for availability here.",
              },
            ],
            hints: [
              {
                id: "hint-availability",
                title: "Cap Theorem - Availability vs Consistency",
                text: "If the system goes down, links stop working. Is it more important to always be up (Availability) or to always have the latest data immediately (Consistency)? How available should the system be?",
                href: "/learn/cap-theorem",
              },
            ],
            evaluationCriteria:
              "User emphasizes high availability and prioritizes it over strict consistency. User mentiones having an availability target of 99.9% or higher.",
            feedbackOnMissing:
              "If the system goes down, links stop working. Is it more important to always be up (Availability) or to always have the latest data immediately (Consistency)? How available should the system be?",
          },
          {
            id: "scalability",
            label: "Scalability and Throughput",
            description: "We can expect there to be a lot more reads than writes.",
            weight: 5,
            required: true,
            solutions: [
              {
                text: "Support about 1B reads per day vs 10 million writes, this is because more urls will be redirected than created.",
              },
            ],
            hints: [
              {
                id: "hint-scalability",
                title: "Scaling: Vertical vs Horizontal",
                text: "How many people will use this? What's the ratio of people creating links versus people clicking on them?",
                href: "/learn/scaling",
              },
            ],
            evaluationCriteria:
              "User specifies scale expectations, and mentions having a higher read to write ratio. They need to mention that reads are at least 5 times more than the writes. They need to mention that the system will require at least 100 million redirects/day",
            feedbackOnMissing:
              "How many people will use this? What's the ratio of people creating links versus people clicking on them?",
          },
        ],
      },
    },
    {
      stepType: "api" as const,
      order: 2,
      title: "API Design",
      description: "Design the API endpoints for the URL shortener",
      required: true,
      data: {
        scoreWeight: 50,
        requirements: [
          {
            id: "create-url-endpoint",
            scope: "endpoint",
            label: "URL Creation Endpoint",
            description: "POST endpoint to create shortened URLs with documented request/response.",
            weight: 25,
            required: true,
            method: "POST",
            correctPath: "/api/v1/urls",
            solutions: [
              {
                overview: "This endpoint is used to create shortened URLs",
                request: "{ url: string }",
                response: {
                  statusCode: "201",
                  text: "{ shortUrl: string }",
                },
                errors: [
                  {
                    statusCode: "400",
                    text: "Invalid URL format",
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
                id: "hint-redirect-missing",
                title: "System API Design",
                text: "Endpoint is missing, how do we create a new shortened URL?",
              },
              {
                id: "hint-create-url-method",
                title: "System API Design",
                text: "Creating a new resource typically uses POST. What HTTP method should be used to create a new shortened URL?",
                href: "/learn/system-design-structure#api-design",
              },
              {
                id: "hint-create-url-path",
                title: "System API Design",
                text: "The path should be a RESTful endpoint for creating URLs. Consider something like /api/v1/urls.",
                href: "/learn/system-design-structure#api-design",
              },
              {
                id: "hint-create-url-overview",
                title: "System API Design",
                text: "What is this endpoint used for?",
                href: "/learn/system-design-structure#api-design",
              },
              {
                id: "hint-create-url-description",
                title: "System API Design",
                text: "What should the request body contain? What does a successful response look like? Including HTTP status codes.",
                href: "/learn/system-design-structure#api-design",
              },
              {
                id: "hint-create-url-error-codes",
                title: "System API Design",
                text: "What HTTP status codes should be used for the errors in this endpoint?",
                href: "/learn/system-design-structure#api-design",
              },
            ],
            evaluationCriteria:
              "Endpoint description must include: " +
              "1) Request body format (e.g., accepts a long URL), " +
              "2) Response format (e.g., returns a shortened URL), " +
              "3) Success status code (e.g., 201 Created), " +
              "4) At least one error case (e.g., 400 Invalid URL, 429 Rate limit).",
            feedbackOnMissing:
              "Consider the complete API contract: What HTTP method? What's the request format? What does a successful response include? What error codes handle invalid URLs (400) or rate limits (409)?",
          },
          {
            id: "redirect-endpoint",
            scope: "endpoint",
            label: "Redirect Endpoint",
            description: "GET endpoint to redirect short URLs with documented request/response.",
            weight: 25,
            required: true,
            method: "GET",
            correctPath: "/:slug",
            solutions: [
              {
                overview: "GET endpoint to redirect short URLs to their original long URLs",
                request: "GET /:slug",
                response: {
                  statusCode: "301 or 302",
                  text: "Redirect to original long URL",
                },
                errors: [
                  {
                    statusCode: "404",
                    text: "Short URL not found",
                  },
                  {
                    statusCode: "410",
                    text: "Short URL expired or deleted",
                  },
                ],
              },
            ],
            hints: [
              {
                id: "hint-redirect-missing",
                title: "System API Design",
                text: "Endpoint is missing, how do we redirect a user to the original long URL?",
              },
              {
                id: "hint-redirect-method",
                title: "System API Design",
                text: "Redirecting a user is a retrieval operation. What HTTP method should be used?",
                href: "/learn/system-design-structure#api-design",
              },
              {
                id: "hint-redirect-path",
                title: "System API Design",
                text: "The path should capture the short code. What should the path be?",
                href: "/learn/system-design-structure#api-design",
              },
              {
                id: "hint-redirect-overview",
                title: "System API Design",
                text: "What is this endpoint used for?",
                href: "/learn/system-design-structure#api-design",
              },
              {
                id: "hint-redirect-description",
                title: "System API Design",
                text: "What happens when the short URL is accessed? What redirect status code should be used?",
                href: "/learn/system-design-structure#api-design",
              },
              {
                id: "hint-redirect-error-codes",
                title: "System API Design",
                text: "What error codes should be used for the errors in this endpoint?",
                href: "/learn/system-design-structure#api-design",
              },
            ],
            evaluationCriteria:
              "Endpoint description must include: " +
              "1) Takes a slug/short code as a path parameter, " +
              "2) Redirects to the original URL, " +
              "3) Redirect status code (301 or 302), " +
              "4) Error cases (e.g., 404 Not Found, 410 Expired).",
            feedbackOnMissing:
              "What is this endpoint used for? Consider the complete redirect flow: What HTTP method? How is the short code captured in the path? What redirect status code? What errors can occur?",
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
              { id: "Service-1", type: "read-service", name: "Read Service", icon: "service" },
              { id: "Service-2", type: "write-service", name: "Write Service", icon: "service" },
              { id: "DB-1", type: "main-database", name: "SQL Database", icon: "sql" },
              { id: "Cache-1", type: "cache", name: "Cache", icon: "cache" },
              {
                id: "Service-3",
                type: "background-service",
                name: "Background Service",
                icon: "service",
              },
              {
                id: "DB-2",
                type: "pre-generated-database",
                name: "Pre-Generated URL Database",
                icon: "sql",
              },
            ],
            edges: [
              {
                id: "Client-1-API-Gateway-1",
                from: "Client-1",
                to: "API-Gateway-1",
                description:
                  "API Gateway is helpful in routing the correct request to the right service",
                weight: 4,
                hints: [
                  {
                    id: "hint-client-gateway",
                    title: "Client to API Gateway",
                    text: "API Gateway is helpful in routing the correct request to the right service",
                  },
                ],
              },
              {
                id: "API-Gateway-1-Service-2",
                from: "API-Gateway-1",
                to: "Service-2",
                description: "API Gateway routes post requests to the shortening service",
                weight: 4,
                hints: [
                  {
                    id: "hint-gateway-write-service",
                    title: "API Gateway to Write Service",
                    text: "API Gateway routes post requests to the shortening service",
                  },
                ],
              },
              {
                id: "Service-2-DB-1",
                from: "Service-2",
                to: "DB-1",
                description: "Shortening service creates the URL mapping in the database",
                weight: 4,
                hints: [
                  {
                    id: "hint-write-service-db",
                    title: "Databases & Caching",
                    text: "Shortening service creates the URL mapping in the database",
                    href: "/learn/database-caching",
                  },
                ],
              },
              {
                id: "API-Gateway-1-Service-1",
                from: "API-Gateway-1",
                to: "Service-1",
                description: "API Gateway routes get requests to the redirect service",
                weight: 5,
                hints: [
                  {
                    id: "hint-gateway-shortening-service",
                    title: "API Gateway to Read Service",
                    text: "API Gateway routes get requests to the redirect service",
                  },
                ],
              },
              {
                id: "Service-1-Cache-1",
                from: "Service-1",
                to: "Cache-1",
                description:
                  "Using a LRU cache with your redirect service avoids DB load and reduces latency for popular URLs",
                weight: 5,
                hints: [
                  {
                    id: "hint-service-cache",
                    title: "Databases & Caching",
                    text: "Using a LRU cache with your redirect service avoids DB load and reduces latency for popular URLs",
                    href: "/learn/database-caching",
                  },
                ],
              },
              {
                id: "Service-1-DB-1",
                from: "Service-1",
                to: "DB-1",
                description:
                  "Redirect service needs to query the the database when a cache miss occurs",
                weight: 5,
                hints: [
                  {
                    id: "hint-service-db",
                    title: "Databases & Caching",
                    text: "Redirect service needs to query the the database when a cache miss occurs",
                    href: "/learn/database-caching",
                  },
                ],
              },
              {
                id: "Service-3-DB-2",
                from: "Service-3",
                to: "DB-2",
                description:
                  "Background service pulls available urls from the pre-generated database",
                weight: 4,
                hints: [
                  {
                    id: "hint-background-service-db-2",
                    title: "Background Service to Pre-Generated Database",
                    text: "Background service pulls available urls from the pre-generated database",
                  },
                ],
              },
              {
                id: "Service-3-DB-1",
                from: "Service-3",
                to: "DB-1",
                description:
                  "Background service needs to check the main database for how many urls are left to use. If low it will write more urls to the main database.",
                weight: 4,
                hints: [
                  {
                    id: "hint-background-service-db-1",
                    text: "Background service needs to check the main database for how many urls are left to use. If low it will write more urls to the main database.",
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
