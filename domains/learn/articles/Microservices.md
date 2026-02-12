## Introduction

You're in your system design interview, and you've just drawn out an architecture with five separate services: user service, order service, payment service, notification service, inventory service.

The interviewer looks at the board: "Why not just put everything in one service?"

You say: "Microservices are better because they scale."

Now the follow-up: "How does splitting into five services help you scale? You still have the same number of requests. And now you've added four network boundaries, five deployment pipelines, and distributed transaction problems. Convince me this is worth it."

And you're stuck. Because "microservices scale better" isn't a real answer. The real answer is about when and why the split is justified, and more importantly, when it isn't. Microservices add genuine complexity. You need to articulate exactly what you're getting in return.

---

## Monolith vs Microservices

Here's something that gets lost in the hype: a monolith isn't bad. For most early-stage products, a monolith is the right choice.

A monolith is a single deployable unit where all your code lives together. One codebase, one build, one deployment.

### Why Monoliths Are Great

**Simplicity.** One codebase, one repo, one deployment pipeline. A junior developer can clone the repo and understand the entire system in a week. You can step through the entire request flow in a debugger.

**Speed of development.** Need to add a feature that touches users, orders, and payments? You make changes in three files and deploy once. No coordinating across teams, no versioning APIs, no integration testing across service boundaries.

**Easy debugging.** Stack traces go from top to bottom. No chasing logs across five different services, correlating request IDs, and wondering which service dropped the ball.

**Transactions are simple.** Want to debit a user's balance AND create an order AND reserve inventory? One database transaction. Done. ACID guarantees. No saga pattern, no compensating transactions, no eventual consistency headaches.

### Why Microservices Exist

So if monoliths are so great, why does anyone use microservices?

Because monoliths break down at a specific scale, and it's usually the team scale, not the traffic scale.

**Independent deployment.** The payments team can ship a fix without waiting for the notifications team to finish their feature. In a monolith with 200 developers, merging to main becomes a bottleneck. Deploy trains back up. One broken test blocks everyone.

**Independent scaling.** Your search service gets 100x more traffic than your admin dashboard. With a monolith, you scale the entire thing. With microservices, you throw 50 instances at search and 2 at admin. You save real money.

**Team autonomy.** Teams own their service end-to-end. They pick their tech stack, set their release cadence, manage their own on-call. This matters when you have 50+ engineers working on the same product.

**Fault isolation.** A memory leak in the notification service doesn't take down checkout. In a monolith, one runaway process kills everything.

### The Comparison

| Aspect                | Monolith                          | Microservices                         |
| --------------------- | --------------------------------- | ------------------------------------- |
| **Deployment**        | One unit, all or nothing          | Independent per service               |
| **Scaling**           | Scale everything together         | Scale individual services             |
| **Development speed** | Fast initially, slows with growth | Slower initially, scales with teams   |
| **Debugging**         | Simple (single process)           | Hard (distributed tracing needed)     |
| **Data consistency**  | ACID transactions                 | Eventual consistency, saga patterns   |
| **Team independence** | Low (shared codebase)             | High (each team owns their service)   |
| **Operational cost**  | Low (one thing to monitor)        | High (N things to deploy and monitor) |
| **Technology choice** | One stack for everything          | Each service can use best tool        |

### When to Split

Here's the rule of thumb: **start with a monolith. Split when you have clear reasons.**

Those reasons are:

1. **3+ teams** are stepping on each other's toes in the same codebase
2. **Clear domain boundaries** exist, and you can draw lines between business capabilities
3. **Different scaling requirements** where one part of the system needs 100x the resources of another
4. **Different release cadences** where one team needs to deploy 10 times a day, another deploys weekly

If you don't have at least two of these, stay monolithic. Premature decomposition is one of the most expensive architectural mistakes you can make.

---

## Service Boundaries

This is where most people get microservices wrong. They split by technical layer instead of business domain.

### The Wrong Way: Technical Layers

![Technical layers anti-pattern](diagram:ms-tech-layers)

