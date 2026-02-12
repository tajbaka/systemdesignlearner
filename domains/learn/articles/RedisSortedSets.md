## Introduction

You're designing a leaderboard. Maybe it's a gaming platform, maybe it's a social feed ranked by engagement, maybe it's a real-time auction system. You tell the interviewer: "I'll use Redis sorted sets for the ranking layer."

The interviewer nods. Then:

"You chose Redis for ranking. Why not just ORDER BY score DESC?"

Here's the answer that gets you into trouble:

"Redis is faster than SQL."

That's not wrong. But it's not enough. The follow-up is coming:

"How much faster? What's the time complexity? What happens when your leaderboard has 50 million users and you need the top 10? What about ties? What about persistence if Redis crashes? How do you shard this across multiple nodes?"

If you can't answer those, you've just told the interviewer you picked Redis because you heard it was fast, not because you understood the trade-offs.

This article gives you everything you need to answer those questions confidently.

---

## What Is a Sorted Set

A sorted set is a Redis data structure where every element has two things: a member (a unique string) and a score (a 64-bit floating point number). Redis keeps these elements sorted by score at all times. Not when you query. Not in the background. Every single write maintains sort order.

That's the key insight: **the sorting work happens on write, not on read**. When the interviewer asks why not SQL, that's your answer. SQL sorts on read (ORDER BY). Redis sorts on write (ZADD). For a leaderboard where reads vastly outnumber writes, you want the expensive work done on the write path.

There are five commands you need to know cold.

**ZADD**: Add or update a member with a score.

```
ZADD leaderboard 1500 "player:alice"
ZADD leaderboard 2300 "player:bob"
ZADD leaderboard 1800 "player:charlie"
ZADD leaderboard 2300 "player:diana"
```

If the member already exists, ZADD updates the score. This is how you handle score changes; you don't need a separate UPDATE command. ZADD is an upsert.

**ZRANGE**: Get members by rank, lowest to highest.

```
ZRANGE leaderboard 0 -1 WITHSCORES
1) "player:alice"
2) "1500"
3) "player:charlie"
4) "1800"
5) "player:bob"
6) "2300"
7) "player:diana"
8) "2300"
```

The `0 -1` means "from rank 0 to the last element." The `WITHSCORES` flag includes scores in the output. Without it you just get member names.

**ZREVRANGE**: Get members by rank, highest to lowest.

```
ZREVRANGE leaderboard 0 2 WITHSCORES
1) "player:bob"
2) "2300"
3) "player:diana"
4) "2300"
5) "player:charlie"
6) "1800"
```

This is your "top K" command. `ZREVRANGE leaderboard 0 9` gives you the top 10. The `REV` means reverse, so highest score first, which is what you almost always want for leaderboards.

**ZRANK / ZREVRANK**: Get a member's rank.

```
ZRANK leaderboard "player:charlie"
(integer) 1

ZREVRANK leaderboard "player:charlie"
(integer) 2
```

ZRANK returns the zero-based rank from lowest to highest. ZREVRANK returns it from highest to lowest. For a leaderboard, you want ZREVRANK. Rank 0 is first place.

**ZSCORE**: Get a member's score.

```
ZSCORE leaderboard "player:alice"
"1500"
```

Simple lookup. O(1) because Redis maintains a hash table from member to score internally.

Those five commands (ZADD, ZRANGE, ZREVRANGE, ZRANK/ZREVRANK, ZSCORE) cover about 95% of what you'll need in an interview. Know them by heart.

---

## How Redis Keeps Things Sorted

Here's where you separate yourself from candidates who just memorized commands. The interviewer wants to know the internals. Not every detail, but enough to justify your design choice.

Redis sorted sets use a **dual data structure**: a skip list and a hash table, working together.

![Redis sorted set dual structure](diagram:redis-dual-structure)

**The hash table** maps each member to its score. That's how ZSCORE runs in O(1): it's just a hash lookup. No traversal needed.

**The skip list** maintains elements in sorted order by score. This is where the interesting stuff happens.

