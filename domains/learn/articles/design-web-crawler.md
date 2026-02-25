## Introduction

The interviewer says: "Design a web crawler."

You think, "Just fetch pages and follow links." Then they follow up: "How do you crawl 1 billion pages without re-visiting the same URL twice? How do you respect rate limits across 100 million domains? What happens when DNS resolution becomes a bottleneck?"

And now you realize this isn't about HTTP requests. It's about [graph traversal](/learn/graph-traversal), [Bloom filters](/learn/bloom-filters) for URL deduplication, [DNS resolution](/learn/dns) at scale, and distributed work coordination. A web crawler combines breadth-first search over the internet's link graph with politeness policies, priority scheduling, and fault-tolerant distributed workers.

Here's how to design a distributed web crawler that's fast, polite, and scales to billions of pages.

---

## Functional Requirements

**1. Crawl web pages via BFS**

- Starting from a set of seed URLs, the crawler discovers and fetches web pages by following hyperlinks
- Uses [breadth-first search](/learn/graph-traversal) to explore the web graph layer by layer, prioritizing pages closer to seed URLs
- The URL frontier (crawl queue) holds discovered but not-yet-fetched URLs
- Multiple distributed workers dequeue URLs and fetch pages in parallel
- Extracted links are normalized and added back to the frontier for future crawling

**2. URL deduplication**

- Before adding a URL to the frontier, check if it has already been crawled or is already in the queue
- Uses a [Bloom filter](/learn/bloom-filters) for space-efficient membership testing -- 10 billion URLs can be tracked in ~12 GB of memory instead of ~1 TB in a hash set
- URL normalization removes fragments, resolves relative paths, lowercases the hostname, and sorts query parameters to prevent duplicate entries for the same page
- Occasional false positives (skipping an uncrawled URL) are acceptable; false negatives (re-crawling the same URL) are not

**3. HTML parsing and link extraction**

- After fetching a page, parse the HTML to extract all hyperlinks (`<a href>` tags)
- Also extract metadata: page title, content type, language, robots meta tags
- Store the raw HTML content and extracted metadata for downstream indexing
- Respect `robots.txt` rules and `<meta name="robots">` directives

That's the core. A web crawler answers: "What page should I fetch next?", "Have I already fetched this?", and "What new URLs did this page reveal?"

---

## Non-Functional Requirements

**Scalability**

- The system must scale to crawl billions of pages across hundreds of millions of domains
- Horizontal scaling: add more worker machines to increase crawl throughput
- The URL frontier, DNS resolver, and Bloom filter must all support distributed operation
- Target throughput: thousands of pages per second per worker, millions of pages per second across the fleet

**Politeness**

- Never overwhelm a single web server with too many concurrent requests
- Enforce per-domain rate limits: at most 1 request per second to any single domain (configurable)
- Respect `robots.txt` crawl-delay directives
- Distribute requests across domains so no single server bears disproportionate load
- See [rate limiting algorithms](/learn/rate-limiting-algorithms) for enforcement strategies

---

## API Design

**Submit a crawl job**

```
POST /api/v1/crawl-jobs

Request Body:
{
  "seedUrls": [
    "https://en.wikipedia.org",
    "https://www.bbc.com",
    "https://github.com"
  ],
  "maxPages": 1000000,
  "maxDepth": 15,
  "allowedDomains": [],
  "politenessDelay": 1000
}

Response:
{
  "jobId": "job-7f2a",
  "status": "running",
  "createdAt": "2026-03-20T10:00:00Z"
}

Status: 201 Created
```

The caller specifies seed URLs and constraints. `maxDepth` limits how far from the seeds the crawler goes. `allowedDomains` (empty = all domains) restricts the crawl scope. `politenessDelay` sets the minimum milliseconds between requests to the same domain.

**Check crawl job status**

```
GET /api/v1/crawl-jobs/{jobId}

Response:
{
  "jobId": "job-7f2a",
  "status": "running",
  "pagesCrawled": 487293,
  "pagesQueued": 2341876,
  "pagesPerSecond": 5200,
  "startedAt": "2026-03-20T10:00:00Z",
  "errors": 1247
}

Status: 200 OK
```

**Key fields:**

