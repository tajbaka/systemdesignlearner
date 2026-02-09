## Introduction

The interviewer says: "Design a notification system."

You think, "Accept a request, call Twilio, done." Simple.

Then they follow up: "You need to send 5 million marketing emails. A user is waiting for their OTP code. How do you make sure the OTP doesn't wait behind 5 million emails? What happens when SendGrid goes down at 2am?"

And now you realize that a notification system isn't about sending messages. It's about reliable, prioritized, async delivery across multiple channels.

Here's how to design one that actually holds up under pressure.

---

## Functional Requirements

**1. Multi-channel support**

- Support Email (SendGrid/SES), SMS (Twilio), Push Notifications (FCM/APNS)
- Pluggable provider architecture -- swap Twilio for another SMS provider without changing core logic
- We don't build email servers or cell towers. We integrate with vendors.

**2. Notification prioritization**

- Distinguish High priority (OTP, 2FA, security alerts) from Low priority (marketing, newsletters, promotions)
- High priority must be delivered immediately, regardless of queue backlog
- A 2FA code waiting behind a million marketing emails = users can't log in

**3. User preferences and opt-out**

- Check user settings before sending (DND hours, channel preferences, opt-out)
- Legal compliance (CAN-SPAM, GDPR) -- users must be able to unsubscribe
- Respect "email only" or "no marketing" preferences

That's the core. A notification system accepts a request and ensures it reaches the user through the right channel, at the right priority, respecting their preferences.

---

## Non-Functional Requirements

**Reliability and no data loss**

- Notifications must not be lost. If Twilio is down, the SMS should retry, not disappear.
- At-least-once delivery using durable message queues (Kafka)
- Retry with exponential backoff for failed third-party calls
- Sending a duplicate notification is annoying. Losing a 2FA code is a blocker.

**High throughput and rate limiting**

- Handle millions of notifications per day
- Internal rate limiting to respect third-party API quotas (Twilio: 100 SMS/sec, SendGrid: 600 emails/sec)
- Horizontal scaling of workers to match demand
- For more on rate limiting approaches, see [Rate Limiting Algorithms](/learn/rate-limiting-algorithms).

**Scalability**

- The system must handle load spikes gracefully. A marketing campaign might trigger 5 million emails in an hour, while normal traffic is 50,000.
- Workers should be horizontally scalable -- spin up more during peak, scale down during quiet hours
- The message queue absorbs bursts so the workers can process at a steady pace
- See [Scaling](/learn/scaling) for details on horizontal vs vertical scaling strategies.

---

## API Design

**Send Notification**

```
POST /api/v1/notifications

Request Body:
{
  "userId": "user-123",
  "channel": "email",
  "content": {
    "subject": "Your order has shipped",
    "body": "Track your package at..."
  },
  "priority": "high"
}

Response:
{
  "notificationId": "notif-456",
  "status": "queued"
}

Status: 202 Accepted
```

**Why 202 and not 200?**

The notification isn't sent yet -- it's queued for processing. The API responds immediately, and the actual delivery happens asynchronously. This decouples the caller from the delivery pipeline. If we waited for the email to actually send, the API would be blocked for seconds.

**Key fields:**

- `userId` -- Who to notify
- `channel` -- How to reach them (email, sms, push)
- `priority` -- How urgent (high = OTP, low = marketing)
- `content` -- What to send (templated or raw)

**Error cases:**

- 400: Invalid request body or missing required fields
- 404: User not found or preferences not set
- 429: Rate limit exceeded for this user/channel

---

## High Level Design

Here's the architecture: internal services (like Order Service) call the Notification Service, which validates the request, checks user preferences against a User Prefs DB, and publishes valid messages to Kafka. From there, Notification Workers pull messages and call third-party providers (Twilio, SendGrid, FCM).

### Key Components

**1. Notification Service (API Layer)**

