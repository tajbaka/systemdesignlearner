## Introduction

You're designing a social media platform. You've got your database, your API servers, your load balancer. Things are looking good. Then the interviewer asks: "Your users are spread across 40 countries. Profile images are stored in S3 in us-east-1. A user in Singapore loads their feed and it takes 3 seconds just to render the images. How do you fix that?"

And you freeze. Because you forgot that the internet is a physical thing, and data traveling from Virginia to Singapore takes time. A lot of time.

This is where CDNs come in. They're one of those concepts that show up in almost every system design interview, and yet candidates consistently under-explain them. They'll say "just put a CDN in front of it" and move on. But interviewers want to see that you understand how CDNs actually work, what tradeoffs they introduce, and when they're the right tool versus when they're not.

If you've read the [Object Storage & CDN](/learn/object-storage-cdn) article, you already know the basics of how a CDN sits in front of object storage. This article goes deeper: how CDNs work internally, the different types, cache invalidation strategies, video streaming, and the decision framework you need for interviews.

---

## What Is a CDN?

A CDN (Content Delivery Network) is a globally distributed network of servers that caches and serves content from locations physically close to users. Instead of every request traveling back to your origin server, users get served from the nearest **edge server**.

### The Mental Model

Think of it like a chain of convenience stores vs. a single warehouse.

Without a CDN, every customer drives to the central warehouse (your origin server) to pick up their order. Doesn't matter if they live next door or 5,000 miles away. Everyone drives to the warehouse.

With a CDN, you stock convenience stores (edge servers) in every neighborhood. When a customer wants something, they walk to the nearest store. If the store has it in stock (cache hit), they get it instantly. If not (cache miss), the store orders it from the warehouse, gives it to the customer, and keeps a copy on the shelf for the next person.

### Key Terminology

**Edge server:** A server in the CDN network that caches and serves content. These are deployed in data centers around the world.

**Point of Presence (PoP):** A physical location where edge servers are deployed. Major CDN providers like CloudFront, Cloudflare, and Akamai have 200-300+ PoPs globally. Each PoP might contain dozens or hundreds of edge servers.

**Origin server:** Your actual server (or object storage like S3) where the original content lives. The CDN fetches from the origin when it doesn't have content cached.

**Edge location map (simplified):**

```
CDN Points of Presence (PoPs):

  North America:       Europe:           Asia:
  ┌─────────┐         ┌─────────┐       ┌─────────┐
  │ Seattle  │         │ London  │       │ Tokyo   │
  │ SF       │         │ Frank-  │       │ Singa-  │
  │ Dallas   │         │  furt   │       │  pore   │
  │ NYC      │         │ Paris   │       │ Mumbai  │
  │ Miami    │         │ Madrid  │       │ Sydney  │
  └─────────┘         └─────────┘       └─────────┘

  South America:       Africa:           Middle East:
  ┌─────────┐         ┌─────────┐       ┌─────────┐
  │ São      │         │ Cape    │       │ Dubai   │
  │  Paulo   │         │  Town   │       │ Tel     │
  │ Buenos   │         │ Lagos   │       │  Aviv   │
  │  Aires   │         │         │       │         │
  └─────────┘         └─────────┘       └─────────┘
```