A skip list is a probabilistic data structure. Think of it as multiple layers of linked lists stacked on top of each other. The bottom layer contains every element in sorted order. Each layer above is a "fast lane" that skips over elements, letting you traverse the list faster.

![Skip list data structure](diagram:redis-skip-list)

When you insert a new element, you traverse from the top level down, moving right when the next element's score is still less than your target. Each level you drop down narrows the search range. It's similar to binary search but on a linked list.

The "probabilistic" part: when you add a new element, Redis flips a coin to decide how many levels it should appear in. On average, half the elements appear in level 1, a quarter in level 2, and so on. This gives you balanced performance without the rebalancing overhead of a B-tree.

For a deeper look at skip lists and how they compare to other structures, check out [Data Structures for System Design](/learn/data-structures).

**The complexity numbers you need:**

```
Operation              Time Complexity
─────────────────────────────────────
ZADD (insert/update)   O(log n)
ZREM (remove)          O(log n)
ZRANK / ZREVRANK       O(log n)
ZSCORE                 O(1)
ZRANGE / ZREVRANGE     O(log n + k)
ZCARD (count)          O(1)
```

The `k` in ZRANGE's complexity is the number of elements returned. So getting the top 10 from a set of 50 million elements is O(log 50,000,000 + 10) = roughly O(25 + 10) = O(35). That's why it's fast. You're not scanning the whole set. You're jumping to the right rank via the skip list and then walking forward.

This is the answer to "Why not ORDER BY score DESC?" A SQL query with ORDER BY on an unindexed column does a full table scan: O(n). Even with an index, you're dealing with disk I/O, query planning overhead, and locking. Redis does it in O(log n + k) entirely in memory with zero locking (single-threaded event loop).

---

## Core Leaderboard Operations

Let's walk through the four operations every leaderboard needs, with the exact Redis commands.

### Update a User's Score

When a player finishes a game and earns 250 points:

```
ZADD leaderboard 250 "player:42"
```

If player:42 already exists, this replaces their score. If you want to add to their existing score instead:

```
ZINCRBY leaderboard 250 "player:42"
```

ZINCRBY is atomic. Two concurrent game results for the same player won't lose data. Redis processes commands sequentially (single-threaded), so one ZINCRBY happens before the other. No race conditions. No locks. No transactions needed.

```
Before:  player:42 → 1500
ZINCRBY leaderboard 250 "player:42"
After:   player:42 → 1750
```

Time complexity: O(log n) for both ZADD and ZINCRBY.

### Get the Top K Players

"Show me the top 10 on the leaderboard."

```
ZREVRANGE leaderboard 0 9 WITHSCORES
 1) "player:7"
 2) "98500"
 3) "player:23"
 4) "97200"
 5) "player:42"
 6) "95100"
 7) "player:11"
 8) "93800"
 9) "player:56"
10) "92400"
11) "player:3"
12) "91700"
13) "player:89"
14) "90300"
15) "player:15"
16) "88900"
17) "player:67"
18) "87600"
19) "player:31"
20) "86200"
```

That's it. One command. O(log n + k) where k = 10. On a set of 50 million members, this takes under a millisecond.

Compare that to SQL:

```sql
SELECT user_id, score
FROM leaderboard
ORDER BY score DESC
LIMIT 10;
```

Even with an index on `score`, you're hitting disk, going through the query planner, and dealing with row locks if other writes are happening. Under heavy load, that query can take 10-50ms. The Redis version takes <1ms consistently.

### Get a Specific User's Rank

"Where does player:42 stand?"

```
ZREVRANK leaderboard "player:42"
(integer) 2
```

Rank 2 means third place (zero-indexed). If you want to display "3rd place" to the user, add 1.

To get both rank and score in one round trip, pipeline the commands:

```
ZREVRANK leaderboard "player:42"
ZSCORE leaderboard "player:42"
```

Redis pipelining sends multiple commands without waiting for each response, reducing network round trips. Both responses come back in a single network call.

Time complexity: O(log n) for ZREVRANK, O(1) for ZSCORE.

### Get a Player's Neighborhood

"Show me 5 players above and 5 players below player:42."

First, get the rank:

```
ZREVRANK leaderboard "player:42"
(integer) 4527
```

Then get the range around that rank:

```
ZREVRANGE leaderboard 4522 4532 WITHSCORES
```

That gives you ranks 4522 through 4532: five above, the player, and five below. Two commands, two O(log n + k) operations, still under a millisecond.

This is a common UX pattern: showing a player their local context on the leaderboard rather than just their raw rank number. It's also a common interview question, so make sure you know how to do it.

```
Rank 4523:  player:88   → 45,230
Rank 4524:  player:12   → 45,180
Rank 4525:  player:91   → 45,120    ← 5 above
Rank 4526:  player:34   → 45,050
Rank 4527:  player:77   → 45,000
─────────────────────────────────────
Rank 4528:  player:42   → 44,950    ← YOU ARE HERE
─────────────────────────────────────
Rank 4529:  player:63   → 44,900
Rank 4530:  player:19   → 44,850
Rank 4531:  player:55   → 44,780    ← 5 below
Rank 4532:  player:28   → 44,700
Rank 4533:  player:71   → 44,650
```

---

## Handling Ties and Score Expiry

### Tie-Breaking

Here's something a lot of candidates miss: when two members have the same score, Redis sorts them **lexicographically by member name**. Not by insertion order. Not randomly. Alphabetically.

```
ZADD leaderboard 2300 "player:bob"
ZADD leaderboard 2300 "player:diana"

ZREVRANGE leaderboard 0 1 WITHSCORES
1) "player:diana"
2) "2300"
3) "player:bob"
4) "2300"
```

Wait, why is Diana first? Because in ZREVRANGE (reverse order), when scores are equal, Redis sorts members in reverse lexicographic order. "player:diana" > "player:bob" lexicographically, so Diana comes first in the reversed result.

For most leaderboards, lexicographic tie-breaking isn't what you want. The business requirement is usually "if two players have the same score, the one who achieved it first ranks higher."

The solution: **composite scores**.

Encode the timestamp into the score itself. If your scores are integers and fit within a reasonable range, multiply the score by a large constant and add a time component:

```
composite_score = (score * 1000000) + (MAX_TIMESTAMP - actual_timestamp)
```

The `MAX_TIMESTAMP - actual_timestamp` part is crucial. It makes earlier timestamps produce larger composite scores, so the player who got the score first ranks higher when scores are tied.

```
Player A scores 500 points at timestamp 1000:
  composite = 500 * 1000000 + (9999999 - 1000) = 500,009,998,999

Player B scores 500 points at timestamp 2000:
  composite = 500 * 1000000 + (9999999 - 2000) = 500,009,997,999

Player A's composite > Player B's composite
→ Player A ranks higher (achieved the score first)
```

```
ZADD leaderboard 500009998999 "player:A"
ZADD leaderboard 500009997999 "player:B"

ZREVRANGE leaderboard 0 1 WITHSCORES
1) "player:A"
2) "500009998999"
3) "player:B"
4) "500009997999"
```

To display the actual score, your application divides the composite score by 1,000,000 and floors it: `floor(500009998999 / 1000000) = 500`.

Be aware of precision limits. Redis scores are IEEE 754 double-precision floats, which give you 53 bits of integer precision. That's up to 2^53 (about 9 quadrillion), so you have plenty of room for composite scores as long as your score and timestamp ranges are reasonable.

### Score Expiry and Time-Limited Leaderboards

Many systems need daily, weekly, or seasonal leaderboards. You don't keep one giant leaderboard forever. You rotate them.

**Pattern 1: Key-per-period**

Use a different Redis key for each time period:

```
ZADD leaderboard:daily:2024-01-15 500 "player:42"
ZADD leaderboard:weekly:2024-W03 1500 "player:42"
ZADD leaderboard:season:S12 45000 "player:42"
```

Set a TTL on the daily key so it auto-deletes:

```
EXPIRE leaderboard:daily:2024-01-15 172800    # 48 hours
```

Two days of buffer gives your system time to process final results before the key disappears. Weekly keys might get a 14-day TTL. Seasonal keys might persist until you explicitly remove them.

