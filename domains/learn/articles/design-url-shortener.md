## Introduction

Alright, so you walk into that system design interview and the interviewer says: "Design a URL shortening service like TinyURL or Bitly."

You're thinking, "Oh great, this sounds straightforward." Take a long URL, make it short, store it, done. Easy.

Then they hit you with: "How do you handle 10 million redirects per day? How do you guarantee unique short codes? What happens when two users try to shorten the same URL at the exact same time?"

And suddenly you're realizing this isn't as simple as you thought.

This walkthrough covers a clean architecture that works at scale, using pre-generated codes and separate read/write servers. This is a pattern you'll see in real production systems.

---

## Functional Requirements

Let's be clear about what we need to support:

**1. Shorten a URL**

- User provides a long URL
- System returns a unique short URL
- Example: `https://www.amazon.com/some-really-long-product-url` becomes `tiny.url/12345678`

**2. Redirect to original URL**

- User visits the short URL
- System redirects them to the original long URL
- Should be fast and reliable

**3. Short codes must be unique**

- No two long URLs should get the same short code
- Once assigned, a short code always points to the same long URL

That's it. Two main operations. Don't overcomplicate it in the interview.

---

## Non-Functional Requirements

**Low latency for redirects**

- Nobody wants to wait more than half a second for a redirect, redirect.
- This is the critical path that affects user experience so our target is under 100ms for the lookup

**High read traffic**

- Redirects happen way more often than URL creation
- Read-to-write ratio is often 10:1 or higher
- Need to scale reads independently from writes
- Example: 100 million redirects/day vs 10 million created URLs/day

**Unique short codes (guaranteed)**

- Can't have two different URLs with the same short code
- This is critical - collisions break the entire system
- Must work even under concurrent requests

**High availability**

- Service needs to be up 99.9%+ of the time
- A link that doesn't work is worse than no link at all
- Should handle server failures gracefully

**Scalability**

- Start with thousands of URLs
- Scale to billions of URLs
- Handle millions of redirects per day

---

## API Design

Keep it simple. Two REST APIs that map directly to our functional requirements:

**1. Create Short URL**

```
POST /api/v1/urls

Request Body:
{
  "longUrl": "https://www.amazon.com/some-product-url",
  "custom_alias": "optional",
  "expiration_date": "optional"
}

Response:
{
  "shortUrl": "tiny.url/12345678"
}

Status: 201 Created
```

**2. Redirect to Original URL**

```
GET /:slug

Example: GET /12345678

Response:
HTTP 301 (or 302) Redirect
Location: https://www.amazon.com/some-product-url

Status: 302 Found (or 301 Moved Permanently)
```

**Why 301 vs 302?**

- 301 (Permanent): Browser caches the redirect, faster but can't track analytics
- 302 (Temporary): Every redirect hits your server, slower but you can track clicks

Most URL shorteners use 302 for analytics.

---

## High Level Design

Here's the overall architecture:

![URL Shortener High-level Design](diagram:url-shortener)

### Key Components

**1. Load Balancer / API Gateway**

- Single entry point for all requests
- Routes POST /shorten to write server
- Routes GET /{code} to read servers (round-robin)
- Can cache hot links

**2. Write Server (Single Instance)**

- Handles all URL shortening requests
- Assigns pre-generated short codes
- Writes to PostgreSQL master
- Low traffic, so one server is usually enough

**3. Read Servers (Multiple Instances)**

- Handle all redirect requests
- Stateless and horizontally scalable (see [Scaling: Vertical vs Horizontal](/learn/scaling) for details)
- Query Redis cache first, then database
- High traffic, so we scale these out

**4. PostgreSQL Database**

- Master handles all writes
- Read replicas handle all reads
- Stores URL mappings and pre-generated codes
- Simple schema, indexed for fast lookups

**5. Redis Cache**

- Caches popular short codes
- Reduces database load by 90%+
- Keeps latency under 1ms for hot links

**5. PostgreSQL Database Storage**

- Stores pre-generated urls
- Reduces overall size of main database, so queries are running against less rows.

**6. Background Service**

- Periodically moves generated urls into our database for use.
- Move expired urls back into our generated url bucket.
- This prevents our write service from having to create unique urls, since they are all pregenerated, and keeps the queries on a small number of urls.

For more on when and how to use caching effectively, see our guide on [Databases & Caching](/learn/database-caching).

### Why This Architecture Works

**Separation of concerns:**

- Write and read paths are completely separate
- Can scale them independently based on traffic

**Optimized for read-heavy workload:**

- Multiple read servers
- Caching layer
- Database read replicas

**Simple and proven:**

- No complex distributed coordination
- Easy to reason about
- Used by real production URL shorteners

---

## Detailed Design

Now let's dive into the specifics of how each piece works.

### Pre-Generated Short Codes (The Clever Part)

Instead of generating a unique code every time someone requests a short URL, we pre-generate millions of codes ahead of time.

**How it works:**

1. **Pre-generate a pool of codes:** Generate codes using either:
   - 8 characters from [a-z] (26 characters) = 26^8 ≈ 10^12 combinations, or
   - 7 characters from [a-z][A-Z][0-9] (Base62, 62 characters) = 62^7 ≈ 10^12 combinations
2. **Store with a flag:** Each code has an `is_used` flag in the database
3. **Assign on demand:** When a user wants to shorten a URL, grab an unused code, mark it as used, and associate it with the long URL
4. **Use a second database:** If we are pre-generating urls than storing all of them in our main database will increase latency on our reads. We need to store the pre-generated list in a second database and move 'free' urls into our smaller database which is where we actually read from and write to.
5. **Use a background service:** To both add more free urls and mark is_used as false for urls that have expired we need a background service that runs periodically and adds more urls if our main database is below a certain amount.

