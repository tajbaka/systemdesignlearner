## Introduction

The interviewer says: "Design a distributed rate limiter."

You think, "Just count requests and block when they exceed the limit." Simple, right?

Then they follow up: "You have 50 API servers. How do you share counters across all of them? What algorithm do you use? What happens when Redis goes down? Does your entire API stop working?"

And now you realize that rate limiting isn't about counting. It's about distributed coordination, atomicity, and failure tolerance.

Here's how to design a rate limiter that actually works at scale.

---

## Functional Requirements

**1. Throttling rules**

- Limit requests based on client identifiers (IP address, User ID, API Key)
- Apply limits within a specific time window (e.g., 100 requests per minute)

**2. Configurable limits**

- Support different limits per user tier (free: 10 req/sec, paid: 100 req/sec)
- Support different limits per endpoint (login: 5 req/min, search: 50 req/min)
- Rules should be configurable without code changes

**3. Client feedback**

- Return HTTP `429 Too Many Requests` when a client is throttled
- Include `Retry-After` header so clients know when to try again
- Include `X-RateLimit-Remaining` header so clients can self-regulate

That's the core. A rate limiter decides one thing: is this request allowed or denied?

---

## Non-Functional Requirements

**Ultra-low latency**

- This is middleware that runs on every single request
- Target: under 20ms per check
- If the rate limiter is slow, your entire API is slow

**High availability**

- If the rate limiter goes down, what happens to your API?
- Default strategy: **fail-open**. Allow requests through when the limiter is unavailable
- This trades temporary rate limit enforcement for API availability
- For security-critical systems (login endpoints), consider fail-closed instead

**Distributed consistency**

- Counters must be shared across all API servers
- Local in-memory counters don't work. If you have 10 servers, users get 10x the limit
- Need a shared store (Redis) for counter synchronization

For more on availability vs consistency trade-offs, see [CAP Theorem](/learn/cap-theorem).

---

## API Design

The rate limiter is typically internal middleware, not a public API. But it still has a clear interface:

**Check Rate Limit**

```
POST /api/v1/ratelimit/check

Request Body:
{
  "key": "user-123",
  "cost": 1
}

Response (Allowed):
{
  "allowed": true,
  "remaining": 45,
  "resetAt": "2024-01-15T12:01:00Z"
}

Status: 200 OK
Headers:
  X-RateLimit-Remaining: 45
  X-RateLimit-Reset: 1705320060
```

```
Response (Denied):

Status: 429 Too Many Requests
Headers:
  Retry-After: 30
  X-RateLimit-Remaining: 0
  X-RateLimit-Reset: 1705320060
```

**The key fields:**

- `key`: Who are we limiting? (user ID, IP address, API key)
- `cost`: How much does this request "cost"? (usually 1, but expensive operations can cost more)
- `remaining`: How many requests the client has left in this window
- `resetAt`: When the rate limit window resets

In practice, this often isn't a separate HTTP call. The rate limiter runs as middleware in the API Gateway, checking Redis directly. But the logical interface is the same.

---

## High Level Design

Here's the overall architecture:

![Rate Limiter High-level Design](diagram:rate-limiter)

### Key Components

**1. API Gateway**

- Entry point for all client requests
- Contains the rate limiting middleware
- Checks the rate limiter before forwarding to backend services

**2. Rate Limiter Service**

- The core logic: check counter, allow or deny, update counter
- Can be embedded in the gateway or run as a separate service
- Stateless: all state lives in Redis

**3. Redis Cache**

- Shared, centralized store for all rate limit counters
- Fast: single-digit millisecond responses
- Atomic operations: `INCR` is atomic, no race conditions on basic increments
- TTL support: keys auto-expire when the time window ends
- This is the heart of the system

**4. Backend Workers**

- Your actual API services
- Only receive requests that passed rate limiting
- Completely unaware of the rate limiter

For a deep dive on rate limiting algorithms (fixed window, sliding window, token bucket), see [Rate Limiting Algorithms](/learn/rate-limiting-algorithms).

### Why This Architecture

**Why Redis (not a SQL database)?**

Rate limiting runs on the critical path of every request. You need sub-millisecond latency. SQL databases operate at 1-5ms per query. Redis operates at 0.1ms. That's 10-50x faster. Plus Redis has atomic `INCR` with TTL, purpose-built for counters.

For more on when to use Redis vs SQL, see [Databases & Caching](/learn/database-caching).

**Why the limiter sits before business logic?**

The whole point of rate limiting is to protect your backend. If the rate limiter runs after your business logic, you've already done the expensive work. Check first, then process.

**Why not just use local memory counters?**

```
Scenario: 100 req/min limit, 10 API servers

With local counters:
  Server A: allows 100 requests from User-123
  Server B: allows 100 requests from User-123
  ...
  Server J: allows 100 requests from User-123

  User-123 made 1,000 requests. Limit was 100.
```

Local counters give users N times the limit, where N is the number of servers. Shared Redis counters solve this.

---

## Detailed Design

### Algorithm Choice

For most systems, use the **sliding window counter** algorithm. Here's why:

- **Low memory:** Just two counters per key (current window + previous window)
- **No boundary burst:** The weighted average smooths out window boundaries
- **Good enough accuracy:** The approximation error is negligible in practice
- **Simple to implement in Redis:** Two keys with TTL