This is just a distributed monolith. You have all the complexity of microservices with none of the benefits. Every feature requires coordinated changes across services. Deployment independence? Gone.

### The Right Way: Business Domains

![Business domain services](diagram:ms-business-domains)

Each service maps to a business capability. The user service handles registration, authentication, profiles. The order service handles cart, checkout, order history. The payment service handles charges, refunds, invoices. The notification service handles email, SMS, push.

This is Domain-Driven Design (DDD) in practice. You draw boundaries around **bounded contexts**: areas of the business that have their own language, rules, and data.

### The Golden Rule: Each Service Owns Its Data

This is non-negotiable. Every service has its own database. No shared databases.

![Shared database anti-pattern](diagram:ms-shared-db)

![Independent databases](diagram:ms-independent-db)

If the order service needs user data, it calls the user service's API. It does not reach into the user database directly. Yes, this means a network call instead of a JOIN. That's the trade-off, and it's intentional.

### How to Find Boundaries

Ask yourself these questions:

1. **Can this capability be developed by one team?** If yes, it's probably one service.
2. **Does this data belong together?** Orders and line items belong together. Orders and user profiles don't.
3. **If I change this code, do I need to change something else?** If two pieces always change together, they're probably one service.
4. **Does this have different scaling needs?** Search traffic is bursty. User profile updates are steady. Different services.

Don't over-split. Five well-defined services are better than twenty poorly-defined ones. Each service boundary adds communication overhead, debugging complexity, and operational cost.

---

## Communication Patterns

Your services need to talk to each other. There are two fundamental patterns: synchronous and asynchronous. Knowing when to use which is critical.

### Synchronous: REST and gRPC

Synchronous communication means "I call you and wait for a response."

**REST (HTTP/JSON)**

The default for most service-to-service communication. Simple, well-understood, easy to debug with curl.

![REST request/response](diagram:ms-rest)

- Human-readable (JSON)
- Easy to debug and test
- Widely supported by every language and framework
- Overhead from HTTP headers and JSON serialization

**gRPC (HTTP/2 + Protocol Buffers)**

Higher performance alternative. Uses binary serialization (Protocol Buffers) and HTTP/2 for multiplexing.

![gRPC binary request/response](diagram:ms-grpc)

- 2-10x faster than REST (binary serialization, HTTP/2)
- Strongly typed; proto files are the contract
- Supports streaming (server-side, client-side, bidirectional)
- Harder to debug (binary on the wire)
- Requires code generation from proto files

### Asynchronous: Message Queues and Events

Asynchronous communication means "I send you a message and move on. You process it when you're ready."

This is where [Message Queues](/learn/message-queues) come in. Instead of calling the notification service directly, the order service drops a message on a queue. The notification service picks it up when it's ready.

![Async message queue](diagram:ms-async-queue)

**Why async?**

- **Decoupling.** The order service doesn't know or care if the notification service is up. The queue absorbs the difference.
- **Resilience.** If the notification service crashes, messages wait in the queue. When it comes back up, it processes the backlog. No lost work.
- **Spike handling.** Black Friday traffic spike? Messages queue up. Workers process them at a sustainable rate. Nothing crashes.

### Quick Comparison

| Aspect               | REST                       | gRPC                         | Message Queue               |
| -------------------- | -------------------------- | ---------------------------- | --------------------------- |
| **Communication**    | Synchronous                | Synchronous                  | Asynchronous                |
| **Format**           | JSON (text)                | Protocol Buffers (binary)    | Any (JSON, Avro, Protobuf)  |
| **Performance**      | Moderate                   | High (2-10x over REST)       | Varies (not latency-bound)  |
| **Coupling**         | Moderate (caller waits)    | Moderate (caller waits)      | Low (fire and forget)       |
| **Failure handling** | Caller handles errors      | Caller handles errors        | Queue retries automatically |
| **Debugging**        | Easy (curl, browser)       | Harder (binary, needs tools) | Moderate (queue inspection) |
| **Best for**         | CRUD, simple request/reply | High-perf internal APIs      | Async processing, events    |
| **Streaming**        | No (without SSE/WebSocket) | Yes (built-in)               | N/A (different model)       |

