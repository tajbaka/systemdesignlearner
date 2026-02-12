## Introduction

You're designing a social media feed, and you tell the interviewer: "When a user posts an update, we write it to the database and their followers query for it."

The interviewer nods. Then: "That user has 10 million followers. When they open their feed, each one runs a query that joins across all the users they follow, sorts by time, and returns the top 20 posts. That's 10 million expensive queries. How long does that take?"

And now you realize that "just query for it" doesn't scale. You need a strategy for distributing one event to many recipients. That strategy is called fan-out.

---

## The Core Concept: One Event, Many Recipients

Fan-out is what happens when a single action needs to reach multiple consumers. A user posts a message in a group chat, and 200 members need to see it. A celebrity tweets, and 50 million followers need it in their feed. A notification fires, and it goes to email, SMS, and push.

The question is not whether fan-out happens. It always does. The question is **when** and **where** it happens.

There are two fundamental approaches:

```
Fan-Out-On-Write (push model):
  Event happens -> immediately distribute to all recipients
  Read is fast (pre-computed), Write is expensive

Fan-Out-On-Read (pull model):
  Event happens -> just store it
  Read computes the result on demand
  Write is fast, Read is expensive
```

Every system design that involves one-to-many delivery forces you to pick between these two models, or combine them.

---

## Fan-Out-On-Write (Push Model)

When an event happens, you immediately push it to every recipient's inbox, feed, or cache. The work happens at write time.

### How It Works

```
Alice posts "Hello world"

1. Write post to posts table
2. Look up Alice's follower list: [Bob, Charlie, Dave, ... 500 followers]
3. For each follower, insert into their feed cache:
   Bob's feed:     [Alice: "Hello world", ...]
   Charlie's feed: [Alice: "Hello world", ...]
   Dave's feed:    [Alice: "Hello world", ...]
4. Done. All feeds are pre-computed.

When Bob opens his feed:
  -> Read Bob's feed cache -> instant response
```

### Why It Works

Reads are extremely fast. When Bob opens his feed, you just read from his precomputed cache. No joins. No sorting. No aggregation. Just fetch and return. This makes the user experience feel snappy.

### The Cost

Writes are expensive. If Alice has 500 followers, posting one message means 500 write operations. That's fine. But if a celebrity has 50 million followers, one post triggers 50 million writes. That can take minutes to propagate, and it hammers your write pipeline.

```
Regular user (500 followers):
  1 post = 500 writes
  Time: ~50ms
  Totally fine.

Celebrity (50 million followers):
  1 post = 50,000,000 writes
  Time: minutes to hours
  Storage: massive duplication
  Not fine.
```

### When to Use It

- Users have a bounded, moderate number of followers (social apps with typical users)
- Read latency matters more than write latency
- Feed freshness can tolerate a few seconds of delay
- Storage is cheap relative to compute

Fan-out-on-write is how Twitter originally worked for most users. It's the default model for notification delivery, group chat message distribution, and activity feeds where follower counts are manageable.

For distributing the writes asynchronously, you'd typically use a [message queue](/learn/message-queues). Workers pull from a "new post" topic and fan out to follower feeds in the background.

---

## Fan-Out-On-Read (Pull Model)

When an event happens, you just store it. When a recipient opens their feed, you compute the result on the fly by pulling from all the sources they follow.

### How It Works

```
Alice posts "Hello world"

1. Write post to Alice's posts table
2. Done.

When Bob opens his feed:
1. Look up who Bob follows: [Alice, Eve, Mallory, ... 200 people]
2. Query each person's recent posts
3. Merge and sort by timestamp
4. Return top 20
```

### Why It Works

Writes are trivially cheap. One post means one database write. No follower list lookups, no fanout to millions of inboxes. The post is just stored once.

### The Cost

Reads are expensive. When Bob opens his feed, the system has to query posts from every user Bob follows, merge them, sort them, and return the results. If Bob follows 500 people, that's 500 queries (or one complex query with a large IN clause) that run every time Bob refreshes.

```
Bob follows 500 people:
  Open feed = query 500 users' posts, merge, sort, paginate
  Time: 200-500ms (with caching, maybe 50ms)
  But: this happens on EVERY feed load

Bob follows 2,000 people:
  Queries get slower, merge gets heavier
  Without caching: 1-2 seconds
```

### When to Use It

- The "poster" has an extremely high number of followers (celebrities, official accounts)
- Write speed and simplicity matter more than read speed
- You can aggressively cache computed feeds
- Feed staleness of a few seconds is acceptable

---

## Comparison Table

| Aspect                | Fan-Out-On-Write (Push)             | Fan-Out-On-Read (Pull)          |
| --------------------- | ----------------------------------- | ------------------------------- |
| **Write cost**        | High (N writes per follower)        | Low (1 write)                   |
| **Read cost**         | Low (pre-computed feed)             | High (computed on demand)       |
| **Read latency**      | Fast (~1ms cache read)              | Slower (aggregation at read)    |
| **Storage**           | High (duplicated across feeds)      | Low (stored once)               |
| **Freshness**         | Near real-time for most users       | Always fresh (computed live)    |
| **Celebrity problem** | Breaks (50M writes per post)        | Handles well (1 write)          |
| **Inactive users**    | Wasted writes (they may never read) | No waste (only compute on read) |
| **Complexity**        | Moderate (async workers)            | Moderate (aggregation logic)    |

Neither model is universally better. The right choice depends on your access patterns: who creates content, how many recipients there are, and whether you optimize for fast reads or fast writes.

---

## The Hybrid Approach

Most real systems don't pick one model. They combine both.

### The Insight

