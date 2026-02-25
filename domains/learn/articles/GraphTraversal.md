# Graph Traversal (BFS)

## Introduction

Every link on a web page is an edge in a graph. When you design a web crawler, you're really designing a graph traversal system -- one that explores billions of nodes without revisiting the same page twice or getting stuck in infinite loops.

The web is a directed graph where pages are nodes and hyperlinks are edges. Crawling the web means visiting every reachable node starting from a set of seed URLs. The order in which you visit nodes matters: it determines how quickly you discover important pages, how you distribute load across domains, and whether your crawler gets trapped in link farms.

Understanding graph traversal is essential for designing any system that explores interconnected data -- web crawlers, social network analyzers, dependency resolvers, or recommendation engines.

---

## The Web as a Directed Graph

Think of the web as a graph:

- **Nodes** are web pages, each identified by a unique URL
- **Edges** are hyperlinks -- if page A contains a link to page B, there's a directed edge from A to B
- The graph is **directed** because links are one-way: page A linking to page B doesn't mean B links back to A
- The graph has **cycles**: A links to B, B links to C, C links back to A

Key properties of the web graph:

- **Scale**: Over 1 billion active websites, hundreds of billions of pages
- **Dynamic**: Pages are created, modified, and deleted constantly
- **Unbalanced**: Some domains have millions of pages (Wikipedia, Amazon), others have one
- **Noisy**: Many pages are duplicates, spam, or low-quality content

A web crawler must handle all of these properties while systematically visiting every reachable page.

---

## BFS vs DFS for Crawling

The two fundamental graph traversal algorithms are BFS (breadth-first search) and DFS (depth-first search). For web crawling, BFS is almost always preferred.

**BFS (breadth-first search)**

- Explores all pages at the current "depth" before going deeper
- Uses a queue (FIFO): process URLs in the order they were discovered
- Discovers the most important pages first -- pages close to seed URLs tend to be high-authority pages
- Naturally spreads load across domains because it processes pages from multiple domains interleaved

**DFS (depth-first search)**

- Goes as deep as possible down one path before backtracking
- Uses a stack (LIFO): always process the most recently discovered URL
- Can get trapped following a single domain's link chain deep into low-value pages
- Poor load distribution: crawls one domain exhaustively before moving to the next

**Why BFS wins for crawling:**

1. **Page importance correlates with depth.** Pages linked from the homepage (depth 1) are more important than pages buried 10 clicks deep. BFS discovers high-value pages first.
2. **Politeness.** BFS naturally interleaves requests across domains. DFS might hammer a single domain with thousands of requests before moving on.
3. **Freshness.** BFS reaches more domains faster, giving a broader view of the web sooner.
4. **Trap avoidance.** DFS can follow infinite pagination links or calendar pages that generate URLs endlessly. BFS limits depth naturally.

The main downside of BFS is memory: you need to keep the entire frontier (queue of unvisited URLs) in memory. At web scale, this frontier can contain billions of URLs, requiring distributed storage like a [message queue](/learn/message-queues).

---

## Queue-Based BFS Traversal

The standard BFS crawling algorithm:

```
1. Initialize the frontier queue with seed URLs
2. Initialize a visited set (empty)
3. While the frontier is not empty:
   a. Dequeue the next URL from the frontier
   b. If URL is in visited set, skip it
   c. Add URL to visited set
   d. Fetch the page content (HTTP GET)
   e. Parse the HTML, extract all links
   f. For each extracted link:
      - Normalize the URL (remove fragments, resolve relative paths)
      - If not in visited set, enqueue it to the frontier
   g. Store the page content for indexing
```

At scale, each component becomes a distributed system:

- The **frontier queue** becomes a distributed message queue (Kafka, RabbitMQ)
- The **visited set** becomes a [Bloom filter](/learn/bloom-filters) for space-efficient membership testing
- The **fetch step** is performed by a pool of worker machines
- The **storage step** writes to object storage or a database

The queue-based approach has another advantage: it naturally supports multiple workers. Multiple machines can dequeue URLs from the same frontier, fetch pages in parallel, and enqueue newly discovered URLs. The queue provides work distribution and backpressure automatically.

---

## Cycle Detection

The web is full of cycles. Without cycle detection, a crawler will visit the same pages endlessly:

- A links to B, B links to A (simple cycle)
- A links to B, B links to C, C links to A (indirect cycle)
- A page links to itself
- Infinite URL generation: calendars, pagination, session IDs in URLs

**The visited set** is the primary defense. Before fetching any URL, check if it's already been crawled. At web scale, storing billions of URLs in a hash set requires too much memory. [Bloom filters](/learn/bloom-filters) solve this: they use a fraction of the memory and give a definitive "not visited" answer (no false negatives). The trade-off is occasional false positives -- skipping a URL that hasn't actually been visited. At web scale, losing a tiny fraction of pages is acceptable.

