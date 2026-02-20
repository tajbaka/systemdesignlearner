## Introduction

You're in your system design interview, and you've just walked through a clean architecture: a primary database with read replicas, a caching layer, and multiple data centers. The interviewer nods along. Everything looks solid.

Then they ask: "A user updates their profile picture. They refresh the page and see the old picture. How does your system handle that?"

And suddenly you're stumbling. You know the data is "eventually consistent," but what does that actually mean? Is it a bug? A feature? Should you fix it? How?

The answer depends on which consistency model you choose, and more importantly, which one your use case actually needs. Most systems don't need strong consistency everywhere. But they do need the right consistency for the right data.

Here's the full breakdown of consistency patterns and how to talk about them in interviews.

---

## The Consistency Spectrum

Consistency isn't binary. It's not just "consistent" or "not consistent." It's a spectrum, and every point on that spectrum trades off between correctness, latency, and availability.

Here's the hierarchy from strongest to weakest:

```
Strongest ──────────────────────────── Weakest

Linearizable → Sequential → Causal → Eventual
     ↑                                    ↑
  "Perfect"                         "Good enough"
  High latency                      Low latency
  Low availability                  High availability
```

In practice, "strong consistency" is used as an umbrella term for linearizable and sequential. And most systems you'll design in interviews will use either strong or eventual consistency, with a few practical patterns in between.

Let's break each one down.

---

## Strong Consistency

Strong consistency means every read returns the most recent write. No exceptions. If a user updates their profile name to "Alice" and someone else reads it a millisecond later, they see "Alice." Not the old name. Not an error. The correct, latest value.

**How it works:**

The system guarantees that all nodes agree on the order and value of every write before acknowledging it. This usually means synchronous replication: the write isn't considered "done" until all replicas have confirmed it.

```
Client writes "Alice" → Primary DB
Primary DB → waits for Replica 1 to confirm
Primary DB → waits for Replica 2 to confirm
All confirmed → write acknowledged to client

Any subsequent read from ANY replica returns "Alice"
```

**Real-world examples:**

- PostgreSQL with synchronous replication
- Google Spanner (linearizable across data centers)
- ZooKeeper (used for coordination, not general data storage)
- etcd (Kubernetes configuration store)

**The cost:**

Strong consistency is expensive. Every write waits for all replicas to acknowledge. If one replica is slow or a network link is congested, the entire write is slow. If a replica is unreachable, the write might fail entirely.

```
Write latency comparison:

Eventual consistency:  write → primary confirms → done (~5ms)
Strong consistency:    write → primary + ALL replicas confirm → done (~50-200ms)
                       (or fails if any replica is unreachable)
```

This is the [CAP theorem](/learn/cap-theorem) in action. Strong consistency sacrifices availability. During a network partition, a strongly consistent system will reject writes rather than risk serving stale data.

**When to use it:**