Regular users (500 followers) work great with fan-out-on-write. Celebrities (50 million followers) break it. So treat them differently.

```
When a regular user posts:
  -> Fan-out-on-write to all followers' feeds (fast, bounded cost)

When a celebrity posts:
  -> Just store the post (no fan-out)
  -> When a follower opens their feed:
     -> Read their precomputed feed (from followed regular users)
     -> Merge with recent posts from followed celebrities (fan-out-on-read)
     -> Return combined feed
```

### Where to Draw the Line

Set a threshold, say 100,000 followers. Users above that threshold are treated as "celebrities" and use the pull model. Users below use the push model.

```
Post flow:
  if poster.followerCount < 100,000:
    -> fan-out-on-write (push to follower feeds)
  else:
    -> store only (followers pull on read)

Read flow:
  1. Fetch precomputed feed (from push sources)
  2. Fetch recent posts from followed celebrities (pull sources)
  3. Merge and sort
  4. Return top N
```

This is essentially what Twitter (now X) uses. Instagram uses a similar approach. Facebook's news feed combines fan-out-on-write with ranking algorithms.

The hybrid approach gives you the best of both worlds: fast reads for most users, bounded write cost for high-follower accounts.

---

## Fan-Out in Practice

Fan-out isn't just for social media feeds. The pattern shows up everywhere.

### Group Chat (WhatsApp, Slack)

When Alice sends a message to a group of 200 members, the server fans out to all connected members. This is fan-out-on-write, where the message is pushed immediately to each recipient's [WebSocket connection](/learn/websockets-realtime).

```
Alice sends message to Group-A (200 members)

1. Chat Service receives message
2. Look up Group-A members: [Bob, Charlie, ..., 200 users]
3. For each member:
   - If online: push via WebSocket
   - If offline: store in unread messages
4. All members see the message
```

Group sizes in chat are bounded (WhatsApp caps at 1024). This makes fan-out-on-write practical, since 200 writes is nothing.

### Notification Delivery

A notification system is essentially a fan-out pipeline. An event ("Order shipped") triggers notifications across multiple channels (email, push, SMS). Each channel is a separate fan-out target.

```
Event: order-shipped for user-123

1. Check user preferences (email: yes, push: yes, SMS: no)
2. Fan out to enabled channels:
   -> Email queue: send shipment email
   -> Push queue: send push notification
3. Each channel worker handles delivery independently
```

This is fan-out-on-write with channel-level parallelism. [Priority queues](/learn/message-queues#priority-queues) ensure critical notifications (OTP codes) aren't blocked by bulk fan-out operations.

### Activity Feeds & News Feeds

The classic use case. When a user posts, likes, or comments, that activity needs to appear in followers' feeds. The hybrid approach (push for regular users, pull for celebrities) is standard here.

### Webhook Delivery

When an event occurs in your platform, you need to notify all registered webhooks. Each subscriber endpoint is a fan-out target. Fan-out-on-write with retries and [idempotency](/learn/idempotency-deduplication) for each delivery attempt.

---

## Common Interview Mistakes

### Mistake 1: Picking one model without discussing trade-offs

"I'll use fan-out-on-write for the news feed."

**Problem:** The interviewer immediately asks about a user with 50 million followers. You painted yourself into a corner by committing to one approach without caveat.

**Better:** Explain both models, their trade-offs, and propose the hybrid approach. Show that you understand when each model breaks down.

### Mistake 2: Ignoring the celebrity problem

"We push every post to every follower's feed."

**Problem:** One post from a celebrity triggers 50 million writes. Your write pipeline is saturated for minutes. Other users' posts are delayed. The system grinds to a halt.

**Better:** Identify the "hot partition" risk early. Set a follower threshold. Use fan-out-on-read for high-follower accounts and fan-out-on-write for everyone else.

### Mistake 3: Not mentioning async processing

"The API writes to all followers synchronously and returns."

**Problem:** If a user has 10,000 followers, the API blocks for however long it takes to write 10,000 times. The user waits seconds to post a status update. Unacceptable UX.

**Better:** The API writes the post, enqueues a fan-out job, and returns `202 Accepted`. Workers process the fan-out asynchronously. The user sees instant feedback. Use a [message queue](/learn/message-queues) to handle the async processing.

### Mistake 4: Forgetting about inactive users

"We pre-compute feeds for all followers."

**Problem:** 40-60% of users on most platforms are inactive. You're burning writes to update feeds that nobody will ever read. That's wasted compute and storage.

**Better:** Track user activity. Only fan-out to recently active users. Inactive users get their feed computed on-read when (if) they return. This optimization significantly reduces fan-out volume.

---

## Summary: What to Remember

- **Fan-out** is distributing a single event to many recipients. It happens in feeds, chat, notifications, and webhooks
- **Fan-out-on-write** (push) pre-computes at write time. Reads are fast, writes scale with follower count
- **Fan-out-on-read** (pull) computes at read time. Writes are cheap, reads scale with follow count
- **Hybrid approach** is the production standard: push for regular users, pull for celebrities
- Set a follower threshold (~100K) to decide which model to use for each user
- Always fan out asynchronously via workers and message queues. Never block the API
- Skip inactive users to avoid wasted writes
- Group chat and notification delivery are bounded fan-out problems, and push works fine

**Key numbers:**

- Fan-out-on-write cost: O(N) writes where N = follower count
- Typical celebrity threshold: 100,000+ followers
- Inactive user ratio on most platforms: 40-60%

**Interview golden rule:**

```
Don't just say "push to all followers." Discuss both models,
explain the celebrity problem, propose the hybrid approach,
and mention that fan-out happens asynchronously via workers.
```
