## Introduction

The interviewer says: "Design a real-time leaderboard for a multiplayer game."

You think, "Just sort users by score." Simple, right?

Then they follow up: "You have 10 million players. How do you get a single player's rank without scanning every row? What happens when 50,000 scores update per second? Can a SQL `ORDER BY` keep up?"

And now you realize that a leaderboard isn't about sorting. It's about choosing the right data structure, understanding O(log n) vs O(n) trade-offs, and knowing how Redis Sorted Sets work under the hood.

Here's how to design a leaderboard that stays fast at scale.

---

## Functional Requirements

**1. Score updates**

- Game clients submit new scores after matches
- Scores update the player's ranking immediately
- Support both "highest score wins" and "replace if higher" semantics

**2. Global Top K ranks**

- Display the top N players globally (e.g., Top 10, Top 100)
- Results must reflect the latest scores, not stale cached data
- Return player ID, score, and rank position

**3. User's own rank**

- Any player can look up their specific rank (e.g., "You are #12,504")
- Also return the "neighborhood": players ranked immediately above and below
- This is the most common query since most players aren't in the Top 10

That's the core. A leaderboard answers two questions: "Who's winning?" and "Where do I stand?"

---

## Non-Functional Requirements

**Low latency reads**

- Leaderboard queries happen constantly: every time a player opens the app, finishes a match, or checks their rank
- Target: under 20ms for any read
- This rules out SQL `ORDER BY` on every request. Sorting 10 million rows per query is too slow

**Scalability**

- Support millions of concurrent players
- Handle tens of thousands of score updates per second
- A single Redis instance holds roughly 25 million sorted set members. Beyond that, we need a [sharding](/learn/sharding) strategy

**Durability**

- Redis is in-memory. If it crashes, we lose all rankings
- Need a persistent backup (PostgreSQL, DynamoDB) so we can rebuild the leaderboard on restart
- Acceptable to have a brief recovery period, but data loss is not acceptable

For more on in-memory vs disk-based storage trade-offs, see [Databases & Caching](/learn/database-caching).

---

## API Design

**Submit a score**

```
POST /api/v1/scores

Request Body:
{
  "userId": "player-42",
  "score": 8500
}

Response:
{
  "userId": "player-42",
  "score": 8500,
  "rank": 1204
}

Status: 200 OK
```

The response includes the player's new rank so the client can show it immediately without a second round-trip.

**Get the global leaderboard**

```
GET /api/v1/leaderboard?type=global&limit=10

Response:
{
  "entries": [
    { "rank": 1, "userId": "player-7", "score": 99500 },
    { "rank": 2, "userId": "player-21", "score": 98200 },
    { "rank": 3, "userId": "player-3", "score": 97800 }
  ]
}

Status: 200 OK
```

**Get a user's rank and neighborhood**

```
GET /api/v1/leaderboard?userId=player-42&range=5

Response:
{
  "userRank": 1204,
  "userScore": 8500,
  "entries": [
    { "rank": 1199, "userId": "player-88", "score": 8520 },
    { "rank": 1200, "userId": "player-15", "score": 8515 },
    ...
    { "rank": 1204, "userId": "player-42", "score": 8500 },
    ...
    { "rank": 1209, "userId": "player-61", "score": 8480 }
  ]
}

Status: 200 OK
```

**The key fields:**

- `userId`: Who this score belongs to
- `score`: The numeric score value
- `rank`: The player's position on the leaderboard (1-indexed)
- `range`: How many neighbors above and below to include
- `limit`: How many top players to return

One endpoint serves both "Top 10" and "My Rank" by switching query parameters. This keeps the API surface small.

---

## High Level Design

Here's the overall architecture:

![Leaderboard High-level Design](diagram:leaderboard)

### Key Components

**1. Game Client**

- Submits scores after matches
- Reads the leaderboard and user rank
- All requests go through the Load Balancer

**2. Load Balancer**

- Distributes traffic across multiple Score Service instances
- Standard entry point for all traffic

**3. Score Service**

- Stateless service that validates requests and coordinates between Redis and the database
- On score submit: writes to both Redis (for ranking) and the persistent database (for durability)
- On leaderboard read: queries Redis directly

**4. Redis Cluster (Sorted Sets)**

- The heart of the system. Redis Sorted Sets (ZSET) keep all scores sorted automatically
- `ZADD` to insert or update a score: O(log n)
- `ZREVRANGE` to get top K players: O(log n + k)
- `ZREVRANK` to get a user's rank: O(log n)
- All operations are sub-millisecond on a dataset of millions

**5. Persistent Database (SQL/NoSQL)**