**Why this approach wins:**

- **No collisions:** Every code is pre-generated and unique
- **No runtime computation:** Just grab the next available code (simple SELECT and UPDATE)
- **Simple and fast:** Single database transaction, predictable performance, also smaller database to query against.
- **Massive capacity:** 10^12 combinations provides enormous headroom

**The math:**

Both approaches give us approximately 10^12 possible codes - that's a trillion combinations. For detailed calculations on how we arrive at these numbers using the golden rule (2^10 ≈ 10^3), see our guide on [How to Calculate Throughput & Database Size](/learn/size-calculation).

### Scaling Servers

The key insight: **Reads and writes have totally different characteristics.**

**Read Pattern (Redirects)**

- Volume: 10-100x more than writes
- Latency requirement: Super low (under 10ms)
- Pattern: GET operations, read-only

**How to scale:**

- Horizontal scaling (add more read servers) - see [Scaling: Vertical vs Horizontal](/learn/scaling) for details
- Caching (Redis for hot links)
- Database read replicas
- CDN for extremely popular links

**Write Pattern (Shortening)**

- Volume: Much lower
- Latency requirement: Can be 50-100ms, users don't care as much
- Pattern: POST operations, needs to write to database

**How to scale:**

- Usually one server is enough
- If needed, can have a small pool of write servers

This asymmetry is why we separate them.

### Caching Strategy

**The problem:** Even with read replicas, hitting the database for every redirect adds latency.

**The solution:** Cache popular short codes in Redis using the cache-aside pattern. For a deep dive on caching strategies, eviction policies (LRU vs LFU), and when to use caches vs databases, see our guide on [Databases & Caching](/learn/database-caching).

**Cache-aside pattern:**

```
1. Request comes in for /aB3xY
2. Check Redis
3. Cache hit? Return immediately (~1ms)
4. Cache miss? Query PostgreSQL replica (~5-10ms)
5. Store result in Redis for next time
6. Return the long URL
```

**What to cache:**

- Hot links (top 10% probably get 90% of traffic)
- Can cache indefinitely (short codes don't change)
- Use LRU eviction to keep cache size manageable

**Impact:**

```
Without cache: Every redirect = database hit = 5-10ms
With cache: 90% of redirects = Redis hit = 0.1-1ms

That's a 10x latency improvement for most traffic.
```

### Scaling database

**Database Size**

```sql
CREATE TABLE url_mappings (
  short_code   VARCHAR(7) PRIMARY KEY,
  long_url     TEXT NOT NULL,
  is_used      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiration   TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '5 years')
);
```

**Row size calculation:**

- `short_code`: 7 bytes
- `long_url`: 100 bytes (average)
- `is_used`: 1 byte
- `created_at`: 8 bytes
- `expiration`: 8 bytes
- **Total**: 124 bytes per row (rounded to 150 bytes for overhead)

**Note:** For pre-generated codes (before assignment), we only need `short_code` and `is_used` (8 bytes total).

If we pre-generate in batches of 1 billion URLs, even if we round 150 to 500 bytes per row, our database would need a maximum size of 500 GB per 1 billion URLs generated.

This means after all the URLs are used, the next batch generation would take significant time, so it's worth running this process in the background. We don't need to get too deep into the details for this design.

If we create indexes on `is_used`, we can retrieve the next unused URL very quickly.

**Geographic latency consideration:**

What about dealing with latency geographically? If we have only 1 database, then we have additional latency as our servers query this database depending on its location in the world.

**Master-Replica Setup:**

```

Write Server sends all writes to Master
Master replicates to Read Replicas (2-3 instances)
Read Servers query Replicas instead of Master
Master DB can scale vertically, as we calculated, and we have read copies to reduce network latency.

```

**Why this works:**

- Reduces load on master by 100x
- Read replicas can be geographically distributed closer to our read servers
- Master focuses on writes only

**Replication lag consideration:**

- Usually under 1 second
- For URL shortener, this is fine
- User won't notice if their new short URL takes 1 second to propagate

For a comprehensive guide on when to scale up vs scale out, see [Scaling: Vertical vs Horizontal](/learn/scaling).

## Common Interview Mistakes

### Mistake 1: Generating codes on the fly

"We'll just hash the URL and use the first 6 characters."

**Problem:** Hash collisions. Two different URLs might hash to the same short code.

**Better:** Pre-generate codes. No collisions possible.

### Mistake 2: Not separating reads and writes

"We'll just use one set of servers for everything."

**Problem:** Read traffic overwhelms write logic. Can't scale them independently.

**Better:** Separate read servers from write servers. Scale reads horizontally (see [Scaling: Vertical vs Horizontal](/learn/scaling) for when and how to scale horizontally).

### Mistake 3: Hitting the database for every redirect

"We'll just query PostgreSQL for every GET request."

**Problem:** Database becomes the bottleneck. Latency suffers.

**Better:** Cache hot links in Redis. 90% of requests never hit the database. Learn more about caching strategies in [Databases & Caching](/learn/database-caching).

### Mistake 4: Overcomplicating the write path

"We'll use Kafka and a distributed queue and microservices..."

**Problem:** You're adding complexity for no reason.

**Better:** One write server grabbing pre-generated codes is simple and fast.

### Mistake 5: Not thinking about the read-to-write ratio

"We'll scale everything equally."

**Problem:** Waste of resources. You don't need 100 write servers when you get 10 writes/second.

**Better:** Scale reads aggressively. Keep writes minimal. Follow the traffic pattern.

---

**Interview golden rule:**

Don't just list components. Explain WHY you're making each choice and HOW it handles the specific challenges of a URL shortener (uniqueness, read-heavy traffic, low latency).