- `jobId`: Unique identifier for the crawl job
- `seedUrls`: Starting points for the BFS traversal
- `maxPages`: Hard cap on total pages to crawl (budget control)
- `maxDepth`: Maximum link depth from seed URLs
- `politenessDelay`: Minimum delay between requests to the same domain in milliseconds
- `pagesCrawled`: Running count of successfully fetched pages
- `pagesQueued`: URLs discovered but not yet fetched (frontier size)

---

## High Level Design

Here's the overall architecture:

![Web Crawler High-level Design](diagram:web-crawler)

### Key Components

**1. URL Frontier**

- A distributed priority queue holding URLs to be crawled, implemented as a [message queue](/learn/message-queues) (Kafka or a custom multi-queue)
- Two-level queue design: front queues prioritize by importance (PageRank, domain authority), back queues enforce per-domain politeness (one queue per domain, rate-limited)
- See [graph traversal](/learn/graph-traversal) for why BFS ordering matters

**2. HTML Fetcher Workers**

- A pool of stateless [microservice](/learn/microservices) workers that dequeue URLs from the frontier and fetch pages via HTTP
- Each worker: resolves the domain via the DNS resolver, makes the HTTP request, follows redirects (up to a limit), and passes the response to the parser
- Workers are horizontally scalable -- add more instances to increase throughput
- Implements retry logic with exponential backoff for transient failures (timeouts, 5xx errors)

**3. Custom DNS Resolver**

- A local DNS caching layer that resolves domain names to IP addresses
- Avoids hammering public DNS servers (which would rate-limit the crawler)
- Prefetches DNS records for domains in the frontier before the fetcher needs them
- See [DNS & DNS Caching](/learn/dns) for why this is critical at scale

**4. Extractor / Parser**

- Receives raw HTML from fetcher workers
- Parses HTML to extract hyperlinks, page title, meta tags, content type, and text content
- Normalizes extracted URLs (lowercase hostname, remove fragments, resolve relative paths, sort query parameters)
- Checks each URL against the Bloom filter before adding to the frontier

**5. Bloom Filter**

- A distributed [Bloom filter](/learn/bloom-filters) tracking all URLs that have been seen (crawled or enqueued)
- Before adding a URL to the frontier, check: "Have we seen this URL?" If yes, skip. If no, add to both the filter and the frontier.
- 10 billion URLs at 1% false positive rate = ~12 GB of memory
- Partitioned across multiple machines by URL hash for distributed operation

**6. Content Storage (Blob Storage + DB)**

- Raw HTML pages are stored in object storage (S3) keyed by URL hash
- Metadata (URL, title, crawl timestamp, HTTP status, content hash) is stored in a database
- The content store is the output of the crawler -- downstream systems (indexers, analyzers) read from here
- See [storage types](/learn/storage-types) for when to use object storage vs databases

### Why This Architecture

**Why BFS with a priority queue?** The web is a graph with billions of nodes. BFS discovers important pages first (pages close to high-authority seeds). A priority queue lets you crawl the most valuable pages before spending budget on deep, low-value pages. See [graph traversal](/learn/graph-traversal) for the full rationale.

**Why a Bloom filter instead of a database lookup for dedup?** Checking 10,000 URLs per second against a database is possible but slow. A Bloom filter checks membership in O(k) time with zero disk I/O. At 10 billion URLs, a Bloom filter uses 12 GB; a database index would use 100x more and require disk access. The 1% false positive rate (occasionally skipping an uncrawled URL) is an acceptable trade-off.

**Why a custom DNS resolver?** A naive crawler sends a DNS query for every URL fetch. At 10,000 fetches per second, that's 10,000 DNS queries per second to public resolvers -- you'll be rate-limited within minutes. A custom resolver with local caching and [prefetching](/learn/dns) eliminates DNS as a bottleneck.

**Why separate fetcher and parser?** Fetching is I/O-bound (waiting for HTTP responses). Parsing is CPU-bound (HTML parsing and link extraction). Separating them lets you scale each independently. You might need 100 fetcher workers but only 20 parsers.

---

## Detailed Design

### URL Frontier Architecture

The frontier is the heart of the crawler. It determines what gets crawled, in what order, and how fast.

**Two-level queue design:**

