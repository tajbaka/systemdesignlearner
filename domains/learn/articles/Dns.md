# DNS & DNS Caching

## Introduction

Every time a web crawler fetches a page, it starts with a domain name: `example.com`. But the network layer speaks IP addresses: `93.184.216.34`. The translation from domain name to IP address happens through DNS (Domain Name System), and at crawler scale -- millions of fetches per second -- DNS resolution becomes a critical bottleneck.

A single DNS lookup takes 20-100ms on average. If your crawler fetches 10,000 pages per second, that's potentially 10,000 DNS lookups per second. Without caching and optimization, DNS resolution alone would consume most of your crawler's time and overwhelm public DNS servers.

Understanding DNS is essential for designing any system that communicates over the internet at scale -- web crawlers, CDNs, [load balancers](/learn/scaling), and microservices.

---

## What Is DNS?

DNS is a distributed naming system that maps human-readable domain names to machine-readable IP addresses. Think of it as the internet's phone book:

- **Input**: `www.example.com`
- **Output**: `93.184.216.34` (IPv4) or `2606:2800:220:1:248:1893:25c8:1946` (IPv6)

DNS also stores other record types:

- **A record**: Domain → IPv4 address
- **AAAA record**: Domain → IPv6 address
- **CNAME record**: Domain → another domain (alias)
- **MX record**: Domain → mail server
- **NS record**: Domain → authoritative nameserver
- **TXT record**: Domain → arbitrary text (used for verification, SPF, etc.)

For web crawlers, A and AAAA records are the most relevant -- they're how you resolve a domain to the IP address you'll connect to.

---

## The DNS Hierarchy

DNS is organized as a tree with four levels:

**1. Root servers (`.`)**

- 13 root server clusters (labeled A through M), distributed globally via anycast
- They don't know IP addresses directly -- they know which servers are responsible for top-level domains
- Query: "Who handles `.com`?" → Root server responds with the `.com` TLD servers

**2. TLD (Top-Level Domain) servers (`.com`, `.org`, `.io`)**

- Responsible for a single top-level domain
- They don't know final IP addresses either -- they know which authoritative nameservers handle each registered domain
- Query: "Who handles `example.com`?" → TLD server responds with `example.com`'s authoritative nameservers

**3. Authoritative nameservers**

- The definitive source of truth for a specific domain
- They return the actual IP address for the domain
- Query: "What is the IP of `www.example.com`?" → Authoritative server responds with `93.184.216.34`

**4. Recursive resolvers**

- Not part of the hierarchy itself, but the entry point for most DNS queries
- Your ISP, Google (8.8.8.8), or Cloudflare (1.1.1.1) runs recursive resolvers
- They walk the hierarchy on your behalf: root → TLD → authoritative → answer
- They cache results aggressively to avoid repeating the full lookup chain

---

## Recursive vs Iterative Resolution

**Recursive resolution** (what most clients use):

```
1. Client asks recursive resolver: "What is the IP of www.example.com?"
2. Resolver checks its cache. If found, return immediately.
3. Resolver asks root server: "Who handles .com?"
4. Root responds: "Ask these TLD servers"
5. Resolver asks TLD server: "Who handles example.com?"
6. TLD responds: "Ask these authoritative nameservers"
7. Resolver asks authoritative nameserver: "What is www.example.com?"
8. Authoritative responds: "93.184.216.34, TTL 3600"
9. Resolver caches the result and returns it to the client
```

The client sends one query and gets one answer. The resolver does all the work.

**Iterative resolution** (how resolvers talk to servers):

```
1. Resolver asks root server: "What is www.example.com?"
2. Root responds: "I don't know, but try these .com TLD servers" (referral)
3. Resolver asks TLD server: "What is www.example.com?"
4. TLD responds: "I don't know, but try these authoritative servers" (referral)
5. Resolver asks authoritative server: "What is www.example.com?"
6. Authoritative responds: "93.184.216.34" (answer)
```

In iterative mode, each server either answers directly or points to the next server to ask. The resolver follows the chain of referrals.

---

## TTL and Caching Layers

Every DNS response includes a **TTL (Time To Live)** value -- the number of seconds the result can be cached before it must be re-queried:

- Short TTL (60-300 seconds): Allows fast failover. If a server goes down, DNS can point to a new IP within minutes. Used by services that need rapid changes (CDNs, failover systems).
- Long TTL (3600-86400 seconds): Reduces DNS query volume. Stable services that rarely change IP addresses use long TTLs.

**Caching happens at multiple layers:**

1. **Browser cache**: The browser caches DNS results for the duration of the session
2. **OS cache**: The operating system maintains a DNS cache (e.g., `systemd-resolved` on Linux)
3. **Recursive resolver cache**: Your ISP or DNS provider caches results for up to the TTL duration
4. **Application-level cache**: Servers and crawlers can maintain their own DNS cache

Each layer reduces the number of queries that reach the authoritative servers. At steady state, most DNS lookups are served from cache, completing in under 1ms.

---

## DNS as a Bottleneck at Scale

For a web crawler processing millions of pages per second, DNS becomes a major bottleneck:

**Problem 1: Latency**

- A cold DNS lookup (no cache hit) takes 50-200ms as the resolver walks the hierarchy
- Your crawler fetches a page in ~200ms total. If half of that is DNS resolution, you've cut your throughput in half
- Crawling diverse domains means many cache misses: each new domain requires a fresh lookup

**Problem 2: Rate limits**

- Public recursive resolvers (Google, Cloudflare) rate-limit heavy users
- If your crawler sends 100,000 DNS queries per second to 8.8.8.8, you'll be throttled or blocked
- Authoritative nameservers for small domains may also rate-limit or crash under load

**Problem 3: Reliability**

- DNS failures (timeouts, SERVFAIL) are common under heavy load
- A failed DNS lookup means a failed page fetch, even if the web server is healthy
- DNS outages at any level of the hierarchy can block resolution for entire TLDs

**Problem 4: Stale cache**

- A domain might change IP addresses (e.g., during a migration or failover)
- If your crawler uses a stale cached IP, it either gets the wrong content or a connection error
- Balancing freshness (short TTL) against performance (long cache) is a constant trade-off

---

## Custom DNS Resolvers

Large-scale crawlers don't rely on public resolvers. They run their own custom DNS resolution:

**Why build a custom resolver?**

- **No rate limits**: You control the resolver, so no external throttling
- **Custom caching**: Tune cache TTLs independently from what DNS records specify
- **Prefetching**: Resolve domains ahead of time before the fetcher needs them
- **Failure handling**: Implement retries, fallbacks, and circuit breakers
- **Monitoring**: Track resolution latency, cache hit rates, and failure rates per domain

**Architecture of a custom resolver:**

```
1. DNS Cache (Redis or in-memory)
   - Stores domain → IP mappings
   - Respects TTL but may extend it for known-stable domains
   - Cache hit: return immediately (<1ms)

2. Resolver Pool
   - Multiple resolver instances for redundancy
   - Spread queries across upstream DNS servers
   - Implement retry logic with exponential backoff

3. Upstream DNS servers
   - Mix of public resolvers (8.8.8.8, 1.1.1.1) and direct authoritative queries
   - Route queries to the closest/fastest upstream
```

**DNS prefetching**: When the crawler extracts links from a page, immediately queue DNS resolution for all newly discovered domains. By the time the fetcher needs to crawl those domains, the IP addresses are already cached. This decouples DNS resolution from page fetching, hiding DNS latency entirely.

---

## DNS Round-Robin

DNS can also be used for basic load distribution through **round-robin DNS**:

- A domain has multiple A records, each pointing to a different server IP
- Each DNS query returns the same set of IPs but in a different order
- Clients typically connect to the first IP in the list
- The rotation distributes traffic roughly evenly across servers

```
Query: api.example.com
Response 1: [10.0.1.1, 10.0.1.2, 10.0.1.3]
Response 2: [10.0.1.2, 10.0.1.3, 10.0.1.1]
Response 3: [10.0.1.3, 10.0.1.1, 10.0.1.2]
```

**Limitations of DNS round-robin:**

- No health checking: DNS keeps returning a server's IP even if it's down
- No session affinity: each query might resolve to a different server
- Caching breaks the distribution: clients cache the first result and keep using the same IP
- Uneven load: some clients hold connections longer than others

For production load balancing, use a proper [load balancer](/learn/scaling) instead of relying on DNS round-robin. DNS round-robin is useful as a first layer of distribution across multiple load balancer instances.

---

## Common Interview Mistakes

**Mistake 1: Ignoring DNS in crawler design.** Every URL fetch starts with DNS resolution. At millions of URLs per second, DNS latency and reliability dominate your crawler's performance. Always mention DNS caching and custom resolvers.

**Mistake 2: Using a single public resolver.** Google DNS (8.8.8.8) will rate-limit a crawler doing 100K lookups/second. Mention running your own resolver infrastructure with local caching.

**Mistake 3: Not mentioning TTL.** DNS results expire. If you cache an IP address forever, you'll eventually connect to the wrong server. Explain TTL-based cache expiration and the trade-off between freshness and performance.

**Mistake 4: Confusing DNS with load balancing.** DNS round-robin is not a substitute for a load balancer. DNS has no health checks, no session affinity, and caching breaks the distribution. Use DNS for name resolution and a load balancer for traffic distribution.

---

## Summary: What to Remember

- DNS translates domain names to IP addresses through a **four-level hierarchy**: root → TLD → authoritative → answer.
- **Recursive resolvers** do the full lookup on the client's behalf and cache results.
- **TTL** controls how long a DNS result can be cached. Short TTL = faster failover. Long TTL = fewer queries.
- At crawler scale, DNS is a **bottleneck**: high latency, rate limits, and reliability issues.
- Large crawlers run **custom DNS resolvers** with local caching, prefetching, and retry logic.
- **DNS prefetching** resolves domains ahead of time, hiding DNS latency from the fetcher.
- DNS round-robin provides basic load distribution but is not a replacement for proper [load balancing](/learn/scaling).