### When to Use What

**Use REST when:**

- The caller needs an immediate response
- External-facing APIs (public developer APIs)
- Simple CRUD operations
- You want maximum simplicity and debuggability

**Use gRPC when:**

- High-throughput internal service-to-service calls
- You need streaming (live data feeds, real-time updates)
- Type safety and API contracts matter (large teams)
- Latency is critical

**Use message queues when:**

- The caller doesn't need an immediate response
- You need resilience to downstream failures
- Work can be processed later (email, analytics, reports)
- You need to handle traffic spikes gracefully

In a typical microservices architecture, you'll use a mix. REST for external APIs and simple internal calls. gRPC for performance-critical internal communication. Message queues for everything that can be async.

---

## Stateless Services and Horizontal Scaling

If you want to scale a microservice horizontally (just add more instances), the service must be stateless. This is a fundamental constraint, and it's one interviewers expect you to understand.

### What Stateless Means

A stateless service doesn't store any request-specific data in memory between requests. Any instance can handle any request. There's no "sticky session" where user A must always go to server 3.

![Stateless services with external stores](diagram:ms-stateless)

Request 1 from User A hits Instance 1. Request 2 from User A hits Instance 3. Both work perfectly because all state lives in external stores.

### Where State Goes

Instead of keeping state in the service, you externalize it:

- **Session data** goes to Redis or another distributed cache
- **User data** goes to the database
- **File uploads** go to object storage (S3)
- **Auth tokens** are self-contained (JWTs) or validated against a shared store

This pattern unlocks everything that makes [horizontal scaling](/learn/scaling) work. Need to handle 10x the traffic? Spin up 10x the instances behind the load balancer. The load balancer distributes requests evenly. Every instance is identical and interchangeable.

### Why Sticky Sessions Are Bad

Sometimes people try to cheat statelessness with sticky sessions, where the load balancer always routes User A to the same instance. This is fragile.

- If that instance dies, User A loses their session
- You can't scale down without disrupting active users
- Load distribution becomes uneven (some instances get heavier users)
- You're not really stateless. You're pretending to be.

Don't do it. Externalize state properly.

### The Auto-Scaling Story

Stateless services enable auto-scaling. Cloud providers (AWS, GCP, Azure) can automatically:

1. Monitor CPU/memory/request count
2. Spin up new instances when load increases
3. Terminate instances when load decreases
4. All without any manual intervention

This only works when instances are interchangeable. If Instance 3 has special state that no other instance has, you can't just kill it.

---

## Service Discovery and Load Balancing

You have 20 instances of the order service and 10 instances of the payment service. When the order service needs to call the payment service, how does it know where to send the request? The IP addresses change as instances scale up and down. You can't hardcode them.

This is the service discovery problem.

### Client-Side Discovery

The service itself is responsible for finding other services.

![Client-side service discovery](diagram:ms-client-discovery)

Each service instance registers itself with a service registry (Consul, etcd, ZooKeeper). When Service A needs to call Service B, it queries the registry, gets a list of healthy instances, and picks one (round-robin, random, least connections).

**Pros:** No single proxy bottleneck. Client can implement smart routing.
**Cons:** Every service needs discovery logic. Coupling to the registry.

### Server-Side Discovery

A load balancer sits between services. The caller just hits the load balancer, which handles finding healthy instances.

![Server-side service discovery](diagram:ms-server-discovery)

The caller doesn't know or care how many instances exist. It just calls `http://payment-service/payments` and the load balancer handles the rest.

**Pros:** Simple for the caller. Load balancing is centralized.
**Cons:** Load balancer is an extra hop and potential bottleneck.

### DNS-Based Discovery

The simplest approach. Each service gets a DNS name that resolves to one or more IP addresses. When instances change, DNS records update.

- Simple and works everywhere
- DNS caching can cause stale routing (TTL issues)
- No health checking at the DNS level (unless you use something like AWS Route 53 health checks)

