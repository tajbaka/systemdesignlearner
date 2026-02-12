## Introduction

You're in the middle of a system design interview. Your architecture looks solid: clean schemas, caching layer, read replicas humming along. Then the interviewer drops this on you:

"Your database has 10 billion rows and 50TB of data. One PostgreSQL instance can't handle it. What do you do?"

And your gut says: "Just get a bigger server."

So you say that. The interviewer nods slowly, then follows up: "Okay. You've upgraded to the biggest machine AWS offers, 24TB RAM, 448 vCPUs. You're still running out of space and queries are timing out at peak load. Now what?"

And now you're stuck. Because [vertical scaling](/learn/scaling) has a ceiling. There's a biggest machine. And once you hit it, you need a fundamentally different approach.

That approach is sharding.

---

## What Is Sharding

Sharding is horizontal partitioning of your data across multiple database servers. Each server (called a shard) holds a subset of the total data. Together, they hold everything.

This is different from replication. Replication copies the same data across multiple servers for redundancy and read throughput. Sharding splits the data so each server only has a portion of it.

Think of it this way:

- **Replication:** 3 servers, each with ALL your data
- **Sharding:** 3 servers, each with 1/3 of your data

Here's what it looks like:

![Basic sharding architecture](diagram:shard-basic)

Each shard is a fully independent database instance. It has its own CPU, memory, disk, and can handle queries independently. When a request comes in, the system figures out which shard holds the relevant data and routes the query there.

The result: instead of one server struggling with 50TB, you have three servers each comfortably handling ~17TB. You've turned a problem that no single machine could solve into three problems that ordinary machines handle fine.

### How Routing Works

Something has to decide which shard to talk to. This routing can live in different places:

**Application-level routing:** Your application code knows the sharding logic. It computes which shard to query based on the shard key. Simple, but every service that talks to the database needs to know the sharding scheme.

**Proxy-level routing:** A middleware proxy (like Vitess for MySQL, or Citus for PostgreSQL) sits between your app and the shards. Your app sends queries to the proxy, the proxy figures out the shard and forwards the query. Cleaner separation, but adds a network hop.

**Client library routing:** The database driver itself handles routing. Cassandra drivers do this. They know the cluster topology and send queries directly to the right node. Lowest latency, but ties you to a specific driver implementation.

![Shard routing comparison](diagram:shard-routing-comparison)

This applies to both SQL and NoSQL databases, though the mechanics differ. SQL databases like PostgreSQL and MySQL require more manual work to shard (or a proxy like Vitess/Citus). NoSQL databases like [Cassandra and DynamoDB](/learn/database-caching) often have sharding built in from the ground up. But the concept is identical.

### When Do You Actually Need Sharding?

Not every database needs sharding. Here's a rough decision tree:

- **< 100GB data, < 1K QPS:** Single instance is fine. Don't even think about sharding.
- **100GB - 1TB data, 1K-10K QPS:** Vertical scaling, read replicas, [caching](/learn/database-caching), and query optimization will get you far. Still probably don't need sharding.
- **> 1TB data or > 10K QPS on a single node:** Now you're in sharding territory. A single instance is becoming a bottleneck no matter how you optimize.
- **> 10TB data or > 100K QPS:** You definitely need sharding. There's no amount of vertical scaling that fixes this.

The key insight: sharding adds significant operational complexity. Don't do it until you have to.

---

## Shard Key Selection

This is THE most important decision you'll make when sharding. Get the shard key wrong, and you've made your system worse, not better.

The shard key is the column (or set of columns) that determines which shard a row lives on. Every query needs to know which shard to hit, and the shard key is how it figures that out.

### Properties of a Good Shard Key

**1. High cardinality**

The key needs enough distinct values to spread data across many shards. A boolean field like `is_active` has two values, making it a terrible shard key. You'd put half your data on one shard and half on the other, and you couldn't split further.

