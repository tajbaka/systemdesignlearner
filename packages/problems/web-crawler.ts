import { buildLinks } from "./article-links";

export const WEB_CRAWLER_PROBLEM = {
  slug: "design-web-crawler",
  category: "backend" as const,
  version: {
    versionNumber: 1,
    title: "Design a Distributed Web Crawler",
    description:
      "Design a distributed system that crawls billions of web pages efficiently, deduplicates URLs, and respects politeness policies.",
    difficulty: "hard" as const,
    timeToComplete: "60 min",
    topic: "System Design",
    links: buildLinks(["graph-traversal", "bloom-filters", "dns", "system-design-structure"]),
    isCurrent: true,
  },
  steps: [
    {
      stepType: "functional" as const,
      order: 0,
      title: "Functional Requirements",
      description: "Define the core capabilities of the Distributed Web Crawler",
      required: true,
      data: {
        scoreWeight: 30,
        requirements: [
          {
            id: "bfs-crawling",
            label: "BFS-Based Web Crawling",
            description:
              "Starting from seed URLs, discover and fetch web pages by following hyperlinks using breadth-first search.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Use BFS to traverse the web graph layer by layer. Maintain a URL frontier (distributed queue) where newly discovered URLs are enqueued. Workers dequeue URLs, fetch pages, extract links, and add new URLs back to the frontier.",
              },
            ],
            hints: [
              {
                id: "hint-bfs",
                title: "Graph Traversal Strategy",
                text: "The web is a directed graph. Pages are nodes, links are edges. What traversal algorithm discovers important pages first and naturally spreads across domains?",
                href: "/learn/graph-traversal",
              },
            ],
            evaluationCriteria:
              "User describes BFS-based traversal with a frontier queue and identifies the web as a directed graph.",
            feedbackOnMissing:
              "How do you decide which page to crawl next? What data structure holds the URLs waiting to be crawled?",
          },
          {
            id: "url-dedup",
            label: "URL Deduplication",
            description:
              "Ensure the same URL is never crawled twice. Use a space-efficient data structure to track billions of seen URLs.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Use a Bloom filter to track all seen URLs. Before adding a URL to the frontier, check the filter. No false negatives guarantees no missed URLs. 10B URLs at 1% FP rate needs ~12 GB vs ~1 TB for a hash set.",
              },
            ],
            hints: [
              {
                id: "hint-bloom",
                title: "Memory-Efficient Dedup",
                text: "Storing 10 billion URLs in a HashSet needs ~1 TB of RAM. What probabilistic data structure can check 'have I seen this?' using a fraction of that memory?",
                href: "/learn/bloom-filters",
              },
            ],
            evaluationCriteria:
              "User identifies the memory problem with hash sets at scale and proposes Bloom filters or a similar probabilistic solution.",
            feedbackOnMissing:
              "The web has billions of pages. How do you efficiently check if a URL has already been crawled without using terabytes of memory?",
          },
          {
            id: "html-parsing",
            label: "HTML Parsing & Link Extraction",
            description:
              "Parse fetched pages to extract hyperlinks, normalize URLs, and feed newly discovered URLs back into the frontier.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "After fetching a page, parse HTML to extract all <a href> links. Normalize URLs (lowercase, remove fragments, resolve relative paths). Check each against the Bloom filter before enqueuing. Store content and metadata for indexing.",
              },
            ],
            hints: [
              {
                id: "hint-parsing",
                title: "Closing the Loop",
                text: "You fetched a page. Now what? How do the links on this page get added to your crawl queue? What about malformed or relative URLs?",
                href: "/learn/system-design-structure",
              },
            ],
            evaluationCriteria:
              "User describes the parse-extract-normalize-enqueue cycle that closes the BFS loop.",
            feedbackOnMissing:
              "Fetching a page is only half the work. How do you discover new URLs from the page you just fetched?",
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
            id: "scalability",
            label: "Horizontal Scalability",
            description:
              "The crawler must scale to billions of pages by adding more worker machines and distributing the frontier, Bloom filter, and DNS resolver.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Stateless fetcher workers scale horizontally. URL frontier is a distributed message queue (Kafka). Bloom filter is partitioned by URL hash. DNS resolver is sharded by domain.",
              },
            ],
            hints: [
              {
                id: "hint-scale",
                title: "Billions of Pages",
                text: "A single machine can fetch ~1,000 pages/second. The web has hundreds of billions of pages. How do you parallelize the crawl across hundreds of machines?",
                href: "/learn/microservices",
              },
            ],
            evaluationCriteria:
              "User identifies stateless workers, distributed frontier, and horizontal scaling strategy.",
            feedbackOnMissing:
              "One machine can't crawl the web. How do you distribute the work across many machines?",
          },
          {
            id: "politeness",
            label: "Politeness & Rate Limiting",
            description:
              "Never overwhelm a single domain. Enforce per-domain rate limits and respect robots.txt.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Per-domain back queues with rate limiting (1 req/sec per domain). Fetch and cache robots.txt before crawling any domain. Respect Crawl-delay directives.",
              },
            ],
            hints: [
              {
                id: "hint-politeness",
                title: "Don't DDoS the Web",
                text: "If your crawler sends 100 requests per second to one small blog, you'll crash their server and get banned. How do you limit requests per domain?",
                href: "/learn/rate-limiting-algorithms",
              },
            ],
            evaluationCriteria: "User mentions per-domain rate limiting and robots.txt compliance.",
            feedbackOnMissing:
              "An aggressive crawler is indistinguishable from a DDoS attack. How do you ensure politeness to each domain?",
          },
        ],
      },
    },
    {
      stepType: "api" as const,
      order: 2,
      title: "API Design",
      description: "Design the API Interface for managing crawl jobs",
      required: true,
      data: {
        scoreWeight: 20,
        requirements: [
          {
            id: "submit-crawl",
            scope: "endpoint",
            label: "Submit Crawl Job",
            description:
              "Endpoint to start a new crawl job with seed URLs and configuration parameters.",
            weight: 10,
            required: true,
            method: "POST",
            correctPath: "/api/v1/crawl-jobs",
            solutions: [
              {
                text: "POST /crawl-jobs. Body: { seedUrls, maxPages, maxDepth, politenessDelay }. Returns: jobId and status.",
              },
            ],
            hints: [
              {
                id: "hint-seed",
                title: "Starting Points",
                text: "A crawl starts from seed URLs. What parameters control the scope and behavior of the crawl?",
                href: "/learn/system-design-structure",
              },
            ],
            evaluationCriteria:
              "User defines an endpoint to initiate a crawl with seed URLs and constraints.",
            feedbackOnMissing: "How does someone start a crawl? What configuration is needed?",
          },
          {
            id: "crawl-status",
            scope: "endpoint",
            label: "Check Crawl Status",
            description: "Endpoint to check the progress of a running crawl job.",
            weight: 10,
            required: true,
            method: "GET",
            correctPath: "/api/v1/crawl-jobs/{jobId}",
            solutions: [
              {
                text: "GET /crawl-jobs/{jobId}. Returns: status, pagesCrawled, pagesQueued, pagesPerSecond, errors.",
              },
            ],
            hints: [
              {
                id: "hint-status",
                title: "Observability",
                text: "A crawl of 1 billion pages takes days. How does the operator monitor progress and detect issues?",
                href: "/learn/system-design-structure",
              },
            ],
            evaluationCriteria:
              "User defines an endpoint to monitor crawl progress with meaningful metrics.",
            feedbackOnMissing:
              "The crawl runs for days. How do you know how far along it is or if something went wrong?",
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
              { id: "Frontier", type: "Queue", label: "URL Frontier" },
              { id: "Fetcher", type: "Service", label: "HTML Fetcher Workers" },
              { id: "DNS", type: "Cache", label: "Custom DNS Resolver" },
              { id: "Parser", type: "Service", label: "Extractor / Parser" },
              { id: "BloomFilter", type: "Cache", label: "Bloom Filter" },
              { id: "Storage", type: "Database", label: "Blob Storage + DB" },
            ],
            edges: [
              {
                id: "Frontier-Fetcher",
                from: "Frontier",
                to: "Fetcher",
                description:
                  "Workers dequeue URLs from the frontier. The frontier enforces per-domain rate limits via back queues.",
                weight: 5,
                hints: [
                  {
                    id: "hint-frontier-fetch",
                    title: "Work Distribution",
                    text: "The frontier is a distributed queue. Workers pull URLs and fetch pages in parallel.",
                    href: "/learn/message-queues",
                  },
                ],
              },
              {
                id: "Fetcher-DNS",
                from: "Fetcher",
                to: "DNS",
                description:
                  "Before making an HTTP request, the fetcher resolves the domain name to an IP address via the custom DNS resolver.",
                weight: 5,
                hints: [
                  {
                    id: "hint-dns-resolve",
                    title: "DNS Resolution",
                    text: "Every HTTP request starts with a DNS lookup. A custom resolver with caching eliminates this bottleneck.",
                    href: "/learn/dns",
                  },
                ],
              },
              {
                id: "Fetcher-Parser",
                from: "Fetcher",
                to: "Parser",
                description:
                  "After fetching a page, the raw HTML is passed to the parser for link extraction and content processing.",
                weight: 5,
                hints: [
                  {
                    id: "hint-parse",
                    title: "Separating Concerns",
                    text: "Fetching is I/O-bound. Parsing is CPU-bound. Separating them lets you scale each independently.",
                    href: "/learn/microservices",
                  },
                ],
              },
              {
                id: "Parser-Bloom",
                from: "Parser",
                to: "BloomFilter",
                description:
                  "Each extracted URL is checked against the Bloom filter. Only unseen URLs are added to the frontier.",
                weight: 5,
                hints: [
                  {
                    id: "hint-bloom-check",
                    title: "Deduplication Gate",
                    text: "The Bloom filter is the gatekeeper. It prevents billions of duplicate URLs from flooding the frontier.",
                    href: "/learn/bloom-filters",
                  },
                ],
              },
              {
                id: "Parser-Frontier",
                from: "Parser",
                to: "Frontier",
                description:
                  "New (unseen) URLs extracted from pages are enqueued back into the frontier, closing the BFS loop.",
                weight: 5,
                hints: [
                  {
                    id: "hint-bfs-loop",
                    title: "The BFS Loop",
                    text: "This edge closes the crawl loop: fetch → parse → discover → enqueue → fetch again.",
                    href: "/learn/graph-traversal",
                  },
                ],
              },
              {
                id: "Parser-Storage",
                from: "Parser",
                to: "Storage",
                description:
                  "Parsed content and metadata are stored in blob storage (raw HTML) and a database (URL, title, timestamp).",
                weight: 5,
                hints: [
                  {
                    id: "hint-storage",
                    title: "Persisting Results",
                    text: "Raw HTML goes to object storage. Metadata goes to a database. Downstream systems read from here.",
                    href: "/learn/storage-types",
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