When a user makes a request, DNS resolution directs them to the nearest PoP. This is typically done through **anycast routing** (the same IP address is advertised from multiple locations, and the network routes to the closest one) or **DNS-based geolocation** (the CDN's DNS server returns the IP of the nearest edge).

---

## How CDNs Work

Let's trace through exactly what happens when a user requests a resource through a CDN.

### The Request Flow

```
User in Tokyo requests: cdn.example.com/images/profile-42.jpg

Step 1: DNS Resolution
  User → DNS → "cdn.example.com resolves to 198.51.100.5"
         (IP of nearest PoP: Tokyo edge)

Step 2: Request hits Tokyo edge server
  User → Tokyo Edge: "GET /images/profile-42.jpg"

Step 3a: CACHE HIT (content exists at edge)
  Tokyo Edge → User: Here's the image (from local cache)
  Latency: ~10-30ms

Step 3b: CACHE MISS (content NOT at edge)
  Tokyo Edge → Origin (S3 in Virginia): "GET /images/profile-42.jpg"
  Origin → Tokyo Edge: Here's the image
  Tokyo Edge caches the image locally
  Tokyo Edge → User: Here's the image
  Latency: ~200-400ms (first request only)

Step 4: Subsequent requests from Tokyo
  Any user in Tokyo requesting the same image → CACHE HIT (~10-30ms)
```

### Cache Hit vs. Cache Miss

This is the fundamental concept. A CDN's value comes entirely from cache hits.

```
Cache Hit Rate vs. Latency:

  Cache Hit Rate     Avg Latency    Origin Load
  ─────────────      ───────────    ───────────
       50%              ~120ms         50% of requests hit origin
       80%              ~50ms          20% of requests hit origin
       90%              ~30ms          10% of requests hit origin
       95%              ~20ms           5% of requests hit origin
       99%              ~12ms           1% of requests hit origin
```

A good CDN setup aims for 85-95%+ cache hit rates. The higher your hit rate, the less load on your origin and the faster your average response time.

**What affects cache hit rate:**

- **Content popularity:** Popular content gets requested often, stays in cache. The long tail of rarely-accessed content will always be cache misses.
- **TTL settings:** Longer TTLs mean content stays cached longer, higher hit rate. But staler content.
- **Cache size at edge:** Edge servers have finite storage. Less popular content gets evicted (typically LRU).
- **Number of unique URLs:** If every user gets a unique URL (e.g., personalized content), cache hit rate drops to near zero.

### HTTP Headers That Control Caching

CDNs respect standard HTTP caching headers. You control caching behavior through these:

```
Cache-Control: public, max-age=86400
  → CDN can cache this, keep it for 24 hours

Cache-Control: private, no-cache
  → CDN must NOT cache this (personalized content)

Cache-Control: public, max-age=31536000, immutable
  → Cache for 1 year, content will never change
  → Perfect for versioned static assets (app.a1b2c3.js)

ETag: "abc123"
  → CDN can revalidate with origin: "Has this changed?"
  → If unchanged, origin returns 304 Not Modified (no body)
```

**Interview tip:** Mentioning `Cache-Control` headers shows you understand the mechanism, not just the concept. It's a detail that separates strong answers from generic ones.

### Multi-Tier CDN Architecture

Large CDN providers don't use a flat architecture where every edge server talks directly to the origin. That would mean thousands of edge servers all bombarding your origin on cache misses. Instead, they use a **tiered architecture**:

![Multi-Tier CDN Architecture](diagram:cdn-multi-tier)

**Why this matters:** When a cache miss happens at an edge PoP in Tokyo, it doesn't go directly to your origin in Virginia. It first checks the regional shield in Asia (maybe Singapore). If that shield has the content, it returns it -- and the origin never sees the request. This dramatically reduces origin load and improves cache hit rates.

**The numbers:**

```
Without shield:  Each of 300 PoPs can independently miss → up to 300 origin fetches
With shield:     Misses consolidated through ~15 shields → up to 15 origin fetches

That's a 20x reduction in worst-case origin requests for any given piece of content.
```

In interviews, you don't need to explain this in detail unless asked. But if the interviewer pushes on "how does the CDN protect your origin from thundering herd problems," knowing about tiered caching is a strong answer.

---

## Pull vs. Push CDN

There are two fundamentally different CDN models. Understanding the difference matters in interviews because the right choice depends on your access patterns.

### Pull CDN (Lazy, On-Demand)

A pull CDN fetches content from the origin **only when a user requests it** and the edge doesn't have it cached.

```
Pull CDN Flow:

  User → Edge: "Give me image.jpg"
  Edge: "I don't have it. Let me get it."
  Edge → Origin: "GET image.jpg"
  Origin → Edge: [image data]
  Edge: Caches it locally, sets TTL
  Edge → User: Here's image.jpg

  Next user → Edge: "Give me image.jpg"
  Edge: "I have it cached!"
  Edge → User: Here's image.jpg (from cache)
```

**How it works:**

- Edge servers start empty
- Content is cached on first request (cache miss)
- Subsequent requests are served from cache (cache hit)
- Content expires based on TTL, then gets re-fetched on next request

**Pros:**

- Simple to set up -- just point the CDN at your origin
- Only caches content that's actually requested (efficient storage use)
- No need to manage what content is on which edge

**Cons:**

- First request to each edge is slow (cache miss penalty)
- If content is rarely requested at a specific PoP, it keeps getting evicted and re-fetched
- Origin gets hit for every unique piece of content at every PoP (cold start problem)

**Best for:**

- Websites with diverse content catalogs (e-commerce product images)
- Content where you can't predict what will be popular
- Most general-purpose use cases

**Examples:** CloudFront, Cloudflare, Fastly (all operate as pull CDNs by default)

### Push CDN (Eager, Pre-Populated)

A push CDN requires you to **explicitly upload content to edge servers** before users request it.

```
Push CDN Flow:

  Your System → CDN API: "Here's image.jpg, push to all edges"
  CDN: Distributes image.jpg to Tokyo, London, São Paulo, etc.

  (Later)
  User → Edge: "Give me image.jpg"
  Edge: "I have it!"
  Edge → User: Here's image.jpg (instant, no origin fetch)
```

**How it works:**

- You push content to the CDN proactively
- Content is pre-populated at edge servers before any user requests it
- You're responsible for managing what content is on the CDN
- You manually invalidate or update content when it changes

**Pros:**

- No cold start penalty -- content is already at the edge when users request it
- Origin is never hit for cached content (no cache misses for pushed content)
- You have full control over what's cached where

**Cons:**

- You need to manage uploads to the CDN (more operational complexity)
- Wastes storage if you push content that nobody requests
- Slower to update -- you need to re-push when content changes
- Requires you to predict what content users will need

**Best for:**

- Video streaming platforms (pre-populate popular content at edges)
- Software distribution (OS updates, app binaries)
- Content you know will be heavily accessed (homepage assets, viral videos)

### Pull vs. Push: Decision Framework

```
┌─────────────────────────────────┬──────────────────────────────────┐
│           Pull CDN              │           Push CDN               │
├─────────────────────────────────┼──────────────────────────────────┤
│ Content catalog is large        │ Content catalog is small/known   │
│ Can't predict popular content   │ Know what will be popular        │
│ Content changes frequently      │ Content is static/infrequent     │
│ Simpler operations              │ Need zero first-request latency  │
│ OK with occasional cache miss   │ Need guaranteed edge presence    │
├─────────────────────────────────┼──────────────────────────────────┤
│ E-commerce images               │ Video streaming (popular titles) │
│ User-generated content          │ Software updates/downloads       │
│ Blog posts, articles            │ Live event content               │
│ API responses                   │ Game asset distribution          │
└─────────────────────────────────┴──────────────────────────────────┘
```

**Interview tip:** Most candidates only know about pull CDNs. Mentioning push CDNs and explaining when each is appropriate shows deeper understanding. In practice, most CDNs are pull-based, but hybrid approaches are common -- especially for video platforms where popular content is pushed and the long tail is pulled.

---

## Cache Invalidation

This is the hard problem. Phil Karlton famously said there are only two hard things in computer science: cache invalidation and naming things. With CDNs, cache invalidation is especially tricky because you're dealing with hundreds of edge servers across the globe.

When you update content at the origin, how do you make sure all those edge servers stop serving the stale version?

### Strategy 1: TTL-Based Expiration

The simplest approach. You set a Time-To-Live on cached content. After the TTL expires, the edge server re-fetches from the origin on the next request.

```
Cache-Control: public, max-age=3600    → Content expires after 1 hour
Cache-Control: public, max-age=86400   → Content expires after 1 day
Cache-Control: public, max-age=2592000 → Content expires after 30 days
```

**How it works:**

1. Edge caches content with a TTL
2. After TTL expires, content is marked stale
3. Next request triggers a revalidation with origin
4. If content changed, edge fetches the new version
5. If content hasn't changed, origin returns 304 (edge refreshes the TTL)

**The tradeoff:** Short TTL = fresher content but more origin hits and lower cache hit rates. Long TTL = higher cache hit rates but staler content.

```
TTL Tradeoff Spectrum:

  Short TTL (seconds)              Long TTL (days/weeks)
  ├──────────────────────────────────────────────────┤
  Fresh content                    Stale content
  Low cache hit rate               High cache hit rate
  High origin load                 Low origin load

  Good for: News, prices           Good for: Images, CSS, JS
```

**When to use:** This is your default. Most static content works fine with TTL-based expiration. Set a 24-hour TTL for images, a 1-year TTL for versioned assets, and a 5-minute TTL for content that changes occasionally.

### Strategy 2: Versioned URLs (Cache Busting)

Instead of invalidating cached content, you change the URL so the CDN treats it as a completely new resource.

```
Before update:  cdn.example.com/app.js?v=1
After update:   cdn.example.com/app.js?v=2

Or with content hashing:
Before: cdn.example.com/app.a1b2c3.js
After:  cdn.example.com/app.d4e5f6.js
```

**How it works:**

1. Build tools generate a hash of the file content
2. The hash becomes part of the filename (e.g., `app.a1b2c3.js`)
3. When content changes, the hash changes, creating a new URL
4. New URL = new cache entry = users get the fresh version immediately
5. Old cached version eventually expires or gets evicted (but nobody requests it anymore)

**Why this is powerful:**

- No cache invalidation needed at all
- You can set `max-age=31536000` (1 year) because the URL is effectively immutable
- Cache hit rates go through the roof
- Zero stale content risk

**The catch:**

- Only works for assets you control and can version (CSS, JS, images)
- Doesn't work for API responses or dynamic content
- You need a build pipeline that generates versioned filenames
- The HTML page that references these assets can't itself be versioned this way (chicken-and-egg problem)

**When to use:** Always use this for static build assets (JavaScript bundles, CSS, images with hashes). It's the gold standard for frontend deployment. Most modern build tools (webpack, Vite, Next.js) do this automatically.

### Strategy 3: Purge APIs (Active Invalidation)

CDN providers expose APIs that let you explicitly purge cached content from edge servers.

```
# Purge a specific URL
POST /purge
{ "url": "cdn.example.com/images/profile-42.jpg" }

# Purge by pattern (wildcard)
POST /purge
{ "pattern": "cdn.example.com/images/profile-*" }

# Purge everything (nuclear option)
POST /purge-all
```

**How it works:**

1. You update content at the origin
2. You call the CDN's purge API with the URL(s) to invalidate
3. CDN propagates the purge to all edge servers (takes seconds to minutes)
4. Next request at each edge triggers a fresh fetch from origin

**Pros:**

- Immediate-ish invalidation (seconds, not hours)
- You control exactly when stale content gets cleared
- Works for any type of content

**Cons:**

- Purge propagation isn't instant (can take 1-30 seconds across all PoPs)
- API rate limits (you can't purge millions of URLs per minute)
- Adds complexity to your deployment pipeline
- Wildcard purges are expensive and can tank cache hit rates temporarily

**When to use:** When you need to invalidate specific content on demand. Good for CMS-driven content, user-uploaded images that get re-uploaded, or emergency content removal. Don't rely on this as your primary caching strategy.

### The Practical Approach (Combine All Three)

In real systems -- and in strong interview answers -- you combine these strategies:

```
Content Type          Caching Strategy
──────────────        ──────────────────────────────────
Static build assets   Versioned URLs + long TTL (1 year)
(JS, CSS, fonts)      → Cache-Control: public, max-age=31536000, immutable

User-uploaded media   TTL-based (24h) + purge on re-upload
(profile pics, posts) → Cache-Control: public, max-age=86400

HTML pages            Short TTL (5 min) + purge on publish
                      → Cache-Control: public, max-age=300

API responses         Short TTL (1 min) or no-cache
                      → Cache-Control: public, max-age=60

Personalized content  No CDN caching
                      → Cache-Control: private, no-store
```

---

## CDN for Video Streaming

Video streaming is the single largest use case for CDNs. Netflix, YouTube, Disney+, and every other major streaming platform relies heavily on CDNs to deliver content. Understanding how this works is valuable in interviews, especially for media-related design questions.

### Why Video Is Different

A 2-hour movie at 1080p is roughly 3-6 GB. You can't just serve that as a single file download -- users would wait forever for it to start playing, and if the connection drops halfway through, they'd have to start over.

Instead, video streaming uses **adaptive bitrate streaming** protocols like HLS (HTTP Live Streaming) or DASH (Dynamic Adaptive Streaming over HTTP). The core idea: chop the video into small chunks and let the player download them sequentially.

### How Chunked Video Works

```
Original video file: movie.mp4 (4 GB)

Transcoded into multiple quality levels:
  1080p: movie_1080p_chunk001.ts, movie_1080p_chunk002.ts, ... (4-10 sec each)
   720p: movie_720p_chunk001.ts,  movie_720p_chunk002.ts,  ...
   480p: movie_480p_chunk001.ts,  movie_480p_chunk002.ts,  ...
   360p: movie_360p_chunk001.ts,  movie_360p_chunk002.ts,  ...

Manifest file (playlist): movie.m3u8
  → Lists all available quality levels and their chunk URLs
  → Player uses this to decide which chunks to request
```

### The Streaming Flow

```
1. Player requests manifest:
   Player → CDN: GET /videos/movie.m3u8
   CDN → Player: Manifest listing quality levels and chunk URLs

2. Player starts with medium quality:
   Player → CDN: GET /videos/720p/chunk001.ts   (cache hit, ~10ms)
   Player → CDN: GET /videos/720p/chunk002.ts   (cache hit, ~10ms)
   Player → CDN: GET /videos/720p/chunk003.ts   (cache hit, ~10ms)

3. Network improves, player upgrades:
   Player → CDN: GET /videos/1080p/chunk004.ts  (cache hit, ~10ms)
   Player → CDN: GET /videos/1080p/chunk005.ts  (cache hit, ~10ms)

4. Network degrades, player downgrades:
   Player → CDN: GET /videos/480p/chunk006.ts   (cache hit, ~10ms)
```

**The key insight:** Each chunk is a small, independent HTTP request. The CDN caches chunks just like any other static file. Popular movies have their chunks cached at every PoP worldwide. The player adapts quality in real-time based on bandwidth, and the CDN serves each chunk from the nearest edge.

### Why CDNs Are Essential for Video

```
Without CDN:
  1 million concurrent viewers × 5 Mbps average = 5 Tbps from origin
  → No single origin can handle this

With CDN:
  Origin serves each chunk once per PoP (~300 PoPs)
  Edge servers handle the 1 million viewers locally
  Origin load: ~300 × 5 Mbps = 1.5 Gbps (manageable)

  That's a ~3,000x reduction in origin bandwidth.
```

Video streaming platforms also use **push CDN** strategies for popular content. When a new season of a popular show drops, the platform pre-pushes the first few episodes to all major edge locations before release time. This avoids the thundering herd of cache misses at launch.

For the long tail of less popular content, they use pull CDN. If someone watches an obscure documentary, the chunks get pulled from origin to the nearest edge on demand.

### CDN Cost Considerations for Video

Video is bandwidth-intensive, and CDN bandwidth isn't free. Here's a rough picture:

```
CDN egress pricing (approximate):
  First 10 TB/month:    ~$0.085/GB
  Next 40 TB/month:     ~$0.080/GB
  Next 100 TB/month:    ~$0.060/GB
  Over 500 TB/month:    ~$0.040/GB (negotiated)

Example: Streaming platform with 1 million daily active users
  Average watch time: 1 hour/day at 720p (~1.5 GB/hour)
  Daily bandwidth: 1M × 1.5 GB = 1.5 PB/day = ~45 PB/month
  Monthly CDN cost: Millions of dollars (negotiated enterprise rates)
```

This is why Netflix, Apple, and Google build their own CDN infrastructure (Netflix Open Connect, Google Global Cache) rather than relying solely on third-party CDNs. At that scale, owning the hardware is cheaper than paying per-GB.

**Interview relevance:** You don't need to quote exact pricing. But mentioning that CDN costs scale with bandwidth and that very large platforms often build their own CDN shows you understand the economics of scale.

---

## When to Use a CDN

Here's a clean decision framework you can apply in any system design interview.

### Always Use a CDN For

- **Static assets** (images, CSS, JavaScript, fonts). There's no reason not to. Put a CDN in front of your static content and set long TTLs or use versioned URLs.
- **User-uploaded media** (profile pictures, post images, video content). These are read-heavy and don't change often. CDN is a no-brainer.
- **Video/audio streaming.** As discussed above, CDNs are essential for video at any meaningful scale.
- **Software downloads** (app binaries, OS updates). Large files downloaded by millions of users -- perfect CDN use case.

### Consider a CDN For

- **API responses that are cacheable.** If your API returns the same response for the same query (e.g., product catalog, search results), a CDN can cache it. But be careful with personalized responses.
- **Server-rendered HTML pages.** If the page is the same for all users (marketing pages, blog posts), a CDN can cache the rendered HTML. If the page is personalized, you can still use a CDN for the static assets within the page.

### Don't Use a CDN For

- **Personalized content.** User dashboards, feeds tailored to individual users, private data. The cache key would be unique per user, giving you a 0% hit rate. Use `Cache-Control: private`.
- **Real-time data.** Stock prices, live scores, chat messages. By the time it's cached, it's stale. Use [WebSockets](/learn/websockets-realtime) instead.
- **Write operations.** CDNs are for reads. POST, PUT, DELETE requests should go directly to your API servers.
- **Content requiring authentication checks on every request.** If you need to verify permissions before serving each response, the CDN can't do that for you (though some CDNs support edge authentication functions).

### The Interview Decision Framework

```
Should I use a CDN?

  Is the content static or rarely changes?
    YES → Use a CDN with long TTL or versioned URLs

  Is the content read-heavy (read:write ratio > 10:1)?
    YES → Strong CDN candidate

  Are users geographically distributed?
    YES → CDN provides significant latency reduction

  Is the content the same for all users (not personalized)?
    YES → CDN will have high cache hit rate

  Is the content large (images, video, downloads)?
    YES → CDN reduces origin bandwidth significantly

  If you answered YES to 2+ of these → Use a CDN.
```

Knowing when and why to reach for a CDN is more important in interviews than knowing the internals of any specific provider. For a deeper look at how CDNs work with different [storage types](/learn/storage-types) at the origin, especially object storage, see the [Object Storage & CDN article](/learn/object-storage-cdn).

---

## Common Interview Mistakes

### Mistake 1: Forgetting Cache Invalidation

"I'll put a CDN in front of S3 and we're done."

**The problem:** The interviewer will immediately ask: "What happens when a user updates their profile picture?" If you don't have a cache invalidation strategy, you look like you've never worked with CDNs in practice.

**The fix:** Always mention your invalidation strategy. For user-uploaded content, use TTL + purge on update. For static build assets, use versioned URLs. Show the interviewer you've thought about the full lifecycle, not just the happy path.

### Mistake 2: Not Mentioning CDN for Static Content

"Users will load images directly from S3."

**The problem:** Every request hits the origin. Users far from the S3 region get 200-400ms latency per image. A page with 20 images means 4-8 seconds of load time. The interviewer is waiting for you to say "CDN" and you never do.

**The fix:** Whenever your design involves serving static assets (images, CSS, JS, videos) to users, mention a CDN. It should be automatic. "Static content is served through a CDN in front of S3" is a sentence that should appear in almost every design.

### Mistake 3: Assuming CDN Replaces the Origin

"With a CDN, we don't need to worry about our origin scaling."

**The problem:** CDNs cache content, they don't generate it. On a cache miss, the CDN still needs to fetch from your origin. If your origin is down, the CDN can't serve new content. And during cold starts (new content, new PoPs, TTL expiration), all traffic flows through the origin.

**The fix:** Always design your origin to handle the load of cache misses. The CDN reduces origin load, it doesn't eliminate it. Mention that your S3 or origin servers still need to be reliable and scalable. A good rule of thumb: design your origin to handle 10-20% of total traffic (assuming 80-90% cache hit rate).

### Mistake 4: Using a CDN for Personalized Content

"We'll cache the user's feed at the CDN edge."

**The problem:** Each user's feed is unique. The cache key would need to include the user ID, meaning every request is a cache miss. You've added CDN latency (DNS lookup, edge routing) without getting any caching benefit. You've actually made things slower.

**The fix:** Be explicit about what goes through the CDN and what doesn't. Static assets and shared content go through the CDN. Personalized API responses go directly to your API servers. You can still use a CDN for the static assets within a personalized page (the JavaScript bundle, CSS, images) -- just not the personalized data itself.

---

## Summary: What to Remember

**What a CDN does:**

- Caches content at edge servers close to users
- Reduces latency from 200-400ms to 10-30ms for cached content
- Offloads 80-95% of read traffic from your origin
- Major providers: CloudFront, Cloudflare, Akamai, Fastly

**Pull vs. Push:**

- Pull CDN: content fetched on demand, simple, good for most use cases
- Push CDN: content pre-distributed to edges, good for known-popular content like video
- Most real systems use pull with selective push for hot content

**Cache invalidation strategies:**

- TTL-based: simple, set expiration time, good default
- Versioned URLs: best for static build assets, eliminates invalidation problem entirely
- Purge APIs: active invalidation for specific content, use when TTL is too slow

**When to use a CDN:**

- Static assets: always
- User-uploaded media: almost always
- Video streaming: essential at any scale
- Personalized content: never cache the personalized part

**The numbers to remember:**

```
CDN cache hit latency:     ~10-30ms
Origin fetch latency:      ~200-400ms
Typical cache hit rate:    85-95%
Origin load reduction:     80-95% of reads
```

**Interview golden rule:**

```
Every system that serves static content to a global audience needs a CDN.
Always explain your caching strategy AND your invalidation strategy.
```