How many distinct values do you need? At minimum, several times more than the number of shards you'll ever have. If you think you might scale to 100 shards someday, you need at least thousands of distinct key values. UUIDs and auto-incrementing IDs have effectively unlimited cardinality. Perfect.

**2. Even distribution**

The key should spread data roughly equally across shards. If 80% of your data ends up on one shard, you haven't solved anything. You've just added complexity to a system that still has a bottleneck.

This is about the real-world distribution of values, not theoretical distribution. An enum field with 10 values has decent cardinality, but if 90% of rows have the value "active," the distribution is terrible.

**3. Matches query patterns**

This one trips people up. The shard key needs to align with how your application actually queries data. If every query filters by `user_id`, then `user_id` is a natural shard key. If you shard by `user_id` but most queries filter by `created_date`, every query has to hit every shard. That's worse than no sharding at all.

Think about your top 5 most frequent queries. What columns do they filter on? That's where your shard key candidates live.

### Good Shard Key Examples

**`user_id` for user-scoped applications**

Most queries in social media, messaging, and e-commerce apps are scoped to a single user. "Get user's orders," "Get user's messages," "Get user's feed." If you shard by `user_id`, all of a user's data lives on one shard, and most queries only hit one shard. This is the most common shard key in practice.

```
Shard by user_id:

Query: "SELECT * FROM orders WHERE user_id = 42"
→ hash(42) → Shard 3
→ Query hits only Shard 3
→ Fast, single-shard lookup

Query: "SELECT * FROM messages WHERE user_id = 42"
→ hash(42) → Shard 3
→ Same shard, same user's data co-located
→ Local JOIN possible
```

**`tenant_id` for multi-tenant SaaS**

Each tenant's data is independent. Queries almost never cross tenant boundaries. Natural fit for sharding. Bonus: you get data isolation between tenants almost for free.

**`geographic_region` for geo-scoped services**

If your service operates across regions and users mostly interact within their region, sharding by geography makes sense. Uber could shard by city, since rides in New York don't need to query data about rides in Tokyo. You can also place shards physically close to the users they serve, reducing latency.

### Bad Shard Key Examples

**`timestamp` or `created_at`**

This is the classic trap. All recent writes hit the same shard (the one holding the current time range). Yesterday's shard sits idle while today's shard is on fire. You've created a perpetual hotspot that moves forward in time.

```
Shard by timestamp (BAD):

Time: Monday
  All writes → Shard for "this week"   (overloaded)
  Last week's shard                     (idle)
  Last month's shard                    (idle)

Time: Tuesday
  All writes → STILL the same shard     (still overloaded)
  Nothing changed. This shard is always hot.
```

**`status` or `category`**

Low cardinality. If you have 5 order statuses, you can have at most 5 shards. And the distribution won't be even, since most orders are probably in "completed" status.

**`email` for a social media app**

Users don't query by email often. They query by user_id, by feed, by friend list. Sharding by email means every common query has to figure out which shard the user's email maps to, adding an unnecessary lookup step.

### Composite Shard Keys

Sometimes a single column isn't enough. You can use a composite shard key, which is a combination of columns.

Example: For a chat application, you might shard by `(user_id, chat_room_id)`. This ensures that all messages in a chat room are on the same shard for a given user, enabling efficient queries for "show me all messages in this room."

MongoDB supports this directly with compound shard keys. DynamoDB does it with composite partition keys.

### The Litmus Test

Ask yourself these three questions:

1. Will data be roughly evenly distributed across this key's values?
2. Can my most common queries be answered by hitting a single shard?
3. Are there enough distinct values to support future growth?

If the answer to all three is yes, you have a good shard key.

---

## Sharding Strategies

There are three main approaches to mapping keys to shards. Each has distinct trade-offs.

### 1. Range-Based Sharding

Partition by value ranges. Shard 1 gets users A-F, Shard 2 gets G-N, Shard 3 gets O-Z.

