## Introduction

You just designed a beautiful API. Clean endpoints, solid database schema, proper caching layer. You're feeling good.

Then the interviewer asks: "What stops someone from hitting your endpoint 10,000 times per second?"

And if your answer is "I didn't think about that," you just lost points on every system you've designed today. Rate limiting isn't optional. It's a core component of any production system.

Here are the four main algorithms, when to use each, and how to make them work across multiple servers.

---

## Why Rate Limiting Matters

Before we get into algorithms, here's why this matters:

- **Prevent abuse:** Stop bots, scrapers, and malicious users from overwhelming your service
- **Protect resources:** Your servers, databases, and third-party APIs all have capacity limits
- **Fair usage:** Ensure one user can't monopolize the system at the expense of others
- **Protect vendor quotas:** If you're calling Twilio or SendGrid, they have rate limits too. Exceed them and you get blocked

Rate limiting isn't just about bad actors. Even legitimate traffic spikes (Black Friday, viral content) can take down a system without proper throttling.

---

## The Four Main Algorithms

### Fixed Window Counter

The simplest approach. Divide time into fixed windows (e.g., 1-minute intervals) and count requests per window.

**How it works:**

```
Window: 12:00:00 - 12:00:59  |  Limit: 100 requests

12:00:15 → Request #1  ALLOWED (count: 1)
12:00:30 → Request #50 ALLOWED (count: 50)
12:00:45 → Request #100 ALLOWED (count: 100)
12:00:50 → Request #101 BLOCKED

12:01:00 → New window, counter resets to 0
12:01:01 → Request #1  ALLOWED (count: 1)
```

**The problem:** Burst at window boundaries. If a user sends 100 requests at 12:00:59 and 100 more at 12:01:00, they've sent 200 requests in 2 seconds while the limit is 100/minute. Each window sees exactly 100, so neither triggers the limit.

**Pros:** Simple to implement, low memory (one counter per key per window).

**Cons:** Vulnerable to boundary bursts. Can allow up to 2x the intended rate.

### Sliding Window Log

Track the exact timestamp of every request. When a new request comes in, count how many timestamps fall within the last N seconds.

**How it works:**

```
Limit: 100 requests per 60 seconds

New request at 12:01:30:
1. Look at all timestamps from 12:00:30 to 12:01:30
2. Count: 95 requests in that window
3. 95 < 100 → ALLOW, add timestamp 12:01:30 to the log
4. Clean up timestamps older than 12:00:30
```

**Pros:** Perfectly accurate. No boundary burst problem.

**Cons:** Memory-intensive. Storing every timestamp for every user gets expensive fast. If your limit is 10,000 requests/hour, you're storing 10,000 timestamps per user.

### Sliding Window Counter

The best of both worlds. Combines the low memory of fixed windows with the accuracy of sliding windows using a weighted average.

**How it works:**

```
Limit: 100 requests per minute
Current time: 12:01:15 (25% into the current window)

Previous window (12:00:00 - 12:00:59): 84 requests
Current window (12:01:00 - 12:01:59): 36 requests

Weighted count = (84 × 75%) + (36 × 100%)
               = 63 + 36
               = 99

99 < 100 → ALLOW
```

The idea: weight the previous window's count by how much of it overlaps with the sliding window. If we're 25% into the current window, then 75% of the previous window still matters.

**Pros:** Low memory (just two counters per key). Smooth rate limiting without boundary bursts. Good enough accuracy for almost all use cases.

**Cons:** Not perfectly accurate. It's an approximation. But the error is small enough that it doesn't matter in practice.

### Token Bucket

Think of a bucket that holds tokens. Tokens are added at a fixed rate. Each request costs one token. If the bucket is empty, the request is denied.

**How it works:**

```
Bucket capacity: 10 tokens
Refill rate: 1 token per second

Time 0:   Bucket has 10 tokens
Burst:    5 requests arrive → 5 tokens consumed, 5 remaining
Time 1s:  1 token added → 6 tokens
Time 2s:  1 token added → 7 tokens
Burst:    10 requests arrive → 7 allowed, 3 denied
Time 3s:  1 token added → 1 token
```

**The key difference:** Token bucket allows controlled bursts. A user can send a burst of requests up to the bucket size, then they're limited to the refill rate. This is more forgiving than strict counting.

**Pros:** Allows controlled bursts (good for real-world traffic patterns). Smooth rate limiting. Used by AWS, Stripe, and most major APIs.

**Cons:** Slightly more complex to implement. Two parameters to tune (capacity and refill rate).

---

## Comparison Table

| Aspect             | Fixed Window    | Sliding Log   | Sliding Counter | Token Bucket                 |
| ------------------ | --------------- | ------------- | --------------- | ---------------------------- |
| **Memory usage**   | Very low        | High          | Low             | Low                          |
| **Accuracy**       | Approximate     | Exact         | Good enough     | Exact                        |
| **Burst handling** | Allows 2x burst | No bursts     | Smooth          | Controlled burst             |
| **Complexity**     | Simple          | Moderate      | Moderate        | Moderate                     |
| **Best for**       | Simple cases    | Strict limits | Most APIs       | APIs needing burst tolerance |