If the interviewer asks about burst tolerance, mention **token bucket** as an alternative. Token bucket allows controlled bursts up to a bucket size, then limits to the refill rate. AWS and Stripe use this approach.

For a detailed comparison of all four algorithms, see [Rate Limiting Algorithms](/learn/rate-limiting-algorithms).

### Redis Data Model

**Key structure:**

```
Key format: ratelimit:{identifier}:{window}
Example:    ratelimit:user-123:202401151200

Value:      integer counter
TTL:        window size (e.g., 60 seconds)
```

For sliding window counter, you need two keys per identifier: current window and previous window. The previous window's count is weighted based on how far into the current window you are.

**Example:**

```
Current time: 12:01:15 (25% into the current minute)

Key: ratelimit:user-123:202401151200 → 84 (previous window)
Key: ratelimit:user-123:202401151201 → 36 (current window)

Weighted count = (84 × 0.75) + (36 × 1.0) = 63 + 36 = 99
Limit: 100

99 < 100 → ALLOWED
```

### Lua Scripts for Atomicity

Even though Redis `INCR` is atomic, the full rate limiting check involves multiple operations: read counter, compare to limit, increment if allowed. This sequence needs to be atomic.

**The race condition without Lua:**

```
Thread A: GET counter → 99
Thread B: GET counter → 99
Thread A: 99 < 100, INCR → 100 ALLOWED
Thread B: 99 < 100, INCR → 101 SLIPPED THROUGH (should have been blocked)
```

**The fix: a Lua script that runs atomically in Redis:**

```
-- Pseudocode: Atomic rate limit check
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], window_size)
end
if count > limit then
  return {0, 0, ttl}  // DENIED, 0 remaining
end
return {1, limit - count, ttl}  // ALLOWED, remaining, reset time
```

Lua scripts execute as a single atomic operation in Redis. No other command can run between the `INCR` and the limit check. This eliminates the race condition entirely.

### Rules Engine

Rate limit rules need to be configurable. Store them in a config that maps identifiers to limits:

```
Rules:
  default:        100 req/min
  free-tier:      10 req/min
  pro-tier:       1000 req/min

  /api/login:     5 req/min    (per IP)
  /api/search:    50 req/min   (per user)
  /api/upload:    10 req/min   (per user)
```

The rate limiter loads these rules on startup and checks the appropriate rule for each request. Rules can be stored in a config file, a database, or a config service.

**Priority order:** Endpoint-specific rule > User tier rule > Default rule.

### Fail-Open Strategy

When Redis is unavailable:

```
1. Rate limiter tries to check Redis
2. Redis is down (timeout or connection error)
3. Fail-open: return ALLOWED
4. Log the failure for monitoring
5. Set a circuit breaker to avoid hammering Redis
6. Periodically retry Redis connection
7. When Redis recovers, resume normal rate limiting
```

This means during a Redis outage, rate limiting is temporarily disabled. Your API keeps working, but you're unprotected for that period. For most systems, this is the right trade-off.

**When to fail-closed instead:**

- Login/authentication endpoints (prevent brute force)
- Payment endpoints (prevent charge abuse)
- Any endpoint where abuse has severe consequences

### Response Headers

Always include rate limit information in response headers, even for allowed requests:

```
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1705320060

--- or when blocked ---

HTTP/1.1 429 Too Many Requests
Retry-After: 30
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705320060
```

This lets well-behaved clients self-regulate and back off before hitting the limit.

---

## Common Interview Mistakes

### Mistake 1: Using local memory counters

"I'll keep a counter in each server's memory."

**Problem:** With N servers, users get N times the rate limit. A load balancer distributes requests across servers, so each server only sees a fraction of the traffic.

**Better:** Use Redis as a shared counter store across all servers.

### Mistake 2: Ignoring the distributed coordination problem

"I'll just increment a counter."

**Problem:** In a distributed system, check-then-increment has race conditions. Two threads can read the same count and both allow the request.

**Better:** Use Redis Lua scripts to make the check-and-increment atomic.

### Mistake 3: Not discussing what happens when the limiter fails

"Redis will always be up."

**Problem:** Everything fails. The interviewer specifically wants to hear your failure strategy.

**Better:** Discuss fail-open vs fail-closed. Explain that fail-open preserves API availability at the cost of temporary rate limit enforcement. Mention circuit breakers.

### Mistake 4: Overcomplicating with message queues

"I'll put requests into Kafka and process them with rate limiting workers."

**Problem:** Rate limiting needs to happen synchronously, before the request is processed. Adding Kafka adds latency and complexity for no benefit.

**Better:** Rate limiting is middleware. Fast, synchronous, on the critical path. Redis is all you need for the data store.

### Mistake 5: Only discussing one algorithm

"I'll count requests per minute."

**Problem:** That's fixed window, and it has a known burst problem. If you can't discuss alternatives, you look unprepared.

**Better:** Default to sliding window counter, mention token bucket for burst tolerance, and briefly reference fixed window's limitations.

---

**Interview golden rule:**

Don't just say "I'll add rate limiting." Explain which algorithm you'd use, where the limiter sits in the request flow, how counters are shared across servers, and what happens when Redis goes down.