- Entry point for all notification requests
- Validates the request, checks user preferences against the User Prefs DB
- If user has opted out or is in DND mode, drops the notification early
- Publishes valid notifications to Kafka
- Returns 202 Accepted immediately

**2. User Preferences Database**

- Stores per-user settings: preferred channels, DND hours, opt-out lists
- Queried before publishing to the queue -- filter early, not late
- Can be cached in Redis for hot users

For more on when to use caches vs databases, see [Databases & Caching](/learn/database-caching).

**3. Kafka (Message Queue)**

- The backbone of the system
- Separate topics for priority: `notifications-high`, `notifications-low`
- Durable: messages persist until consumed. If workers crash, messages aren't lost.
- Handles traffic spikes: during a marketing blast, messages buffer in Kafka until workers catch up
- For a deep dive on Kafka vs RabbitMQ and when to use each, see [Message Queues](/learn/message-queues).

**4. Notification Workers**

- Pull messages from Kafka topics
- High-priority workers consume from `notifications-high` first
- Format content (apply templates), resolve provider-specific payloads
- Call third-party APIs (Twilio, SendGrid, FCM)
- Handle retries with exponential backoff on failure
- Horizontally scalable: add more workers during peak load. See [Scaling](/learn/scaling).

**5. Third-Party Providers**

- Twilio (SMS), SendGrid/SES (Email), FCM/APNS (Push)
- Each has its own rate limits and failure modes
- Workers must respect vendor rate limits to avoid getting blocked

### Why This Architecture

**Why Kafka (not direct API calls)?**

If the Order Service calls Twilio directly, what happens when Twilio is down? The order confirmation fails? No. Decouple with a queue. The Order Service fires-and-forgets to the Notification Service, which queues the message. Workers retry until delivery succeeds.

**Why separate priority topics?**

One queue = one bottleneck. A marketing blast of 5 million emails blocks every OTP in the system. Separate topics with dedicated worker pools ensure high-priority messages are processed immediately.

**Why check preferences before queuing?**

Filter early. Don't waste queue space and worker time on notifications the user doesn't want. Check DND and opt-out at the API layer, before the message hits Kafka.

---

## Detailed Design

### Delivery Pipeline

```
1. Order Service calls POST /api/v1/notifications
2. Notification Service validates request
3. Check User Prefs DB: Is user opted-in? Not in DND?
4. If valid, publish to Kafka topic (high or low priority)
5. Return 202 Accepted to caller

--- async boundary ---

6. Worker pulls message from Kafka
7. Resolve template, format for channel (email/SMS/push)
8. Call third-party API (SendGrid, Twilio, FCM)
9. On success: mark as delivered
10. On failure: retry with exponential backoff (1s, 2s, 4s, 8s...)
11. After N failures: move to Dead Letter Queue (DLQ)
```

The key insight is that everything above the async boundary is fast and synchronous. The caller gets a response in milliseconds. Everything below is slow, unreliable, and retryable -- exactly where async processing shines.

### Priority Queue Strategy

```
Workers allocation:
  High Priority Pool: 10 workers  ->  notifications-high topic
  Low Priority Pool:  5 workers   ->  notifications-low topic

During normal load:
  High: processes OTP in <1 second
  Low:  processes marketing in ~5-30 seconds

During marketing blast (5M emails):
  High: still processes OTP in <1 second (separate pool!)
  Low:  backlog grows, workers process at their pace
```

This is the single most important design decision in the system. Without separate priority lanes, a marketing blast makes your login flow unusable. The interviewer will almost certainly ask about this scenario -- have a clear answer ready.

You can also dynamically scale the low-priority pool during known campaigns. If marketing tells you a 5M email blast is happening Tuesday at 10am, you spin up 20 low-priority workers beforehand and scale back down after. The high-priority pool stays constant -- it should always have capacity to process OTPs within one second.

### Retry and Failure Handling

Exponential backoff with jitter prevents thundering herd problems when a provider recovers:

```
Attempt 1: immediate
Attempt 2: 1 second + random(0-500ms)
Attempt 3: 2 seconds + random(0-500ms)
Attempt 4: 4 seconds + random(0-500ms)
Attempt 5: Dead Letter Queue
```

**Dead Letter Queue (DLQ):**

- Messages that fail after max retries land here
- Operations team can inspect and replay
- Prevents poison messages from blocking the queue
- A notification stuck in retry forever would consume worker capacity and never succeed. The DLQ is your safety valve.

### Rate Limiting Third-Party APIs

```
Twilio rate limit:   100 SMS/sec
SendGrid rate limit: 600 emails/sec

Internal rate limiter per provider:
  - Token bucket algorithm per provider endpoint
  - Workers check rate limit before calling API
  - If limit reached, worker backs off and retries from queue
```

This protects you from getting banned by your own vendors. If you blast 10,000 SMS in one second, Twilio will throttle you or suspend your account. Your internal rate limiter should be set below the vendor's limit to leave headroom.

For more on rate limiting algorithms, see [Rate Limiting Algorithms](/learn/rate-limiting-algorithms).

### Notification Tracking

Store delivery status for observability:

```
notification_id | user_id  | channel | status    | attempts | last_error
notif-456       | user-123 | email   | delivered | 1        | null
notif-789       | user-456 | sms     | failed    | 5        | Twilio timeout
notif-012       | user-789 | push    | dlq       | 5        | FCM invalid token
```

This table is critical for debugging. When someone reports "I never got my OTP," you can look up the notification and see exactly what happened. Without this, you're flying blind.

You can also build dashboards on top of this data: delivery success rate per channel, average delivery latency, failure rate by provider. These metrics help you catch issues before users report them.

### Provider Failover

What happens when SendGrid goes down at 2am? You need a fallback strategy:

```
Primary provider: SendGrid
Fallback provider: SES

Flow:
1. Worker tries SendGrid
2. SendGrid returns 503 (down)
3. Circuit breaker trips after 5 consecutive failures
4. Worker switches to SES for email delivery
5. Background health check pings SendGrid periodically
6. When SendGrid recovers, circuit breaker resets
```

This is a detail that separates strong candidates from average ones. The interviewer wants to see that you've thought about what happens when things break -- not just the happy path.

For a structured approach to covering these edge cases, see [System Design Structure](/learn/system-design-structure).

---

## Common Interview Mistakes

### Mistake 1: Calling third-party APIs synchronously

"The API receives the request and calls Twilio directly."

**Problem:** If Twilio is slow (2 seconds) or down, your API hangs. The calling service is blocked.

**Better:** Queue the notification, return 202 Accepted, let workers handle delivery asynchronously.

### Mistake 2: Using a single queue for all priorities

"All notifications go into one Kafka topic."

**Problem:** A marketing blast of 5 million emails blocks every OTP in the system. Users can't log in.

**Better:** Separate topics by priority with dedicated worker pools.

### Mistake 3: Not discussing retry logic

"Messages just get processed."

**Problem:** Third-party APIs fail. Networks have hiccups. The interviewer wants to see you've thought about failure.

**Better:** Exponential backoff with jitter, max retry limit, dead letter queue for failed messages.

### Mistake 4: Forgetting user preferences

"We send the notification to whatever channel was requested."

**Problem:** Users who opted out still get emails. This violates GDPR/CAN-SPAM and annoys users.

**Better:** Check user preferences before queuing. Filter early, not late.

### Mistake 5: Not mentioning vendor rate limits

"Workers send as fast as possible."

**Problem:** Third-party APIs have rate limits. Exceed them and you get blocked or throttled.

**Better:** Internal rate limiting per provider. Workers respect vendor quotas using a token bucket algorithm.

---

**Interview golden rule:**

Don't just say "I'll send notifications." Explain the async pipeline, how priorities are separated, what happens when providers fail, and how you respect user preferences.