```
Shard Key: username (first letter)

Shard 1:  A ──────── F
Shard 2:  G ──────── N
Shard 3:  O ──────── Z

Query: "Find user 'Charlie'"
→ 'C' falls in A-F range
→ Route to Shard 1

Query: "Find all users from D to G"
→ Starts in Shard 1 (D-F), continues to Shard 2 (G)
→ Only 2 shards, not all of them
→ Range queries are efficient
```

**How it works:** Define boundaries for each shard. Route queries by checking which range the key falls into. A metadata table or config stores the range boundaries.

**Pros:**

- Simple to understand and implement
- Range queries are efficient (all data in a range is co-located)
- Easy to see which shard holds what data
- Simple to add shards (split an existing range)

**Cons:**

- Prone to hotspots. If most usernames start with S-T, Shard 3 gets hammered
- Uneven distribution unless you carefully tune the ranges
- Adding a new shard means reshuffling range boundaries
- Requires ongoing monitoring and manual range adjustments

**Best for:** Data with natural, well-distributed ranges. Time-series data where you need range queries (but be careful about hot partitions for recent data). Geographic data where queries are region-scoped.

### 2. Hash-Based Sharding

Apply a hash function to the key and use modulo to pick a shard: `shard = hash(key) % num_shards`.

```
Shard Key: user_id
Hash function: MD5 or MurmurHash
Number of shards: 3

user_id = 12345
hash(12345) = 8472910
8472910 % 3 = 1
→ Route to Shard 1

user_id = 12346  (sequential ID, but different shard)
hash(12346) = 2107483
2107483 % 3 = 0
→ Route to Shard 0

user_id = 67890
hash(67890) = 3291047
3291047 % 3 = 2
→ Route to Shard 2
```

Notice how sequential user IDs (12345, 12346) end up on different shards. That's the hash function doing its job, scrambling the input so the output is uniformly distributed.

**How it works:** The hash function scrambles the key into a pseudo-random number, and the modulo operation maps it to a shard. This ensures even distribution regardless of the original key distribution.

**Pros:**

- Even distribution of data across shards (the hash function smooths out any skew)
- No hotspot risk from skewed key distributions
- Simple formula, easy to compute
- Works regardless of the key's natural distribution

**Cons:**

- Range queries become scatter-gather (you can't ask "give me users 1000-2000" efficiently, because they're scattered across all shards)
- Adding or removing shards with simple modulo reshuffles almost everything (more on this in the next section)
- Lose data locality, since related records might land on different shards

**Best for:** Key-value lookups, user-scoped queries, anything where you don't need range queries. This is the most common strategy in practice.

### 3. Directory-Based Sharding

Maintain a lookup table (directory service) that maps each key to its shard.

**Directory Service (Lookup Table):**

| Key    | Shard   |
| ------ | ------- |
| user_1 | Shard 2 |
| user_2 | Shard 1 |
| user_3 | Shard 3 |
| user_4 | Shard 1 |
| user_5 | Shard 2 |
| ...    | ...     |

Query: "Find user_3"
→ Look up user_3 in directory
→ Directory says Shard 3
→ Route to Shard 3

**How it works:** Every query first checks the directory to find out which shard holds the data. The directory can map keys to shards using any logic you want: random, round-robin, custom rules per tenant, etc.

**Pros:**

- Maximum flexibility, letting you move individual keys between shards without changing any algorithm
- Easy to rebalance. Just update the directory entry for the key
- Can handle any distribution pattern
- Can assign specific high-value tenants to dedicated shards

**Cons:**

- The directory is a single point of failure. If it goes down, nothing works
- Every query adds one extra lookup (latency hit)
- The directory itself needs to scale and be highly available (usually backed by a replicated cache or database)
- More complex to operate and debug

**Best for:** Systems that need fine-grained control over data placement. Multi-tenant systems where tenants vary wildly in size (small tenants share shards, large tenants get dedicated ones).

### Strategy Comparison