**Pattern 2: Scheduled cleanup**

For more control, use a background job that runs at midnight (or whatever your rollover time is):

```
1. RENAME leaderboard:daily:current leaderboard:daily:2024-01-15
2. Create new leaderboard:daily:current (empty, created on first ZADD)
3. Process and archive the old key
4. DEL leaderboard:daily:2024-01-15 (or let TTL handle it)
```

The RENAME is atomic, so there is no gap where writes would be lost. New writes immediately go to the fresh key.

**Pattern 3: Sliding window with ZREMRANGEBYSCORE**

If you need "top players in the last 24 hours," store timestamps as scores and use ZREMRANGEBYSCORE to prune old entries:

```
ZADD recent_activity <current_timestamp> "player:42:event:abc"
ZREMRANGEBYSCORE recent_activity -inf <24_hours_ago_timestamp>
```

This is less common for pure leaderboards but useful for activity-based ranking systems.

---

## When a Single Redis Instance Isnt Enough

A single Redis instance can handle a lot. We're talking 100K+ operations per second, sorted sets with millions of members, all in memory. For most applications, one instance is enough.

But "most" isn't "all." If your leaderboard has 100 million users and you need sub-millisecond reads globally, you need to think about scaling. This is where the interview gets interesting.

For a broader discussion of sharding strategies, see [Database Sharding](/learn/sharding).

### The Problem with Sharding Sorted Sets

Regular key-value data shards easily. User 42's profile goes to shard 3, user 43's profile goes to shard 7. Each shard is independent.

Sorted sets are different. The whole point is global ordering. If you split your leaderboard across three shards, each shard has a local top 10, but none of them has the global top 10.

![Sharding problem with sorted sets](diagram:redis-sharding-problem)

### Strategy 1: Application-Level Merge

Put users on shards by hash of their user ID. Each shard maintains its own sorted set. To get the global top K, query top K from every shard and merge in your application layer.

```
1. ZREVRANGE shard1:leaderboard 0 9 WITHSCORES
2. ZREVRANGE shard2:leaderboard 0 9 WITHSCORES
3. ZREVRANGE shard3:leaderboard 0 9 WITHSCORES
4. Merge-sort the results, take top 10
```

This works for small K (top 10, top 100). The merge is trivial: you have three sorted lists, merge-sort them. But it falls apart for arbitrary rank queries. "What's player:42's global rank?" now requires counting elements above that score across all shards. That's expensive.

**When to use it:** Small K values, infrequent rank queries, moderate number of shards (under 10).

### Strategy 2: Score-Range Sharding

Instead of hashing user IDs, shard by score range. Shard 1 handles scores 0-10000, shard 2 handles 10001-20000, and so on.

![Score-range sharding](diagram:redis-score-sharding)

The top K players are always on the highest shard. No merging needed for top-K queries. But this creates hotspots. If most players have scores in the 5000-15000 range, shards 1 and 2 are overloaded while shard 3 is nearly empty.

Also, when a player's score changes and crosses a shard boundary, you need to atomically remove them from one shard and add to another. That's a distributed transaction problem.

**When to use it:** Relatively uniform score distributions, or when you can dynamically adjust shard boundaries.

### Strategy 3: Redis Cluster

Redis Cluster distributes keys across 16,384 hash slots spread across multiple nodes. Each key hashes to a slot, and each slot maps to a node.

The trick: put your entire leaderboard in a single hash slot by using hash tags.

```
ZADD {leaderboard}:global 9500 "player:A"
```

The `{leaderboard}` part tells Redis Cluster to hash only the text inside the braces. All keys with `{leaderboard}` in the same position go to the same slot, which means the same node.

This doesn't actually help you scale the sorted set itself, since it still lives on one node. But it lets you scale other parts of your system (user profiles, game state, sessions) across the cluster while keeping the leaderboard on a dedicated node.

For truly massive leaderboards that don't fit on one node, you're back to Strategy 1 or Strategy 2. Redis Cluster doesn't magically shard a single sorted set across nodes.

### Strategy 4: Read Replicas

If your bottleneck is read throughput (millions of players checking the leaderboard simultaneously), use read replicas.