- Bank account balances and transfers
- Inventory counts (don't sell the last item twice)
- User authentication state (if you revoke access, it's revoked NOW)
- Any data where a wrong read causes real damage

---

## Eventual Consistency

Eventual consistency is the opposite end of the spectrum. It says: "If you stop writing, all replicas will eventually converge to the same value. But right now? They might disagree."

**How it works:**

Writes are acknowledged as soon as the primary confirms them. Replication to other nodes happens asynchronously, in the background. There's a window where different replicas might return different values for the same key.

```
Client writes "Alice" → Primary DB confirms → done (fast!)

Meanwhile, asynchronously:
Primary → replicates to Replica 1 (50ms later)
Primary → replicates to Replica 2 (120ms later)

During that window:
Read from Primary  → "Alice" (correct)
Read from Replica 1 → "Bob" (stale, until replication catches up)
Read from Replica 2 → "Bob" (stale, until replication catches up)

After convergence:
All replicas → "Alice" (consistent)
```

**The replication window** is typically milliseconds to seconds, but under heavy load or network issues, it can stretch to minutes. The system makes no guarantees about how long convergence takes, only that it will happen eventually.

**Real-world examples:**

- DynamoDB (default setting)
- Cassandra (default consistency level ONE)
- DNS (domain records propagate over hours)
- CDN caches (content updates lag behind origin)

**The benefit:**

Eventual consistency is fast and highly available. Writes don't block on replica acknowledgment. Reads can be served from the nearest replica. The system keeps working even when some nodes are unreachable.

**When to use it:**

- Social media feeds (a post appearing 2 seconds late is fine)
- Like and view counters (approximate counts are acceptable)
- Product recommendations (slightly outdated is okay)
- Analytics data (aggregated later anyway)

---

## Read-Your-Writes Consistency

This is the practical middle ground that most systems actually need. The guarantee is simple: **a user always sees their own updates, even if other users see stale data.**

Going back to the profile picture example from the introduction: with read-your-writes consistency, the user who uploaded the new picture will always see it. Their friend in another region might still see the old picture for a few seconds. That's usually acceptable.

**How it works:**

There are several implementation strategies:

**Strategy 1: Read from primary after write**

After a user writes data, route their subsequent reads to the primary database (which always has the latest data) instead of a replica. After a timeout (say, 10 seconds), switch back to reading from replicas.

```
User updates profile → write goes to Primary

Next 10 seconds:
  User's reads → routed to Primary (sees own update)
  Other users' reads → routed to replicas (might see stale data)

After 10 seconds:
  Replicas have caught up
  User's reads → back to replicas (data is consistent now)
```

**Strategy 2: Session stickiness with version tracking**

Track the latest write timestamp per user session. When a read request comes in, check if the target replica has replicated up to at least that timestamp. If not, read from the primary instead.

```
User writes at timestamp T=100 → session records "last_write = 100"

Read request comes in:
  Check replica: "What's your latest replicated timestamp?"
  Replica says: T=95 (behind)
  Route to primary instead

  Later, replica catches up to T=105
  Replica says: T=105 (ahead of user's last_write)
  Route to replica (safe to read here now)
```

**Strategy 3: Write-through cache**

When the user writes data, also write it to a cache (like Redis) that the user reads from. The cache serves as the "fast path" that always has the user's latest data, regardless of replication lag.

```
User updates profile:
  1. Write to Primary DB
  2. Write to Redis cache (same data)
  3. Acknowledge to user

User reads profile:
  1. Check Redis → found! Return immediately
  2. Redis has the latest data, always

Other users read profile:
  1. Read from replica (might be stale)
  2. That's fine for other users
```

**When to use it:**

- User profile updates (you should see your own changes immediately)
- Shopping cart modifications
- Settings and preferences
- Comments and posts (author sees their post right away)

---

## Causal Consistency

Causal consistency guarantees that **causally related events are seen in the correct order**. Events that aren't causally related can be seen in any order.

What does "causally related" mean? If event B happened because of event A, they're causally related. If two events are independent, they're not.

**Example:**

```
Causal relationship:
  Alice posts: "Should we get pizza?"        (Event A)
  Bob replies: "Yes! Let's do it."           (Event B, caused by A)

  Every user must see A before B.
  You can't see Bob's reply without seeing Alice's question first.

Independent events:
  Alice posts: "Should we get pizza?"        (Event A)
  Charlie posts: "Nice weather today!"       (Event C, independent)

  Some users might see A first, others might see C first.
  That's fine. They're unrelated.
```

**How it works:**

The system tracks causal dependencies between operations, typically using vector clocks or Lamport timestamps. When a replica receives an update, it checks whether all causal predecessors have been applied first. If not, it waits.

**Real-world examples:**

- MongoDB (causal consistency sessions)
- Collaborative editing tools (changes by one user that depend on another user's changes must be applied in order)
- Comment threads (replies must follow the original comment)

**When to use it:**

- Chat and messaging (messages in a conversation must appear in order)
- Collaborative documents (edits build on each other)
- Social media threads (replies make sense only after the parent post)

**Why not just use strong consistency?**

Because causal consistency is much cheaper. It only orders events that need to be ordered. Independent events can be processed in parallel without coordination, which makes the system faster and more available.

---

## Comparison Table

| Model                | Guarantee                               | Latency    | Availability | Use Case                          |
| -------------------- | --------------------------------------- | ---------- | ------------ | --------------------------------- |
| **Strong**           | Every read returns the latest write     | High       | Lower        | Banking, inventory                |
| **Causal**           | Causally related events appear in order | Medium     | Medium       | Chat, comment threads             |
| **Read-your-writes** | Users see their own updates immediately | Low-Medium | High         | User profiles, shopping carts     |
| **Eventual**         | All replicas converge eventually        | Low        | Highest      | Social feeds, analytics, counters |

---

## Practical Patterns

Beyond the consistency models themselves, there are a few concrete patterns that show up frequently in interviews and real systems.

### Read-After-Write

This is the implementation pattern for read-your-writes consistency. After a write, ensure the subsequent read returns the updated value.

**Common approach:** After writing, read from the primary for a short window (5-10 seconds). This is the simplest strategy and works well when replication lag is typically under a few seconds.

```
write(key, value) → primary
if (time_since_write < 10s):
    read(key) → primary      # guaranteed fresh
else:
    read(key) → any replica   # safe, replication has caught up
```

### Monotonic Reads

Guarantee that a user never sees data go "backward." If a user reads a value at timestamp T, their next read will return data at timestamp T or later, never before T.

**The problem this solves:**

Without monotonic reads, a user might hit Replica A (which is caught up) and see the latest data. Then their next request hits Replica B (which is behind), and they see older data. From the user's perspective, the data "reverted." That's confusing.

```
Without monotonic reads:
  Read 1 → Replica A → "Alice" (current)
  Read 2 → Replica B → "Bob"   (stale, feels like a revert!)

With monotonic reads:
  Read 1 → Replica A → "Alice" (current)
  Read 2 → must return "Alice" or newer, never "Bob"
```

**Implementation:** Pin users to a specific replica for the duration of their session (sticky sessions), or track the last-read timestamp and only serve from replicas that are at least that current.

### Write-Follows-Read

Also called "session causality." If a user reads a value and then writes based on it, the write is guaranteed to happen after the read. This prevents scenarios where a user reads data, makes a decision, and writes a response, but the write gets applied to an older state.

**Example:**

A user reads a forum post and writes a reply. Write-follows-read ensures the reply is applied to a state that includes the original post. Without this guarantee, the reply could end up on a replica where the original post hasn't arrived yet, creating a dangling reply with no parent.

---

## Reconciliation: Repairing Consistency

In eventually consistent systems, divergence is expected. But what happens when replicas disagree on the correct value and automatic convergence isn't enough?

That's where reconciliation comes in. Reconciliation is an asynchronous process that detects and repairs divergence between replicas. Think of it as a consistency "safety net" that catches issues regular replication misses.

**How it works:**

```
Reconciliation Process (runs periodically):

1. Compare data across replicas
   Replica A: { user_42: "Alice", updated_at: T=100 }
   Replica B: { user_42: "Alicee", updated_at: T=95 }   ← stale/typo

2. Detect divergence
   Values differ, timestamps differ

3. Apply resolution strategy
   Last-writer-wins: T=100 > T=95, so Replica A's value wins
   → Update Replica B to match Replica A

4. Log the fix for auditing
```

**Common resolution strategies:**

- **Last-writer-wins (LWW):** The write with the latest timestamp wins. Simple but can lose data if two concurrent writes happen.
- **Merge:** Combine both values. Works for CRDTs (Conflict-free Replicated Data Types) like counters or sets.
- **Application-level resolution:** Let the application decide. Amazon's shopping cart famously merges conflicting carts by taking the union of items (better to show an extra item than lose one).

**Real-world examples:**

- Cassandra runs anti-entropy repair processes that compare data across replicas using Merkle trees
- DynamoDB uses vector clocks to detect conflicts and can return multiple conflicting versions to the application
- S3 uses background checksumming to detect and repair bit-rot or replication failures

**When to mention reconciliation in interviews:**

Whenever you choose eventual consistency, briefly acknowledge that divergence can happen and mention reconciliation as your backstop. This shows the interviewer you understand that "eventually consistent" isn't the same as "eventually correct without effort."

---

## How to Choose: A Decision Framework

The right consistency model depends on the data, not the system. Different data within the same system can and should use different consistency levels.

| Data Type              | Consistency Model | Why                                                  |
| ---------------------- | ----------------- | ---------------------------------------------------- |
| Financial transactions | Strong            | A wrong balance causes real harm                     |
| Inventory counts       | Strong            | Overselling is expensive                             |
| User authentication    | Strong            | Revoked access must be immediate                     |
| User profiles          | Read-your-writes  | User sees own changes; others can lag                |
| Shopping cart          | Read-your-writes  | User's cart should reflect their actions             |
| Settings/preferences   | Read-your-writes  | Toggling dark mode should be instant for that user   |
| Chat messages          | Causal            | Messages in a thread must be ordered                 |
| Comment threads        | Causal            | Replies must follow parent posts                     |
| Social media feeds     | Eventual          | A few seconds of delay is invisible to users         |
| Like/view counters     | Eventual          | Approximate is fine, exact isn't needed in real time |
| Recommendations        | Eventual          | Slightly stale recommendations are still useful      |
| Analytics dashboards   | Eventual          | Data is aggregated and inherently delayed            |

**The pattern:** The further from money and safety, the weaker the consistency you can get away with. And weaker consistency means better performance and availability.

### Connection to CAP Theorem

Consistency models are how you implement the "C" side of the [CAP theorem](/learn/cap-theorem). When the CAP theorem says you choose between Consistency and Availability during a partition, it's really asking: how strong does your consistency need to be?

- **CP system:** Strong consistency. Rejects requests during partitions to maintain correctness.
- **AP system:** Eventual consistency. Serves possibly stale data to maintain availability.

But most real systems don't make a single choice. They use strong consistency for payments and eventual consistency for feeds, within the same application. That's the nuanced answer interviewers want to hear.

---

## Common Interview Mistakes

### Mistake 1: "We'll use strong consistency for everything"

> "All reads go through the primary database to guarantee consistency."

**Problem:** You've just killed your read throughput. If your system handles 100K reads per second, they all hit one node. Your [read replicas](/learn/scaling) are useless. Latency spikes, the primary becomes a bottleneck, and during a network partition, the whole system goes down. You're paying the cost of strong consistency for data that doesn't need it.

**Better:** "We'll use strong consistency for financial transactions and inventory, where incorrect data causes real harm. For social feeds and counters, we'll use eventual consistency to keep reads fast and the system available. User profile updates will use read-your-writes so users see their own changes immediately."

### Mistake 2: "Eventual consistency means data loss"

> "We can't use eventual consistency because we might lose writes."

**Problem:** Eventual consistency doesn't mean writes are lost. It means reads might be stale temporarily. The write is durably stored on the primary. Replicas just haven't caught up yet. Conflating staleness with data loss shows a fundamental misunderstanding of replication. The data is there. It's just not everywhere yet.

**Better:** "Eventual consistency means reads might return slightly stale data during the replication window, which is typically milliseconds to seconds. The write itself is durable on the primary. For our social feed, a 2-second delay before a post appears on a friend's feed is invisible to the user. If we need to guarantee that users see their own posts immediately, we can add read-your-writes consistency on top."

### Mistake 3: "We'll just add a cache and that solves consistency"

> "We'll put Redis in front of the database, so reads are always fast and consistent."

**Problem:** A cache doesn't solve consistency. It creates another consistency problem. Now you have stale data in two places: the replicas and the cache. Cache invalidation is one of the hardest problems in distributed systems. If the database updates but the cache doesn't, users see stale cached data indefinitely (until TTL expires). You haven't solved the problem. You've added a layer.

**Better:** "We'll use a [cache-aside pattern](/learn/database-caching) with a short TTL for frequently read data. For data requiring read-your-writes consistency, we'll write through to the cache on update so the writing user always reads the latest value. We accept that other users may see stale cached data for up to the TTL window."

### Mistake 4: "Consistency is a system-wide setting"

> "Our system is AP, so we use eventual consistency."

**Problem:** Consistency isn't one-size-fits-all. A single application often needs different consistency levels for different data. An e-commerce site needs strong consistency for payment processing but eventual consistency for product recommendation feeds. Treating the whole system as AP or CP is an oversimplification that misses the nuance interviewers are looking for.

**Better:** "We'll make consistency decisions per data type. Payments and inventory get strong consistency via synchronous writes to the primary. The activity feed and recommendation engine use eventual consistency for better performance. User-facing profile data uses read-your-writes so users see their own changes. We're picking the cheapest consistency model that's still correct for each use case."

---

## Summary: What to Remember

- Consistency is a spectrum, not a binary choice. From strongest to weakest: linearizable, sequential, causal, eventual
- Strong consistency means every read returns the latest write. It's correct but expensive: higher latency, lower availability
- Eventual consistency means replicas converge over time. Reads might be stale but the system is fast and highly available
- Read-your-writes consistency is the practical middle ground: users always see their own updates, even if others see stale data
- Causal consistency orders causally related events but allows independent events to be reordered. Good for chat and comment threads
- Practical patterns: read-after-write (route to primary briefly), monotonic reads (no going backward), write-follows-read (session causality)
- Reconciliation is your safety net for eventually consistent systems. It detects and repairs divergence between replicas
- Choose consistency per data type, not per system. Payments need strong. Feeds need eventual. Profiles need read-your-writes
- Consistency models are the implementation of [CAP theorem](/learn/cap-theorem) trade-offs. CP systems use strong consistency. AP systems use eventual
- [Caching](/learn/database-caching) doesn't solve consistency problems. It adds another layer of potential staleness that you need to manage
- [Sharding](/learn/sharding) introduces additional consistency challenges because data is spread across nodes that must coordinate

**Interview golden rule:**

```
Don't say "we need consistency" without specifying which kind.
The best answer picks the weakest consistency model that's
still correct for each piece of data in your system.
```