```
Front Queues (Priority)           Back Queues (Politeness)
┌─────────────────┐              ┌─────────────────┐
│ Priority 1      │──────────────│ example.com     │──→ Worker
│ (high-authority) │              │ (1 req/sec max) │
├─────────────────┤              ├─────────────────┤
│ Priority 2      │──────────────│ wikipedia.org   │──→ Worker
│ (medium)        │              │ (1 req/sec max) │
├─────────────────┤              ├─────────────────┤
│ Priority 3      │──────────────│ blogspot.com    │──→ Worker
│ (low)           │              │ (1 req/sec max) │
└─────────────────┘              └─────────────────┘
```

**Front queues** handle priority. URLs are routed to a priority tier based on domain authority, depth from seed, or a custom scoring function. Higher-priority queues are drained faster.

**Back queues** handle politeness. Each domain gets its own queue. A per-domain timer ensures at most 1 request per second (or whatever the domain's `robots.txt` specifies). When a worker requests a URL, the system selects from the back queue whose domain is "ready" for another request.

### Robots.txt Handling

Before crawling any domain for the first time, fetch and parse its `robots.txt`:

```
1. Fetch https://example.com/robots.txt
2. Parse directives:
   - User-agent: * or specific bot name
   - Disallow: /private/, /admin/
   - Allow: /public/
   - Crawl-delay: 2  (seconds between requests)
   - Sitemap: https://example.com/sitemap.xml
3. Cache the parsed rules (keyed by domain, refreshed periodically)
4. Before crawling any URL, check if it's allowed by the domain's rules
5. Respect Crawl-delay for politeness timing
```

Cache `robots.txt` rules in Redis or a local in-memory cache. Refresh periodically (e.g., every 24 hours) since sites update their rules.

### Crawl Flow

```
1. Seed URLs are added to the URL frontier
2. A fetcher worker dequeues the next URL from the frontier:
   a. Check the back queue: is this domain ready for another request?
   b. If not ready (rate-limited), skip and try another domain
3. Resolve the domain via the custom DNS resolver (cache hit or upstream query)
4. Fetch the page via HTTP GET:
   - Follow redirects (up to 5 hops)
   - Timeout after 30 seconds
   - Respect robots.txt rules
5. Pass the raw HTML to the parser
6. Parser extracts links, title, and metadata
7. For each extracted URL:
   a. Normalize the URL
   b. Check the Bloom filter: "Have we seen this URL?"
   c. If not seen: add to Bloom filter AND add to frontier
   d. If seen: skip (already crawled or queued)
8. Store the page content in object storage (S3)
9. Store metadata in the database (URL, title, status, timestamp, content hash)
10. Acknowledge the URL as processed (remove from frontier)
```

### Content Deduplication

Different URLs can serve identical content (mirrors, syndication, canonical vs non-canonical URLs). To avoid storing duplicate content:

```
1. Compute a fingerprint of the page content (e.g., SimHash or SHA-256 of normalized text)
2. Check the fingerprint against a content-seen set (another Bloom filter or database)
3. If duplicate: store a reference to the original, skip full storage
4. If unique: store the full content
```

Content dedup is separate from URL dedup. URL dedup prevents fetching the same URL twice. Content dedup prevents storing the same content from different URLs.

### Fault Tolerance

At this scale, failures are constant:

- **Worker crashes**: URLs being processed are tracked in a "processing" state. If a worker doesn't acknowledge within a timeout, the URL is returned to the frontier. Workers are stateless -- any worker can pick up any URL.
- **DNS failures**: Retry with exponential backoff. If a domain's DNS consistently fails, deprioritize it and move on.
- **HTTP failures**: Retry transient errors (5xx, timeouts) up to 3 times. Permanent errors (404, 403) are recorded and not retried.
- **Frontier persistence**: The URL frontier is backed by a durable message queue (Kafka). If the frontier service crashes, it recovers from the committed offset.
- **Bloom filter snapshots**: Periodically snapshot the Bloom filter to disk. On restart, load the snapshot instead of rebuilding from scratch.

### Scaling

**Workers**: Scale horizontally. Each worker is stateless and independently fetches pages. Add more workers to increase throughput. At 100 pages/second per worker, 1,000 workers handle 100,000 pages/second.

**URL Frontier**: Partition by domain using consistent hashing. Each partition handles URLs for a subset of domains. This keeps per-domain politeness enforcement local to a single partition.

**Bloom Filter**: Partition by URL hash. Each partition tracks a subset of URLs. A URL is always routed to the same partition for consistent membership testing.

**DNS Resolver**: Shard by domain. Each resolver instance handles a subset of domains, keeping its cache warm for those domains. DNS prefetching fills the cache before fetchers need the results.

**Storage**: Object storage (S3) scales without application-level sharding. The metadata database can be sharded by URL hash if query volume becomes a bottleneck.

---

## Common Interview Mistakes

### Mistake 1: Ignoring politeness and rate limiting

"Just fetch pages as fast as possible."

**Problem:** Crawling a single domain at maximum speed sends hundreds of requests per second to one server. This is effectively a DDoS attack. The server will block your IP, and your crawler gets banned from the domain entirely. Search engines take politeness seriously -- Google's crawler is carefully rate-limited.

**Better:** Enforce per-domain rate limits (typically 1 request per second). Use back queues partitioned by domain with per-domain timers. Respect `robots.txt` crawl-delay directives. A polite crawler that runs for months is far more effective than an aggressive crawler that gets blocked in hours. See [rate limiting algorithms](/learn/rate-limiting-algorithms) for implementation strategies.

### Mistake 2: Using a hash set for URL deduplication

"Store all visited URLs in a HashSet."

**Problem:** The web has hundreds of billions of pages. At 100 bytes per URL, 10 billion URLs requires 1 TB of memory for a hash set. Even a smaller crawl of 1 billion pages needs 100 GB. This doesn't fit on a single machine and is extremely expensive in a distributed setting.

**Better:** Use a [Bloom filter](/learn/bloom-filters). 10 billion URLs at 1% false positive rate requires only 12 GB of memory. The trade-off (occasionally skipping an uncrawled URL due to false positives) is acceptable for web crawling. Explain the memory savings and the false positive trade-off.

### Mistake 3: Not mentioning DNS caching

"The crawler resolves DNS for each URL fetch."

**Problem:** A cold DNS lookup takes 50-200ms. At 10,000 fetches per second, that's 10,000 DNS queries per second. Public resolvers will rate-limit you. Even without rate limiting, DNS latency dominates your crawl time. Your crawler spends more time waiting for DNS than actually downloading pages.

**Better:** Run a custom [DNS resolver](/learn/dns) with aggressive local caching. Prefetch DNS records for domains in the frontier before fetchers need them. This hides DNS latency entirely and eliminates dependency on external resolvers.

### Mistake 4: Single-threaded or single-machine design

"One machine fetches pages, parses HTML, and stores content."

**Problem:** A single machine can fetch roughly 100-1,000 pages per second (limited by network I/O and DNS). The web has hundreds of billions of pages. At 1,000 pages/second, crawling 1 billion pages takes 12 days. Crawling the full web on one machine would take decades.

**Better:** Design for distributed operation from the start. Stateless fetcher workers behind a distributed frontier queue. Workers are [horizontally scaled](/learn/scaling) -- add more to increase throughput. The frontier, Bloom filter, and DNS resolver are all distributed [microservices](/learn/microservices).

### Mistake 5: Ignoring content deduplication

"Store every fetched page."

**Problem:** Many URLs serve identical content (www vs non-www, HTTP vs HTTPS, trailing slash variants, syndicated content). Without content dedup, you store the same page dozens of times, wasting storage and misleading downstream consumers.

**Better:** After fetching, compute a content fingerprint (SimHash of the page text). Check against a content-seen set. If duplicate, store a reference instead of the full content. This is separate from URL dedup -- URL dedup prevents re-fetching, content dedup prevents re-storing.

---

**Interview golden rule:**

Don't just say "fetch pages and follow links." Explain the three pillars of a distributed crawler: [BFS with a priority frontier](/learn/graph-traversal) determines what to crawl next, a [Bloom filter](/learn/bloom-filters) ensures you never crawl the same URL twice using minimal memory, and per-domain politeness policies with a custom [DNS resolver](/learn/dns) make the crawler fast without being abusive. Then walk through what happens when you discover a new URL, how you handle a domain with 10 million pages, and what happens when a worker crashes mid-crawl.