### Kubernetes: All Built In

If you're running on Kubernetes (and most people are these days), service discovery is solved for you.

Every Kubernetes Service gets a DNS name (`payment-service.default.svc.cluster.local`). Kubernetes handles:

- Service registration (automatic when pods start)
- Health checking (liveness and readiness probes)
- Load balancing (kube-proxy distributes traffic)
- DNS resolution (CoreDNS)

In an interview, it's fine to say "we'd deploy on Kubernetes, which handles service discovery and load balancing natively." But you should understand the underlying concepts in case they push deeper.

### Health Checks and Circuit Breakers

Service discovery isn't just about finding services. It's about finding **healthy** services.

**Health checks** run periodically. If an instance fails its health check, it gets removed from the pool. No more traffic gets routed to it.

**Circuit breakers** protect against cascading failures. If the payment service starts responding with errors or timing out, the circuit breaker "opens" and stops sending requests. Instead of waiting for timeouts on every call, you fail fast.

```
Circuit Breaker States:

CLOSED (normal):
  Requests flow through normally.
  Track error rate.

OPEN (tripped):
  Error rate exceeded threshold.
  All requests fail immediately (no waiting).
  After timeout, move to HALF-OPEN.

HALF-OPEN (testing):
  Allow one request through.
  If it succeeds -> CLOSED.
  If it fails -> OPEN again.
```

In an interview, mentioning circuit breakers when you draw a service-to-service call shows operational maturity. Things fail. Your architecture should handle it gracefully.

---

## The Downsides

You need to be honest about the costs of microservices. Interviewers will push on this. If you only talk about the benefits, it sounds like you've never actually operated a microservices system.

### Distributed Transactions Are Hard

In a monolith, creating an order involves:

1. Debit user's balance
2. Create order record
3. Reserve inventory

One database transaction. If step 3 fails, steps 1 and 2 roll back automatically. ACID. Done.

In microservices, each step might be a different service with a different database. There's no cross-service transaction. You need the **saga pattern**: a sequence of local transactions with compensating actions for rollback.

```
Saga Pattern: Create Order

1. Payment Service: charge $49.99
   -> Success

2. Order Service: create order record
   -> Success

3. Inventory Service: reserve items
   -> FAILURE

Compensating actions (rollback):
3. (nothing to undo, it failed)
2. Order Service: cancel order
1. Payment Service: refund $49.99
```

This is complex, error-prone, and hard to debug. If your system doesn't need independent scaling or deployment, don't impose this on yourself.

### Debugging Is Painful

A request flows through 5 services. Something goes wrong. Which service? You need:

- **Distributed tracing** (Jaeger, Zipkin, Datadog APM) to follow a request across services
- **Correlation IDs** passed through every service call so you can search for a request across logs
- **Centralized logging** (ELK stack, Datadog Logs) because you can't SSH into 50 instances to grep logs
- **Service mesh observability** (Istio, Linkerd) for network-level visibility

In a monolith, you open one log file. In microservices, you need infrastructure just to understand what happened.

### Network Calls Are Slow

A function call takes nanoseconds. A network call takes milliseconds. That's a 1,000,000x difference.

When you split a monolith into microservices, some function calls become network calls. If you're not careful, a request that used to take 5ms now takes 50ms because it hits 3 services sequentially.

Mitigation: make calls in parallel where possible, use caching aggressively, and consider whether the split is actually justified.

### Operational Overhead

With 1 service, you have:

- 1 deployment pipeline
- 1 set of logs
- 1 monitoring dashboard
- 1 on-call rotation

With 20 services, you have 20 of everything. That's 20 CI/CD pipelines to maintain, 20 sets of alerts to configure, 20 services to keep running. You need a platform team just to manage the infrastructure.

### Data Consistency Is Harder

No shared database means no JOINs across services. Need to show a user's order history with product details? The order service has the orders, the product service has the product details. You either:

1. Make two API calls and join in the client
2. Denormalize data (store product names in the order service)
3. Use an event-driven approach where services publish changes and others subscribe