- Durable backup of all scores
- Used to rebuild Redis if it crashes
- Not on the read path for leaderboard queries: too slow for real-time ranking

For a deep dive on how Redis Sorted Sets work internally, see [Redis Sorted Sets](/learn/redis-sorted-sets).

### Why This Architecture

**Why Redis Sorted Sets (not a SQL database)?**

A SQL query like `SELECT * FROM scores ORDER BY score DESC LIMIT 10` works fine for 10,000 users. At 10 million users, it takes hundreds of milliseconds per query. Redis Sorted Sets use a [skip list](/learn/data-structures#skip-lists) that keeps data sorted at all times. Rank lookups are O(log n), meaning even with 10 million players, a rank query touches about 23 nodes. That's sub-millisecond.

**Why write to both Redis and a database?**

Redis is fast but volatile. If the Redis instance restarts, you lose all rankings. The persistent database is your safety net. On crash recovery, you replay all scores from the database into Redis using `ZADD`. This dual-write pattern trades a small amount of write latency for data durability.

**Why is the Score Service stateless?**

All ranking state lives in Redis. The Score Service just validates requests and calls Redis commands. This means you can scale the service horizontally behind the load balancer without worrying about sticky sessions or state synchronization.

---

## Detailed Design

### Write Path: Score Submission

When a player submits a score:

```
1. Client sends POST /api/v1/scores { userId: "player-42", score: 8500 }
2. Score Service validates the request (auth, score bounds, etc.)
3. Score Service calls ZADD on Redis:
     ZADD leaderboard 8500 "player-42"
   - If player-42 already exists, their score is updated
   - If this is a new player, they're inserted
   - The sorted set stays sorted automatically
4. Score Service writes to the persistent database:
     INSERT INTO scores (user_id, score, updated_at)
     VALUES ('player-42', 8500, NOW())
     ON CONFLICT (user_id) DO UPDATE SET score = 8500, updated_at = NOW();
5. Score Service calls ZREVRANK to get the new rank:
     ZREVRANK leaderboard "player-42" → 1203 (0-indexed)
6. Return { userId: "player-42", score: 8500, rank: 1204 }
```

**Why ZADD and not a separate check-then-insert?**

`ZADD` is idempotent. If the member exists, it updates the score. If it doesn't, it inserts. One command, no race conditions.

### Read Path: Top K Players

```
1. Client sends GET /api/v1/leaderboard?type=global&limit=10
2. Score Service calls ZREVRANGE on Redis:
     ZREVRANGE leaderboard 0 9 WITHSCORES
   Returns the top 10 members with their scores, already sorted
3. Return the results with rank = index + 1
```

This is a single Redis command. For k=10, it touches about 23 skip list nodes plus 10 sequential reads. Total time: under 1ms.

### Read Path: User Rank and Neighborhood

```
1. Client sends GET /api/v1/leaderboard?userId=player-42&range=5
2. Score Service calls ZREVRANK:
     ZREVRANK leaderboard "player-42" → 1203 (0-indexed)
3. Score Service calls ZREVRANGE for the neighborhood:
     ZREVRANGE leaderboard 1198 1208 WITHSCORES
   Returns 11 entries centered around the player
4. Return the results with rank = index + 1199
```

Two Redis commands, both O(log n). Total time: under 2ms even with 10 million players.

### Redis Data Model

```
Key:    leaderboard
Type:   Sorted Set (ZSET)
Members: user IDs (strings)
Scores:  numeric scores (doubles)

Example state:
  "player-7"   → 99500
  "player-21"  → 98200
  "player-3"   → 97800
  ...
  "player-42"  → 8500
  ... (10 million members)
```

**Memory estimation:**

- Each member: ~64 bytes (user ID + score + skip list pointers)
- 10 million members: ~640 MB
- A single Redis instance with 4 GB of memory handles this comfortably

### Handling Ties

When two players have the same score, Redis sorts them lexicographically by member name. This means ties are broken alphabetically, which isn't great for a game.

**Better approach: compound scores.**

```
Compound score = (actual_score × 10^10) + (MAX_TIMESTAMP - timestamp)

Player A: score 8500 at time 1705320000
  → 8500_0000000000 + (9999999999 - 1705320000)
  → 85008294679999

Player B: score 8500 at time 1705320060
  → 85008294619999
```

Player A's compound score is higher because they achieved 8500 first. The `ZADD` command treats this as a single numeric score, so the skip list sorting works exactly as before. No extra logic needed.

### Persistence and Recovery

The persistent database stores every score update:

```
Table: scores
  user_id     VARCHAR PRIMARY KEY
  score       INTEGER NOT NULL
  updated_at  TIMESTAMP NOT NULL

Index: idx_scores_score ON scores(score DESC)
```

**Recovery process when Redis crashes:**

```
1. Redis restarts with empty memory
2. Recovery worker reads all rows from the persistent database:
     SELECT user_id, score FROM scores
3. Batch-inserts into Redis using pipelined ZADD:
     ZADD leaderboard score1 user1 score2 user2 ... (batches of 10,000)
4. 10 million rows recover in ~30 seconds with pipelining
5. Leaderboard is back online
```

During recovery, the leaderboard is temporarily unavailable. The Score Service can return a cached snapshot or a "leaderboard updating" message.

### Scaling Beyond a Single Redis Instance

A single Redis sorted set handles up to ~25 million members before memory and latency degrade. Beyond that, you need [sharding](/learn/sharding).

**The problem with sharding sorted sets:**

If you hash-shard users across 3 Redis instances, each instance has a local leaderboard. Player A might be rank #1 on shard 1, but rank #5 globally. Getting a global Top 10 requires querying all shards and merging results.

**Practical approach: tiered leaderboard.**

```
Tier 1: Top leaderboard (single Redis instance)
  - Contains the top 100,000 players
  - All Top K and rank queries for high-ranked players hit this instance
  - Fast and accurate

Tier 2: Full leaderboard (sharded across N instances)
  - Contains all 50 million players, hash-sharded by user ID
  - Each shard returns local rank
  - Approximate global rank = local_rank + sum of members in higher-score shards
```

For most games, this approximation is good enough. A player ranked ~5,234,000 doesn't care if their actual rank is 5,234,127.

For more on sharding strategies and their trade-offs, see [Sharding](/learn/sharding) and [Redis Sorted Sets — Sharding](/learn/redis-sorted-sets#when-a-single-redis-instance-isnt-enough).

---

## Common Interview Mistakes

### Mistake 1: Using SQL ORDER BY for every read

"I'll sort the scores table on every request."

**Problem:** `ORDER BY score DESC LIMIT 10` does a full index scan or sort. At 10 million rows, this takes 100-500ms. The leaderboard endpoint gets called thousands of times per second. Your database will collapse.

**Better:** Use Redis Sorted Sets. Rankings are maintained in real-time with O(log n) operations. No sorting needed at query time.

### Mistake 2: Not discussing how ZRANK actually works

"Redis Sorted Sets keep things sorted."

**Problem:** That's correct but shallow. The interviewer wants to know the mechanism. Just saying "sorted" doesn't explain why rank lookups are O(log n) and not O(n).

**Better:** Explain that Redis uses a skip list internally. A skip list is a multi-level linked list where higher levels skip over many nodes. To find a rank, Redis traverses the skip list and counts nodes, giving O(log n) complexity. Mention this shows you understand the data structure, not just the API.

### Mistake 3: Ignoring durability

"I'll keep everything in Redis."

**Problem:** Redis is in-memory. Server restart, OOM kill, or hardware failure means your entire leaderboard disappears. Players lose their ranks.

**Better:** Dual-write to Redis and a persistent database. Redis serves real-time queries. The database is the recovery source. Discuss the recovery process: batch `ZADD` from the database to rebuild Redis in seconds.

### Mistake 4: Overcomplicating with Kafka or event sourcing

"I'll publish score events to Kafka, then consume them into Redis."

**Problem:** A leaderboard write is a single `ZADD` command. Adding Kafka introduces latency, complexity, and a consistency gap where the score is in Kafka but not yet in Redis. The player submits a score and doesn't see their rank update.

**Better:** Write directly to Redis. It's a synchronous, sub-millisecond operation. Save Kafka for systems that actually need async processing (notification systems, analytics pipelines).

### Mistake 5: Proposing to shard without explaining the global ranking problem

"I'll shard Redis by user ID."

**Problem:** If you shard a sorted set by user ID, each shard has its own local ranking. Getting a global Top 10 requires querying all shards and merging. Getting a specific user's global rank requires knowing how many users on other shards score higher. You've just introduced an O(shards) fan-out on every read.

**Better:** Explain that a single Redis instance handles 25 million users comfortably. Only shard when you exceed that. When you do shard, use a tiered approach: a single instance for top players, sharded instances for the long tail with approximate ranks.

---

**Interview golden rule:**

Don't just say "I'll use Redis." Explain that you're using Sorted Sets specifically, that they use a skip list for O(log n) operations, how ZADD/ZREVRANGE/ZREVRANK map to your requirements, and what happens when Redis goes down.