| Aspect               | Range-Based              | Hash-Based                         | Directory-Based          |
| -------------------- | ------------------------ | ---------------------------------- | ------------------------ |
| **Distribution**     | Can be uneven            | Very even                          | Configurable             |
| **Range queries**    | Efficient                | Scatter-gather                     | Depends on mapping       |
| **Hotspot risk**     | High                     | Low                                | Low (if managed well)    |
| **Rebalancing**      | Move range boundaries    | Rehash (or use consistent hashing) | Update directory         |
| **Complexity**       | Low                      | Low                                | High                     |
| **Extra dependency** | None                     | None                               | Directory service        |
| **Adding shards**    | Adjust ranges            | Reshuffles data (modulo)           | Update directory entries |
| **Best for**         | Range queries, time data | Even load, key lookups             | Fine-grained control     |

**Interview default:** Hash-based with consistent hashing (next section) is the safe answer for most scenarios. Mention range-based if the interviewer asks about range queries, and directory-based if you need per-tenant flexibility.

---

## Consistent Hashing

Here's the problem with basic hash-based sharding.

You have 3 shards. You're using `hash(key) % 3` to route data. Life is good.

Now you need to add a 4th shard. Your formula changes to `hash(key) % 4`. What happens?

Almost every key maps to a different shard. If you have 1 million keys, roughly 750,000 of them need to move. That's a massive data migration just to add one server. And during the migration, your system is in an inconsistent state where queries might hit the wrong shard and return stale or missing data.

```
Before (3 shards):                After (4 shards):
hash(key) % 3                    hash(key) % 4

key_1 → Shard 0                  key_1 → Shard 1  (MOVED)
key_2 → Shard 1                  key_2 → Shard 2  (MOVED)
key_3 → Shard 2                  key_3 → Shard 3  (MOVED)
key_4 → Shard 1                  key_4 → Shard 0  (MOVED)
key_5 → Shard 2                  key_5 → Shard 1  (MOVED)
key_6 → Shard 0                  key_6 → Shard 2  (MOVED)

Result: ~75% of keys need to move.
For 1 billion keys, that's 750 million rows migrating.
During migration: inconsistent reads, increased latency,
                  risk of data loss or duplication.
```

This is terrible. You can't just casually add a shard. It's a major migration event. Consistent hashing solves this.

### How It Works

Instead of `hash % N`, arrange all possible hash values on a ring (from 0 to 2^32 or some large number). Place your shards at positions on the ring. To find which shard owns a key, hash the key and walk clockwise around the ring until you hit a shard.

![Consistent hashing ring](diagram:shard-consistent-hashing)

Each shard "owns" the arc of the ring between itself and the previous shard (going clockwise). Shard B owns positions 1-90, Shard C owns 91-180, and so on.

### Why This Is Better

When you add or remove a shard, only the keys between the new/removed shard and its predecessor on the ring need to move. On average, only `K/N` keys move (where K is total keys and N is number of shards), instead of nearly all of them.

```
Adding Shard E at position 135:

Before:
  Shard B owns: 1-90
  Shard C owns: 91-180    ← all keys here go to C
  Shard D owns: 181-270

After:
  Shard B owns: 1-90
  Shard E owns: 91-135    ← these keys move FROM C to E
  Shard C owns: 136-180   ← these keys STAY on C
  Shard D owns: 181-270   ← unchanged

Only keys in range 91-135 moved.
Shards A, B, and D are completely unaffected.
No data migration for 75% of the ring.
```

That's about 1/N of the total keys, instead of (N-1)/N. For 4 shards, you're moving ~25% of keys instead of ~75%. For 100 shards, you're moving ~1% instead of ~99%. The math gets dramatically better as you scale.

### Removing a Shard

The same principle applies in reverse. If Shard C goes down or needs to be decommissioned:

```
Removing Shard C (position 180):

Before:
  Shard C owns: 91-180

After:
  Shard C's keys (91-180) → absorbed by next clockwise shard (Shard D)
  All other shards: unchanged

Only C's keys move. Everything else stays put.
```