**Interview recommendation:** Default to **sliding window counter** for most systems. Mention **token bucket** if the interviewer asks about burst tolerance. Know the others exist to show breadth.

---

## Where to Put the Rate Limiter

You have two main options:

**Option 1: API Gateway / Middleware**

```
Client → API Gateway (rate limit check) → Backend Service
```

The rate limiter runs as middleware before your business logic. Every request passes through it. This is the most common approach.

**Option 2: Dedicated Rate Limiter Service**

```
Client → API Gateway → Rate Limiter Service → Backend Service
```

A separate service handles rate limiting. The gateway calls it on every request. More flexible, but adds a network hop.

**When to use which:**

- **Gateway middleware:** Simple, low-latency, good for most systems
- **Dedicated service:** When you need complex rules, multiple rate limiting policies, or shared limits across different services

For most interview answers, putting the rate limiter in the API Gateway as middleware is the right call.

---

## Distributed Rate Limiting

Here's where it gets interesting. Everything above works fine on a single server. But what happens with multiple servers?

### The Problem

```
Rate limit: 100 requests per minute per user

Server A: counts 50 requests from User-123
Server B: counts 50 requests from User-123

Total: 100 requests, but neither server blocked anything.
User-123 effectively got 2x the limit.
```

Local in-memory counters don't work in a distributed system. If you have N servers, users effectively get N times the limit.

### The Solution: Redis

Use a shared, centralized store for counters. Redis is the standard choice because:

- **Fast:** Single-digit millisecond reads/writes
- **Atomic operations:** `INCR` command is atomic, no race conditions on increment
- **TTL support:** Keys auto-expire, perfect for time-windowed counters
- **Proven:** Used by Stripe, GitHub, Cloudflare for rate limiting

For more on Redis and when to use it, see [Databases & Caching](/learn/database-caching).

### Lua Scripts for Atomicity

Even with Redis, you need to be careful. A "check then increment" pattern has a race condition:

```
Thread A: GET counter → 99
Thread B: GET counter → 99
Thread A: counter < 100, INCR → 100 ALLOWED
Thread B: counter < 100, INCR → 101 SLIPPED THROUGH (should have been blocked)
```

The fix: Redis Lua scripts execute atomically. The check-and-increment happens in a single operation:

```
-- Lua script (runs atomically in Redis)
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])  -- set TTL on first request
end
if count > tonumber(ARGV[2]) then
  return 0  -- DENIED
end
return 1  -- ALLOWED
```

This ensures no request slips through between the check and the increment.

### Fail-Open vs Fail-Closed

What happens when Redis goes down?

- **Fail-open:** Let all requests through. Your API keeps working, but you temporarily lose rate limiting. Better for user experience.
- **Fail-closed:** Block all requests. Your rate limiting is enforced, but your API is effectively down. Better for security-critical systems.

**For most systems, fail-open is the right choice.** A few seconds without rate limiting is better than a complete outage. For a deeper discussion on availability trade-offs, see [CAP Theorem](/learn/cap-theorem).

---

## Common Interview Mistakes

### Mistake 1: Only knowing one algorithm

"I'll use a counter per minute."

**Problem:** That's fixed window, and the interviewer will ask about its burst problem. If you can't discuss alternatives, you look like you memorized one answer.

**Better:** Mention sliding window counter as your default, explain token bucket for burst tolerance, and briefly reference the others.

### Mistake 2: Forgetting the distributed aspect

"I'll keep counters in memory on each server."

**Problem:** With 10 servers, users get 10x the limit. Local counters are useless in a distributed system.

**Better:** Use Redis as a shared counter store. Mention Lua scripts for atomicity.

### Mistake 3: Not discussing failure modes

"Redis will always be available."

**Problem:** Everything fails. The interviewer wants to see that you've thought about it.

**Better:** Discuss fail-open vs fail-closed. Explain why fail-open is usually preferred.

### Mistake 4: Ignoring client feedback

"If they're rate limited, they just get an error."

**Problem:** A bare error doesn't help the client. They don't know when to retry.

**Better:** Return `429 Too Many Requests` with `Retry-After` and `X-RateLimit-Remaining` headers. Tell the client exactly when they can try again.

---

## Summary: What to Remember

**The four algorithms:**

- **Fixed Window Counter:** Simple but has boundary burst problem
- **Sliding Window Log:** Accurate but memory-intensive
- **Sliding Window Counter:** Best default. Low memory, smooth limiting
- **Token Bucket:** Allows controlled bursts, used by most major APIs

**The distributed challenge:**

- Local counters don't work with multiple servers
- Redis is the standard shared store for counters
- Lua scripts prevent race conditions
- Fail-open is usually the right choice when Redis is down

**Key numbers:**

- Rate limiter latency budget: < 20ms (it's on every request)
- Redis `INCR`: ~0.1ms (fast enough)
- Standard response: HTTP 429 + `Retry-After` header

**Interview golden rule:**

```
Don't just say "I'll add a rate limiter."
Explain which algorithm, where it sits, how it works distributed,
and what happens when it fails.
```