**URL normalization** is critical for effective cycle detection:

- Convert to lowercase: `HTTP://Example.COM/Page` becomes `http://example.com/page`
- Remove fragments: `http://example.com/page#section` becomes `http://example.com/page`
- Remove trailing slashes: `http://example.com/page/` becomes `http://example.com/page`
- Resolve relative URLs: `../page` becomes an absolute URL
- Remove default ports: `http://example.com:80/` becomes `http://example.com/`
- Sort query parameters: `?b=2&a=1` becomes `?a=1&b=2`

Without normalization, the same page appears as multiple different URLs, wasting crawl budget and creating duplicate content.

---

## Priority-Based Crawling

Not all pages are equally important. A priority-based crawler extends BFS by assigning a priority score to each URL, using a priority queue instead of a FIFO queue:

**Priority signals:**

- **PageRank or link count**: Pages linked to by many other pages are likely more important
- **Domain authority**: Pages from well-known domains (wikipedia.org, gov sites) get higher priority
- **Freshness**: Pages that change frequently should be recrawled sooner
- **Depth from seed**: Pages closer to seed URLs tend to be more important
- **Content type**: HTML pages are prioritized over images, PDFs, or other media

**Implementation:**

- Replace the simple FIFO queue with a priority queue (min-heap or multiple queues by priority tier)
- Assign a priority score to each URL when it's discovered
- Dequeue the highest-priority URL first

In practice, large-scale crawlers use a multi-queue design:

1. **Front queues** (prioritizers): Multiple queues, one per priority level. URLs are routed to the appropriate queue based on their priority score.
2. **Back queues** (politeness enforcers): Multiple queues, one per domain. URLs are distributed to per-domain queues to enforce rate limits.

This two-level design separates the concerns of "what to crawl next" (priority) from "how fast to crawl each domain" (politeness).

---

## Scaling to Billions of Nodes

Crawling the entire web requires distributed systems at every level:

**Distributed frontier:** The URL frontier can't fit on a single machine. Partition it across multiple nodes using consistent hashing on the domain name. Each partition is responsible for URLs from a subset of domains. This also naturally groups URLs by domain, making politeness enforcement easier.

**Worker pools:** Hundreds or thousands of worker machines fetch pages in parallel. Each worker dequeues a batch of URLs from the frontier, fetches the pages, extracts links, and enqueues new URLs. Workers are stateless -- if one fails, its URLs are returned to the frontier and picked up by another worker.

**Checkpoint and recovery:** At this scale, crashes are routine. The system must persist the frontier state to disk periodically. If a worker crashes, its assigned URLs time out and are retried. If the frontier service crashes, it recovers from the last checkpoint.

**Deduplication at scale:** Storing billions of URLs in a hash set requires hundreds of gigabytes of RAM. [Bloom filters](/learn/bloom-filters) compress this to a fraction of the size. A Bloom filter with 10 billion entries and 1% false positive rate requires about 12 GB -- manageable on a single machine or easily partitioned across several.

**Bandwidth management:** A naive crawler can easily saturate network links. Limit global throughput and enforce per-domain rate limits. Monitor network utilization and adjust crawl speed dynamically.

---

## Common Interview Mistakes

**Mistake 1: Using DFS instead of BFS.** DFS gets trapped in deep link chains and doesn't spread across domains. Always start with BFS and explain why.

**Mistake 2: Forgetting cycle detection.** The web is full of cycles. Without a visited set, your crawler runs forever on the same pages. Mention Bloom filters for space-efficient dedup.

**Mistake 3: Ignoring URL normalization.** If you don't normalize URLs, the same page gets crawled dozens of times under different URL variants. This wastes crawl budget and creates duplicate content.

**Mistake 4: Single-machine design.** A single machine can crawl perhaps 1,000 pages per second. The web has hundreds of billions of pages. You need a distributed architecture from the start.

---

## Summary: What to Remember

- The web is a **directed graph** with cycles. Crawling is graph traversal.
- **BFS is preferred** over DFS for web crawling: it discovers important pages first, spreads load across domains, and avoids link traps.
- The **frontier queue** holds URLs to be crawled. At scale, this is a distributed [message queue](/learn/message-queues).
- **Cycle detection** uses a visited set. At scale, use a [Bloom filter](/learn/bloom-filters) for space-efficient membership testing.
- **URL normalization** is critical -- without it, the same page appears as many different URLs.
- **Priority crawling** assigns scores to URLs so the most important pages are crawled first.
- At scale, everything is distributed: frontier, workers, dedup, and storage.