### Virtual Nodes

There's one more problem. With just 4 shards on the ring, the distribution can be uneven. One shard might own a huge arc of the ring while another owns a tiny slice. In the worst case, 3 shards cluster together on one side of the ring, and the 4th shard owns 75% of the keyspace.

The fix: virtual nodes. Instead of placing each shard at one position on the ring, place it at many positions (say, 100-200 virtual nodes per shard). This gives a much more even distribution.

```
Physical Shards: A, B, C

Without virtual nodes (uneven):
  Ring: A ............ B .. C ....
  Shard A owns ~60% of the ring (too much!)
  Shard B owns ~10% (too little!)
  Shard C owns ~30%

With virtual nodes (even):
  Ring: A1 B2 C1 A3 B1 C3 A2 C2 B3 A4 B4 C4 ...
  Each physical shard has many positions
  Shard A owns ~33% of the ring
  Shard B owns ~33%
  Shard C owns ~33%

Typical: 100-200 virtual nodes per physical shard.
More virtual nodes = more even distribution.
```

Virtual nodes also make rebalancing smoother. When you add a new shard D, it takes over some virtual node positions from each existing shard, pulling a roughly equal amount of data from A, B, and C. No single shard bears the full cost of the rebalance.

### The Numbers

Here's a comparison to drive the point home:

| Operation        | Simple Modulo (hash % N) | Consistent Hashing        |
| ---------------- | ------------------------ | ------------------------- |
| Adding 1 shard   | ~75% of keys move        | ~25% of keys move (1/N)   |
| Adding 1 to 100  | ~99% of keys move        | ~1% of keys move (1/N)    |
| Removing 1 shard | ~75% of keys move        | ~25% of keys move (1/N)   |
| Distribution     | Even                     | Even (with virtual nodes) |
| Implementation   | Trivial                  | Moderate                  |
| Range queries    | Not supported            | Not supported             |

### Real-World Usage

Redis Cluster uses a variant of this idea. It divides the keyspace into 16,384 hash slots. Each key is mapped to a slot via `CRC16(key) % 16384`, and slots are assigned to nodes. When you add a node, you move some slots to it. This is conceptually the same as consistent hashing with virtual nodes, where the [hash slots act like fixed virtual node positions](/learn/redis-sorted-sets). The 16,384 slots are pre-defined positions on the ring, and you just reassign which node owns each slot.

Cassandra uses consistent hashing with virtual nodes (called "vnodes") as its core partitioning strategy. Each node defaults to 256 virtual nodes on the ring.

DynamoDB uses consistent hashing internally, though Amazon abstracts it away. You just specify your partition key, and DynamoDB handles the ring, rebalancing, and data movement automatically.

**Interview tip:** Always mention consistent hashing when discussing sharding. If you just say `hash(key) % N`, the interviewer will ask what happens when you add a shard. Consistent hashing is the answer they want.

---

## Cross-Shard Queries and Joins

This is the biggest pain point of sharding. It's the cost you pay for distributing your data.

### The Problem

In a single database, you can join any table with any other table. Want to find all orders from users in California? Easy. Just JOIN users and orders, filter by state.

Once you shard, that query might need data from multiple shards. User data for California is spread across all shards (because you sharded by user_id, not by state). Now you need to:

1. Send the query to every shard (scatter)
2. Collect partial results from each shard (gather)
3. Merge and sort the results in the application layer

This is called **scatter-gather**, and it's slow. If you have 20 shards, one slow shard makes the entire query slow. You're only as fast as your slowest shard.