![Read replicas for scaling reads](diagram:redis-read-replicas)

Writes go to the primary. Reads are distributed across replicas. Replication lag is typically under 1ms for Redis, so your leaderboard reads are near-real-time.

This is often the right answer in an interview. Most leaderboard systems are read-heavy (1000:1 read-to-write ratio is common), so scaling reads with replicas covers the majority of use cases.

Redis can also serve as a caching layer in front of a persistent database. For more on that architecture, see [Databases & Caching](/learn/database-caching).

### What About Persistence?

Redis is in-memory. Power goes out, data's gone. You need a persistence strategy.

**RDB snapshots:** Periodic point-in-time snapshots to disk. You configure it to save every N seconds if at least M keys changed. Fast recovery but you lose data since the last snapshot.

```
save 900 1        # snapshot if >=1 key changed in 900 seconds
save 300 10       # snapshot if >=10 keys changed in 300 seconds
save 60 10000     # snapshot if >=10000 keys changed in 60 seconds
```

**AOF (Append Only File):** Logs every write operation. On restart, Redis replays the log to rebuild state. You can configure it to fsync every second (good balance) or on every write (safer but slower).

```
appendonly yes
appendfsync everysec
```

**Hybrid (RDB + AOF):** Use both. RDB for fast restarts (load the snapshot), AOF for minimal data loss (replay recent writes). This is the recommended approach for production.

For a leaderboard, losing a few seconds of score updates on a crash is usually acceptable. If it's not (real money is involved), use AOF with `appendfsync always` and accept the throughput hit. Or better yet, write scores to both Redis and a durable database, using Redis as the fast read layer and the database as the source of truth.

---

## Redis Sorted Sets vs Alternatives

| Aspect          | SQL ORDER BY                | In-Memory Heap              | Elasticsearch       | Redis Sorted Set             |
| --------------- | --------------------------- | --------------------------- | ------------------- | ---------------------------- |
| **Write speed** | Moderate (disk I/O)         | O(log n)                    | Slow (indexing)     | O(log n), in-memory          |
| **Read speed**  | Slow under load             | O(1) for top, O(n) for rank | Fast for search     | O(log n + k)                 |
| **Get rank**    | O(n) or index scan          | Not supported               | Not native          | O(log n)                     |
| **Memory**      | Disk-based                  | Application memory          | Heap + disk         | In-memory, ~100 bytes/member |
| **Persistence** | Built-in (ACID)             | None (application)          | Built-in            | RDB/AOF (configurable)       |
| **Scaling**     | Read replicas, sharding     | Single process              | Cluster native      | Replicas, manual shard       |
| **Complexity**  | Simple (SQL)                | Custom code                 | High (cluster ops)  | Low (5 commands)             |
| **Best for**    | Small datasets, existing DB | Tiny, single-server         | Full-text + ranking | Pure ranking, real-time      |
| **Throughput**  | 1K-10K ops/sec              | Millions (in-process)       | 10K-50K ops/sec     | 100K+ ops/sec                |
| **Latency**     | 5-50ms                      | <0.01ms (in-process)        | 5-20ms              | <1ms                         |

**When SQL is fine:** Your leaderboard has under 100K users, updates happen a few times per second, and you already have a database. Don't add Redis for the sake of it.

**When you need Redis:** Real-time updates, millions of users, sub-millisecond rank lookups, or read-heavy workloads where SQL becomes the bottleneck.

**When neither works:** If you need full-text search combined with ranking (e.g., "top players whose username contains 'dragon'"), Elasticsearch is better. Redis sorted sets don't support text search.

---

## Common Interview Mistakes

### Mistake 1: "I'll just use SQL ORDER BY"

"I'll store scores in PostgreSQL and run SELECT \* FROM scores ORDER BY score DESC LIMIT 10."

**Problem:** This works at small scale. At 10 million rows, even with an index, you're doing disk I/O on every query. Under heavy read load (thousands of users checking the leaderboard per second), your database becomes the bottleneck. And arbitrary rank lookups ("what's my rank?") require counting all rows with a higher score. That's an O(n) scan with no efficient shortcut in standard SQL.

