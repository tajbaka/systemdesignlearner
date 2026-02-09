## Introduction

Alright, real talk: You're in that system design interview, crushing it, drawing your boxes and arrows. Then the interviewer hits you with: "So how are you handling caching here? What eviction policy makes sense?"

And suddenly you're frozen. LRU? LFU? Wait, what's the difference again? Do I even need a cache? Can't I just use Redis for everything?

Here's everything you actually need to know about databases, caching, and when to use what.

---

## The Core Concept: Different Tools for Different Jobs

**Databases and caches are NOT interchangeable**. They're built for completely different purposes.

### Database = Correctness

Your database is the source of truth. Period.

**What it guarantees:**

- Your data survives crashes (durability)
- Rules get enforced (consistency)
- Data stays correct over time

**The tradeoff:**

- Slower reads (5-50ms for disk, 10-100ms+ for distributed)
- Disk I/O, replication, query planning all add latency

### Cache = Speed

Your cache is for making shit fast. That's it.

**What it gives you:**

- Lightning-fast reads (~0.1-1ms in-memory)
- Reduces load on your database
- Better performance under traffic spikes

**The tradeoff:**

- Data can be stale
- Data can be evicted whenever
- NOT a system of record

**Remember this:**

```
Database → You need the RIGHT answer
Cache → You need the FAST answer
```

---

## The Standard Pattern: Cache-Aside

Almost every system you'll design in an interview uses this flow:

```
Request → Cache → Database
```

**How it works:**

1. Check cache first
2. **Cache hit?** → Return immediately (fast path)
3. **Cache miss?** → Query DB, populate cache, return (slow path)

**Why this pattern wins:**

- Reduces database load by 70-90%
- Improves latency dramatically
- Scales better under traffic spikes
- Simple to implement and reason about

In interviews, this is your default starting point. Don't overthink it.

---

## Cache Eviction: LRU vs LFU

Memory is limited, so caches need to kick stuff out. Here's what you need to know.

### LRU (Least Recently Used)

**The rule:** Evict whatever hasn't been accessed in the longest time.

**When to use it:**

- Web requests
- User sessions
- Recently viewed items
- API responses

**Why it works:**

- Simple and predictable
- Temporal locality: "recently used = likely to be used again"
- Works well in like 90% of real systems

**The downside:**

- A frequently-used item that goes idle for a bit can get evicted

### LFU (Least Frequently Used)

**The rule:** Evict the item with the lowest access count.

**When to use it:**

- Trending content
- Configuration values
- Popular lookup tables
- Long-term hot keys

**Why it works:**

- Protects consistently popular data
- Better for stable, long-term access patterns

**The downside:**

- More complex to implement
- Needs decay logic (or old popularity dominates forever)
- Higher memory and CPU overhead

### Quick Decision Table

| Scenario                | Better Choice |
| ----------------------- | ------------- |
| Web requests            | LRU           |
| User sessions           | LRU           |
| Hot configuration       | LFU           |
| Recommendation features | LFU           |
| General purpose cache   | LRU           |

**Interview tip:** Start with LRU. Only switch to LFU if you have a specific reason (like "we have a small set of very popular items that should never be evicted").

---

## SQL vs NoSQL: The Real Differences

This isn't about old tech vs new tech. It's about **data shape and access patterns**.

### SQL Databases

**Examples:** PostgreSQL, MySQL, SQL Server

**Strengths:**

- Strong consistency
- Complex joins
- Transactions (ACID guarantees)
- Enforced schema

**Use SQL when you need:**

- Financial data
- User accounts
- Orders and payments
- Anything with strong relationships between data

**The tradeoffs:**

- Harder to scale horizontally
- Schema migrations require planning

### NoSQL Databases

**Examples:** MongoDB, DynamoDB, Cassandra

**Strengths:**

- Easy horizontal scaling
- Flexible schema
- High write throughput
- Built for massive scale

**Use NoSQL when you have:**

- Event data
- Logs
- Session storage
- Large-scale read/write workloads

**The tradeoffs:**

- Weaker consistency (often eventual)
- No joins (you handle relationships in code)
- You're responsible for data integrity

### Quick Decision Table

| Use Case        | SQL   | NoSQL |
| --------------- | ----- | ----- |
| User accounts   | Yes   | No    |
| Payments        | Yes   | No    |
| Session storage | No    | Yes   |
| Event logs      | No    | Yes   |
| Analytics       | Maybe | Yes   |
| Caching         | No    | Yes   |

## The Biggest Mistake: Mixing Up Responsibilities

**Don't do this:**

- Hitting PostgreSQL on every request instead of caching
- Storing critical data ONLY in Redis
- Using NoSQL to avoid thinking about schema design

**The correct mindset:**

```
Database = guarantees correctness
Cache = provides speed
SQL = structured data with relationships
NoSQL = scale and flexibility
```

Choose based on requirements, not hype.

---

## How This Looks in Real Systems

Here's the stack you'll probably draw in interviews:

```
Client
  ↓
API Server
  ↓
Cache (Redis with LRU)
  ↓
Databases:
  - SQL (PostgreSQL for user data, payments)
  - NoSQL (Cassandra for event logs, analytics)
```

**Each layer has a job:**

- Cache absorbs 70-90% of read load
- SQL database handles critical transactional data
- NoSQL database handles high-volume event data
- Application coordinates consistency between them

---

## Latency Numbers You Should Know

Memorize these, they'll save you in back-of-envelope calculations:

| Operation               | Latency   |
| ----------------------- | --------- |
| In-memory cache (Redis) | ~0.1-1ms  |
| Disk-based database     | 5-50ms    |
| Distributed database    | 10-100ms+ |

**Rule of thumb:** A cache is 10-100x faster than a database read.

---

## Summary: What to Remember for Interviews

**The core principles:**

1. Caches make systems fast, not correct
2. Databases make systems correct, not fast
3. Default to LRU unless you have a specific reason for LFU
4. SQL for structured data with relationships
5. NoSQL for scale and flexible schemas

**The standard architecture:**

- Request → Cache → Database
- Cache hit = fast path (~1ms)
- Cache miss = slow path (~50ms)

**Common interview mistakes to avoid:**

- Using database as a cache
- Using cache as a database
- Picking NoSQL "because it scales" without understanding the tradeoffs

Now you know when to apply what.