```
Query: "Find all orders over $100 placed this week"

Single Database:
  → 1 query, 1 result set, done.
  → Latency: ~50ms

Sharded (10 shards):
  Application Layer
    ├── Query Shard 1  → partial results  (45ms)
    ├── Query Shard 2  → partial results  (38ms)
    ├── Query Shard 3  → partial results  (92ms) ← slow shard
    ├── Query Shard 4  → partial results  (41ms)
    ├── ...
    └── Query Shard 10 → partial results  (44ms)
         ↓
    Merge all 10 result sets
    Sort merged results
    Return to client

  Total latency: 92ms (slowest shard) + merge time
  10x the network calls, 10x the connections,
  plus CPU overhead of merging in the application.
```

Cross-shard JOINs are even worse. Joining a user table on Shard 3 with an orders table on Shard 7 means pulling data from both shards to the application layer and joining in memory. This is orders of magnitude slower than a database-level JOIN.

### Solutions

**1. Denormalize**

Duplicate data so queries don't need to cross shards. If you frequently need user name alongside order data, store the user name directly in the orders table. Yes, this violates normal form. Yes, updates are harder (you need to update the name in two places). But it eliminates cross-shard joins for that query.

This is a trade-off: more storage and write complexity in exchange for simpler reads. In read-heavy systems (which most are), it's usually worth it.

**2. Co-locate related data**

Design your shard key so that data queried together lives on the same shard. If you always query users and their orders together, shard both tables by `user_id`. All of user 42's orders will be on the same shard as user 42. The JOIN stays local to one shard.

```
Co-location by user_id:

Shard 3 contains:
  users table:   user_id=42, name="Alice", ...
  orders table:  order_id=1001, user_id=42, ...
  orders table:  order_id=1002, user_id=42, ...
  messages table: msg_id=5001, user_id=42, ...

Query: "SELECT u.name, o.total FROM users u
        JOIN orders o ON u.user_id = o.user_id
        WHERE u.user_id = 42"

→ Entirely on Shard 3. Local JOIN, fast.
```

This is the most powerful technique. Design your schema so that the most common queries only need data from a single shard.

**3. Application-level joins**

Query each shard separately, pull the results into your application, and join in code. This works for small result sets but doesn't scale for large ones. Use this as a last resort, not a default strategy.

**4. Global tables**

Some data is small and rarely changes: country codes, configuration settings, product categories, currency exchange rates. Replicate these tables to every shard. Now they're available for local JOINs on any shard without cross-shard communication.

The downside: updates to global tables need to propagate to all shards. For data that changes once a month, this is fine. For data that changes every second, use a different approach.

**5. Separate analytics store**

Sometimes the best solution is to not run analytics queries on your sharded OLTP database at all. Replicate data into a separate analytics database (like a data warehouse like BigQuery, Redshift, or Snowflake) and run cross-cutting queries there. Your sharded database stays fast for transactional queries, and your analytics store handles the aggregation.

### Global Secondary Indexes

Some sharded databases support global secondary indexes, which are indexes that span all shards. DynamoDB has this feature (Global Secondary Indexes or GSIs). It lets you query on non-shard-key attributes without scatter-gather.

The catch: GSIs are eventually consistent. The index update lags behind the primary data. And they consume additional write capacity. They're useful but not a free lunch.

### The Rule

If you find yourself doing cross-shard queries frequently, one of three things is wrong: your shard key doesn't match your query patterns, your schema isn't designed for sharding, or you shouldn't be sharding at all.

In an interview, acknowledge cross-shard queries as the main downside of sharding. Then explain how you'd design around them. That's what the interviewer wants to hear that sharding is a silver bullet. They want to know that you understand its costs and know how to mitigate them.

---

## Rebalancing and Hotspots

Your shards won't stay balanced forever. Data grows, traffic shifts, and some shards inevitably get hotter than others. You need a plan.

### The Hotspot Problem

Even with a good shard key, hotspots happen.

**The celebrity problem:** One user has 50 million followers. Every time they post, 50 million fan-out operations hit the shard holding their data. That shard melts while the others are idle. A single viral tweet can take down one shard in a 100-shard cluster.