All of these have trade-offs. Eventual consistency, where data across services may be temporarily out of sync, is the norm. If you need strong consistency, microservices make it much harder.

For more on event-driven approaches that help manage data flow across services, see [Fan-Out Strategies](/learn/fan-out-strategies).

### Testing Is Complex

Unit testing a single service is easy. Testing the interaction between five services? That's where it gets hard.

- You need contract tests to verify API compatibility
- Integration tests require running multiple services
- End-to-end tests are slow and flaky
- You need test environments that mirror production topology

---

## Common Interview Mistakes

### Mistake 1: "I Always Use Microservices"

> "For this design, I'll use microservices because they're the industry standard."

**Problem:** You just told the interviewer you reach for the complex solution by default, regardless of the problem. A simple CRUD app with one developer doesn't need microservices. You're adding deployment complexity, network latency, distributed debugging, and operational overhead for zero benefit.

**Better:** "I'd start with a monolith for this use case since it's a relatively simple domain with a small team. If we later see team scaling issues or need independent deployment of specific components, we can extract those into services along clear domain boundaries."

### Mistake 2: Drawing 15 Services for a Simple System

> "Here's my URL shortener: URL service, redirect service, analytics service, user service, auth service, rate limiting service, cache service, database service, logging service..."

**Problem:** You've turned a system that could be one service and one database into a distributed systems nightmare. Every service boundary adds latency, failure modes, and operational cost. The interviewer is testing your judgment, not your ability to draw boxes.

**Better:** "A URL shortener is simple enough for a single service. I'd consider splitting out analytics into its own service if the write volume is significantly different from the redirect path, but I wouldn't split further without a clear reason."

### Mistake 3: Shared Databases Between Services

> "The order service and the inventory service both read from the same products table."

**Problem:** You've created tight coupling through the database. Schema changes in the products table can break both services. You can't deploy them independently. You can't scale their databases independently. You've lost the main benefit of microservices (independence) while keeping all the complexity.

**Better:** "Each service owns its own data. The order service stores the product information it needs (name, price at time of order) in its own database. If the product service updates a product name, it publishes an event, and the order service updates its local copy."

### Mistake 4: Ignoring Failure Modes

> "The order service calls the payment service, which calls the notification service."

**Problem:** You described the happy path but said nothing about what happens when a service is down. The interviewer is now going to ask: "What if the payment service is down? What if the notification service is slow? Do you retry? How long does the user wait?" If you haven't thought about this, it's a red flag.

**Better:** "The order service calls the payment service synchronously because we need the payment result before confirming the order. If the payment service is down, we return an error to the user and they retry. For notifications, we use a message queue. The order service publishes an OrderCompleted event, and the notification service picks it up asynchronously. If the notification service is down, messages wait in the queue. We also add circuit breakers on the payment service call to fail fast instead of waiting for timeouts."

---

## Summary: What to Remember

- A monolith isn't bad. It's simpler, faster to develop, and easier to debug. Start there.
- Split into microservices when you have 3+ teams, clear domain boundaries, and different scaling/deployment needs.
- Split by business domain (user, order, payment), not by technical layer (frontend, backend, database).
- Each service owns its data. No shared databases. This is non-negotiable.
- REST for simple sync calls, gRPC for high-performance internal APIs, message queues for async work.
- Stateless services enable horizontal scaling. Externalize all state to Redis, databases, or object storage.
- Service discovery solves "how do services find each other." Kubernetes handles this natively.
- Be honest about the downsides: distributed transactions, debugging complexity, network latency, operational overhead.
- Circuit breakers and health checks prevent cascading failures between services.
- Don't over-split. Five well-defined services beat twenty poorly-defined ones.

**Interview golden rule:**

```
Don't say "I use microservices because they scale."
Say WHY you're splitting (team autonomy, independent
scaling, different deployment cadences) and acknowledge
the cost (distributed transactions, debugging complexity,
operational overhead). The best answer often starts with
a monolith and explains when you'd split.
```