**Better:** "I'd use a SQL database as the durable source of truth but put a Redis sorted set in front of it as the ranking layer. Writes go to both: the database for durability, Redis for fast reads. The leaderboard page reads exclusively from Redis, giving me O(log n + k) lookups at sub-millisecond latency."

### Mistake 2: "Redis is single-threaded so it's slow"

"I'm worried about Redis being single-threaded. Won't it be a bottleneck?"

**Problem:** This is a fundamental misunderstanding. Redis being single-threaded is a feature, not a bug. Single-threaded means zero lock contention, zero context switching, and zero race conditions. A single Redis instance handles 100K+ operations per second. That's because every operation is in-memory with O(log n) complexity. Each operation takes microseconds, and you can fit a lot of microseconds into one second even on a single thread.

**Better:** "Redis is single-threaded by design, which eliminates lock contention and makes every operation atomic. A single instance handles over 100K sorted set operations per second. For our leaderboard with 10K writes/sec and 100K reads/sec, that's well within capacity. If we need more read throughput, we add read replicas. The single-threaded primary handles writes while replicas serve reads."

### Mistake 3: Forgetting About Persistence

"I'll store everything in Redis. It's our leaderboard database."

**Problem:** Redis is an in-memory store. If the process crashes, the node reboots, or you hit an OOM condition, you lose data. RDB snapshots save periodically but you lose everything since the last snapshot. AOF is better but adds write overhead. Neither gives you the durability guarantees of a proper database.

**Better:** "Redis is the read/ranking layer, not the source of truth. Every score update writes to both our durable database and Redis. If Redis goes down, we can rebuild the sorted set from the database. We configure AOF with everysec fsync as a safety net, but the database is our recovery path. This gives us Redis speed for reads with database durability for writes."

### Mistake 4: Not Thinking About Memory

"Our leaderboard has 100 million users. I'll put them all in one Redis sorted set."

**Problem:** Each sorted set entry takes roughly 100-150 bytes of overhead (skip list node, hash table entry, member string, score). 100 million entries means roughly 10-15 GB of RAM for the sorted set alone. Plus Redis overhead, plus any other data you're storing. You need a machine with 32+ GB of RAM dedicated to this one sorted set. That's not impossible, but it's expensive and you're one OOM kill away from disaster.

**Better:** "For 100 million users, I'd think about whether everyone needs to be in the active sorted set. Most leaderboards only need the top N (top 100K, top 1M). We can keep the top tier in Redis and use the database for long-tail rank queries. Alternatively, if we truly need all 100M ranked in real-time, we shard across multiple instances with application-level merge for top-K queries, and we size our instances to handle roughly 25M entries each with comfortable memory headroom."

---

## Summary: What to Remember

- Redis sorted sets maintain elements sorted by score at all times. Sorting happens on write, not read.
- Five core commands: ZADD, ZRANGE, ZREVRANGE, ZRANK/ZREVRANK, ZSCORE
- Backed by a skip list (O(log n) operations) and a hash table (O(1) score lookups)
- ZADD is O(log n), ZREVRANGE is O(log n + k), ZSCORE is O(1)
- Redis single-threaded throughput: 100K+ operations per second
- Typical leaderboard read latency: <1ms
- Ties are broken lexicographically by member name. Use composite scores (score \* 1000000 + timestamp) for time-based tie-breaking
- Memory per entry: ~100-150 bytes of overhead
- Always pair Redis with a durable database. Redis is the fast read layer, not the source of truth.
- For scaling reads: use replicas (replication lag <1ms)
- For scaling writes or data size: shard with application-level merge for global top-K
- Persistence: use RDB + AOF hybrid in production

```
Interview golden rule: Redis sorted sets are your answer whenever
the interviewer asks for real-time ranking at scale. Know the five
commands, know the O(log n) complexity, and always have an answer
for persistence and sharding. Don't just say "Redis is fast" --
explain WHY it's fast (skip list, in-memory, single-threaded,
no locks) and WHEN it stops being enough (100M+ entries,
global distribution, strict durability requirements).
```