**Growth skew:** You sharded by user_id, and it was even at first. But one shard ended up with a disproportionate number of power users who generate 100x the average data volume. That shard runs out of disk while others have plenty of space.

**Temporal patterns:** An e-commerce site sharded by seller_id. During a flash sale, one seller gets 90% of all traffic. Their shard can't keep up. Black Friday makes this worse, because a few popular sellers get hit enormously harder than others.

### Detecting Hotspots

Monitor these metrics per shard:

- **CPU utilization**: are some shards consistently hotter?
- **Query latency (p99)**: is one shard slower than the rest?
- **Disk usage**: is one shard filling up faster?
- **QPS (queries per second)**: is traffic evenly distributed?
- **Replication lag**: is one shard's replica falling behind?

If one shard is consistently 3-5x hotter than the average, you have a hotspot. Set up alerts for these thresholds so you catch problems before they become outages.

### Solutions

**1. Split hot shards**

Take the overloaded shard and split it into two. If Shard 3 holds users 1M-2M and it's overloaded, split it into Shard 3A (users 1M-1.5M) and Shard 3B (users 1.5M-2M). This is easier with consistent hashing, since you're just adding a node and moving a portion of the data.

The split needs to be online (no downtime). Most sharded databases support online shard splitting, but it takes time, because you're copying data while serving live traffic.

**2. Dedicated shards for hot keys**

If a single key is causing the hotspot (the celebrity problem), give it its own shard. Twitter reportedly has this kind of approach for extremely high-traffic accounts. The routing logic just has special cases for known hot keys.

```
Routing Logic:

if user_id in HOT_KEYS:
    route to dedicated_shard[user_id]
else:
    route to hash(user_id) % num_shards

HOT_KEYS = {
    "celebrity_123": shard_99,
    "viral_brand_456": shard_100,
}
```

This is a pragmatic, real-world solution. It's ugly, but it works.

**3. Consistent hashing with virtual nodes**

Already covered above, but it helps here too. When you add a new shard to absorb a hotspot, virtual nodes ensure it takes a proportional amount of load from each existing shard. This naturally spreads the load more evenly and avoids dumping all the migration cost on a single shard.

**4. Read replicas per shard**

If the hotspot is read-heavy (lots of people viewing the celebrity's profile), add read replicas to that specific shard. Writes still go to the primary, but reads are distributed across replicas. This is combining [replication with sharding](/learn/scaling), where each shard can independently have its own replicas.

```
Normal shard: 1 primary, 1 replica
Hot shard:    1 primary, 5 replicas

Reads are distributed across all replicas.
Write throughput is unchanged (still 1 primary).
This only helps for read-heavy hotspots.
```

**5. Application-level caching for hot keys**

Cache the hot key's data aggressively. If the celebrity's profile is being read 100K times per second, that should be hitting your [Redis or Memcached cache](/learn/database-caching), not your shard. A properly configured cache can absorb 99% of reads for hot keys, reducing the shard's load to manageable levels.

### Automated vs Manual Rebalancing

**Manual rebalancing:**

- You monitor dashboards and decide when/how to split
- More control, less risk of cascading failures
- Slower to react to sudden spikes
- MongoDB, for example, lets you manually move chunks between shards
- Good for smaller deployments (< 20 shards) where you know your data

**Automated rebalancing:**

- The system detects imbalances and redistributes data automatically
- Faster reaction time, with no human in the loop
- Risk of thrashing (constantly moving data back and forth if the threshold is too sensitive)
- Cassandra and DynamoDB handle rebalancing automatically
- Better for large-scale deployments (100+ shards) where manual monitoring isn't feasible

**The trade-off:** Automated is better for large-scale systems. Manual is safer when you're starting out or when the cost of a bad rebalance is high (moving data costs I/O and can increase latency during migration).

In interviews, mention both approaches and explain the trade-off. Don't just say "the system handles it automatically." Interviewers want to know you understand what's happening underneath.

---

## Common Interview Mistakes

### Mistake 1: Sharding by Timestamp

> "I'll shard by created_at so recent data is together."

**Problem:** All current writes hit the same shard. Yesterday's shard is idle, today's shard is a burning wreck. You've created a write hotspot that moves forward in time. Every insert, every new user, every new order, all hammering one shard while the rest sit around doing nothing.

**Better:** Shard by user_id or another high-cardinality key that distributes writes evenly across all shards. If you need time-based queries, build a secondary index or use a separate time-series database (like TimescaleDB or InfluxDB) for that access pattern.

### Mistake 2: Jumping to Sharding Too Early

> "We have 100GB of data, so we need to shard."

**Problem:** 100GB fits comfortably on a single PostgreSQL instance. A decent server with 256GB RAM can hold the entire dataset in memory. Sharding adds massive operational complexity: cross-shard queries, rebalancing, more servers to monitor, more failure modes, harder debugging, slower development velocity. You've made your system 10x more complex to solve a problem that doesn't exist yet.

**Better:** Exhaust simpler options first. Vertical scaling (bigger machine), read replicas for read-heavy workloads, better indexing, query optimization, connection pooling, [caching layer](/learn/database-caching). Only shard when you've genuinely hit the limits of a single machine, typically 1TB+ of data or 10K+ QPS that a single instance can't handle even after optimization.

### Mistake 3: Forgetting About Cross-Shard Queries

> "I'll shard by user_id and everything will be fast."

**Problem:** What about your admin dashboard that shows all orders across all users? What about search? What about analytics queries that aggregate across the entire dataset? What about "find all users who signed up this week"? Sharding by user_id doesn't make those queries go away. It makes them slower and harder.

**Better:** Acknowledge the trade-off upfront. Explain that user-scoped queries will be fast (single shard), but cross-cutting queries will use scatter-gather or a separate analytics store. Mention denormalization and co-location strategies. Show the interviewer you understand the cost, not just the benefit.

### Mistake 4: Not Mentioning Consistent Hashing

> "I'll use hash(user_id) % num_shards to route data."

**Problem:** The interviewer's next question will be: "What happens when you need to add a shard?" With simple modulo, adding one shard reshuffles 75%+ of your data. That's a massive, risky migration that causes downtime or inconsistency.

**Better:** Say "hash-based sharding with consistent hashing." Then explain the ring, why only K/N keys move when you add a node, and how virtual nodes improve distribution. This shows you understand the operational reality, not just the textbook definition.

---

## Summary: What to Remember

- Sharding is horizontal partitioning of data across multiple database servers. Each shard holds a subset of the total data
- It's different from replication: replication copies everything, sharding splits the data
- The shard key is the most critical decision. It needs high cardinality, even distribution, and alignment with query patterns
- `user_id` is the most common shard key. `timestamp` is almost always wrong
- Three strategies: range-based (good for range queries, risky for hotspots), hash-based (even distribution, no range queries), directory-based (flexible but complex)
- Consistent hashing solves the "adding/removing shards" problem. Only K/N keys move instead of (N-1)/N
- Virtual nodes (100-200 per physical shard) improve distribution on the consistent hashing ring
- Cross-shard queries are the biggest pain point. Design your schema to avoid them
- Denormalization, co-location, and global tables reduce cross-shard query needs
- Monitor for hotspots: CPU, latency, disk, and QPS per shard
- Celebrity problem: use dedicated shards, extra replicas, or aggressive caching for hot keys
- Don't shard prematurely. Exhaust vertical scaling, read replicas, caching, and indexing first
- The threshold: consider sharding at >1TB data or >10K QPS that a single instance can't handle
- Hash-based sharding with consistent hashing is the safe default for most interview scenarios

**Interview golden rule:**

```
Don't jump to sharding as your first answer. Show the interviewer
you understand the progression: vertical scaling → read replicas
→ caching → sharding. And when you do shard, always mention
consistent hashing and the cross-shard query trade-off.
```
