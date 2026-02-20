## Introduction

You're designing an e-commerce checkout flow. The user clicks "Place Order" and your system needs to charge their credit card, reserve inventory, and create a shipping label. You've split these into three microservices because the interviewer nodded approvingly when you drew the service boundaries.

Then the follow-up: "The payment goes through, but the inventory service is down. Now you've charged the user but can't reserve the items. What do you do?"

And you're stuck. Because in a monolith, you'd wrap all three operations in a single database transaction. If inventory fails, the payment rolls back automatically. ACID. Done. But in microservices, each service has its own database. There's no cross-service transaction. You need a different strategy entirely.

This is the distributed transaction problem, and it shows up in almost every microservices design interview. Here's how to think about it, what the solutions are, and when to use each.

---

## The Problem: Operations That Span Multiple Services

In a monolith, multi-step operations are easy:

```
BEGIN TRANSACTION;
  UPDATE accounts SET balance = balance - 49.99 WHERE user_id = 123;
  INSERT INTO orders (user_id, status) VALUES (123, 'confirmed');
  UPDATE inventory SET reserved = reserved + 1 WHERE item_id = 456;
COMMIT;
```

If any step fails, the whole thing rolls back. The database guarantees atomicity. You either get all three changes or none of them.

In a [microservices](/learn/microservices) architecture, each step hits a different service with a different database. There's no single transaction coordinator that can wrap all three. You're dealing with three independent databases, three independent failure modes, and three independent network calls.

The fundamental challenge: **how do you keep multiple services consistent when any step can fail, any network call can time out, and any service can crash mid-operation?**

There are two main approaches: Two-Phase Commit (2PC) for strong consistency, and the Saga pattern for eventual consistency. You need to know both.

---

## Two-Phase Commit (2PC)

Two-Phase Commit is the classic protocol for distributed transactions. It works like a wedding ceremony: the officiant asks each party "do you?", and only if everyone says yes does the marriage happen.

### The Protocol

There's a **coordinator** (the transaction manager) and multiple **participants** (the databases or services involved in the transaction).

**Phase 1: Prepare (Vote)**

The coordinator asks each participant: "Can you commit this change?"

Each participant:

1. Executes the operation locally (but doesn't commit)
2. Writes the changes to a local transaction log (for recovery)
3. Acquires any necessary locks
4. Responds with either VOTE YES or VOTE NO

```
Coordinator                Participant A       Participant B
    |                           |                    |
    |--- PREPARE ------------->|                    |
    |--- PREPARE --------------------------------->|
    |                           |                    |
    |<-- VOTE YES -------------|                    |
    |<-- VOTE YES --------------------------------|
```

**Phase 2: Commit (or Abort)**

If ALL participants voted YES, the coordinator sends COMMIT to everyone. If ANY participant voted NO (or timed out), the coordinator sends ABORT to everyone.

```
Scenario 1: All vote YES

Coordinator                Participant A       Participant B
    |                           |                    |
    |--- COMMIT -------------->|                    |
    |--- COMMIT ---------------------------------->|
    |                           |                    |
    |<-- ACK ------------------|                    |
    |<-- ACK --------------------------------------|


Scenario 2: Any vote NO

Coordinator                Participant A       Participant B
    |                           |                    |
    |--- ABORT --------------->|                    |
    |--- ABORT ----------------------------------->|
    |                           |                    |
    (participants roll back local changes)
```

### When 2PC Works Well

2PC is designed for **database-level transactions** where you need strong consistency across multiple databases. Think:

- Cross-database writes in a sharded system (write to shard A and shard B atomically)
- Distributed databases that need ACID across partitions (e.g., Google Spanner, CockroachDB)
- XA transactions across two databases within the same data center

### The Downsides

2PC has serious problems that make it impractical for most microservices architectures:

**Blocking protocol.** Once a participant votes YES in Phase 1, it holds locks and waits for the coordinator's decision. If the coordinator crashes after collecting votes but before sending the commit/abort decision, all participants are stuck. They can't commit (they don't know if everyone voted yes). They can't abort (they already voted yes). They just wait, holding locks. This can block other transactions for minutes or hours.

**Coordinator is a single point of failure.** The coordinator must be available for the entire duration of the transaction. If it dies mid-protocol, recovery is complex. You need to persist the coordinator's state and have a recovery process that can resume in-flight transactions.

**Performance.** The prepare phase requires synchronous round-trips to every participant. Each participant holds locks during the entire protocol. In a system processing thousands of transactions per second, this lock contention kills throughput.

**Not designed for services.** 2PC assumes participants are databases that speak the XA protocol. Microservices are HTTP/gRPC endpoints with their own business logic. Fitting 2PC into a microservices architecture requires building a custom transaction manager, which is fragile and rarely worth the effort.

```
2PC Summary:

Guarantees:     Strong consistency (all-or-nothing)
Latency:        High (2 synchronous round-trips + lock hold time)
Availability:   Low (coordinator failure blocks everything)
Best for:       Cross-database writes, distributed SQL databases
Bad for:        Microservices, long-running operations, high throughput
```

---

## The Saga Pattern

Sagas are the standard approach for distributed transactions in microservices. Instead of one atomic transaction, you break the operation into a sequence of **local transactions**, each in its own service. If a step fails, you execute **compensating transactions** to undo the previous steps.

### How It Works

Take the checkout example:

```
Forward transactions (happy path):

Step 1: Payment Service   -> charge $49.99         (local transaction)
Step 2: Inventory Service -> reserve 1 unit         (local transaction)
Step 3: Shipping Service  -> create shipping label  (local transaction)
```

Each step commits independently in its own database. There's no global lock. But what if Step 3 fails?

```
Compensating transactions (rollback):

Step 3 failed, so:
  Compensate Step 2: Inventory Service -> release reserved unit
  Compensate Step 1: Payment Service   -> refund $49.99
```

The compensating transactions run in reverse order. Each one undoes the effect of a previous step. The system eventually returns to a consistent state.

### Compensating Transactions Are Not "Undo"

This is a subtle but important distinction. A compensating transaction doesn't delete or reverse the original operation. It creates a new operation that logically cancels the effect.

```
Original:      charge $49.99 to credit card
Compensation:  issue $49.99 refund to credit card

NOT:           delete the charge record (the charge happened, it's on the statement)
```

```
Original:      reserve 1 unit of inventory
Compensation:  release 1 unit of inventory

NOT:           pretend the reservation never happened (audit logs should show it did)
```

```
Original:      create order record with status "confirmed"
Compensation:  update order status to "cancelled"

NOT:           DELETE FROM orders WHERE id = 123 (you want the history)
```

Compensating transactions are new forward actions. They preserve the audit trail and work even when the original operation had real-world side effects (like charging a credit card).

### The Complete Saga Flow

Here's what the full checkout saga looks like, including the failure case:

```
Saga: Place Order

T1: Payment Service -> charge($49.99)
    Success -> proceed to T2
    Failure -> saga aborted (nothing to compensate)

T2: Inventory Service -> reserve(item_id, qty=1)
    Success -> proceed to T3
    Failure -> run C1

T3: Shipping Service -> createLabel(order_id)
    Success -> saga complete
    Failure -> run C2, then C1

Compensating transactions:
C2: Inventory Service -> release(item_id, qty=1)
C1: Payment Service   -> refund($49.99)
```

Each step either succeeds and the saga continues, or fails and triggers compensation for all previously completed steps.

---

## Choreography vs Orchestration

There are two ways to coordinate a saga. This is an important distinction that interviewers often ask about.

### Choreography: Event-Driven

Each service listens for events and decides what to do next. There's no central coordinator. Services communicate through a [message queue](/learn/message-queues) (typically Kafka).

```
Choreography Flow:

Payment Service
  charges $49.99
  publishes: PaymentCompleted { orderId, amount }
       |
       v
Inventory Service (listens for PaymentCompleted)
  reserves item
  publishes: InventoryReserved { orderId, itemId }
       |
       v
Shipping Service (listens for InventoryReserved)
  creates label
  publishes: ShippingLabelCreated { orderId, trackingId }


Failure flow:

Shipping Service
  fails to create label
  publishes: ShippingFailed { orderId, reason }
       |
       v
Inventory Service (listens for ShippingFailed)
  releases reservation
  publishes: InventoryReleased { orderId }
       |
       v
Payment Service (listens for InventoryReleased)
  issues refund
  publishes: PaymentRefunded { orderId }
```

**Pros:**

- No single point of failure (no coordinator to crash)
- Services are fully decoupled
- Easy to add new steps (just subscribe to the relevant events)

**Cons:**

- Hard to understand the full flow (logic is scattered across services)
- Difficult to debug (you're tracing events across multiple services and queues)
- Cyclic dependencies can emerge if you're not careful
- No single place to see "what step is this saga on?"

### Orchestration: Central Coordinator

A dedicated **saga orchestrator** tells each service what to do and when. The orchestrator knows the full sequence and manages the state machine.

```
Orchestration Flow:

Order Orchestrator
  |
  |--- charge($49.99) ---------> Payment Service
  |<-- success ------------------|
  |
  |--- reserve(item) ----------> Inventory Service
  |<-- success ------------------|
  |
  |--- createLabel(order) -----> Shipping Service
  |<-- failure ------------------|
  |
  |--- release(item) ----------> Inventory Service  (compensate)
  |<-- success ------------------|
  |
  |--- refund($49.99) ---------> Payment Service    (compensate)
  |<-- success ------------------|
  |
  saga failed, order cancelled
```

The orchestrator maintains a state machine:

```
Saga States:

PAYMENT_PENDING -> PAYMENT_COMPLETED
  -> INVENTORY_PENDING -> INVENTORY_RESERVED
    -> SHIPPING_PENDING -> SHIPPING_CREATED (done!)
                        -> SHIPPING_FAILED
                          -> COMPENSATING_INVENTORY
                            -> COMPENSATING_PAYMENT
                              -> SAGA_FAILED
```

**Pros:**

- Easy to understand (entire flow in one place)
- Easy to debug (orchestrator logs every step and transition)
- Easy to add timeout handling and retry logic
- Clear visibility into saga state

**Cons:**

- Orchestrator is a potential single point of failure (mitigate with redundancy)
- Risk of the orchestrator becoming a "god service" with too much logic
- More coupling (orchestrator knows about all participants)

### When to Use Which

| Aspect         | Choreography              | Orchestration              |
| -------------- | ------------------------- | -------------------------- |
| **Complexity** | 2-3 steps                 | 4+ steps                   |
| **Visibility** | Hard to trace             | Easy (central state)       |
| **Coupling**   | Low (events)              | Moderate (orchestrator)    |
| **Debugging**  | Distributed traces needed | Check orchestrator logs    |
| **Best for**   | Simple, decoupled flows   | Complex business workflows |

**Rule of thumb:** Use choreography for simple sagas (2-3 steps) between well-established services. Use orchestration for anything complex, anything that needs clear visibility, or anything where the business logic for "what happens next" is non-trivial.

In an interview, orchestration is usually the safer pick because it's easier to explain, easier to reason about correctness, and easier to show you've thought about failure handling.

---

## 2PC vs Saga: When to Use Each

This is the comparison interviewers want to hear.

| Aspect           | 2PC                             | Saga                               |
| ---------------- | ------------------------------- | ---------------------------------- |
| **Consistency**  | Strong (atomic)                 | Eventual                           |
| **Isolation**    | Full (locks held)               | None (intermediate states visible) |
| **Blocking**     | Yes (participants wait)         | No (each step commits locally)     |
| **Performance**  | Lower (lock contention)         | Higher (no global locks)           |
| **Coordinator**  | Required, SPOF risk             | Optional (choreography has none)   |
| **Compensation** | Automatic rollback              | Manual compensating transactions   |
| **Complexity**   | Protocol is simple, ops is hard | Protocol is complex, ops is easier |
| **Scope**        | Databases (XA protocol)         | Any service                        |

**Use 2PC when:**

- You need strong consistency across databases (not services)
- The operations are short-lived (milliseconds, not minutes)
- You're working within a distributed database that supports it natively (Spanner, CockroachDB)
- Both participants speak the XA protocol

**Use Saga when:**

- You're coordinating across [microservices](/learn/microservices) with independent databases
- Operations might be long-running (waiting for external APIs, human approval)
- You need high availability and can tolerate eventual consistency
- You want each service to remain independently deployable and scalable

In practice, most microservices architectures use Sagas. 2PC is mainly used inside distributed databases, not between application-level services.

---

## Real-World Examples

### E-Commerce Checkout (Saga)

This is the classic example and the one most likely to come up in interviews.

```
Saga: Place Order (Orchestrated)

1. Order Service:     create order (status: PENDING)
2. Payment Service:   charge credit card
3. Inventory Service: reserve items
4. Shipping Service:  schedule shipment
5. Order Service:     update order (status: CONFIRMED)

If step 3 fails:
  C2: Payment Service -> refund charge
  C1: Order Service   -> update order (status: CANCELLED)
```

Key design decisions:

- **Orchestrator lives in the Order Service** because it owns the business workflow
- **Payment before inventory** because a failed payment is a clean abort (nothing to compensate yet), while a failed inventory reservation after payment requires a refund
- **Idempotency on every step** because the orchestrator might retry a step that actually succeeded but whose response was lost. Every service must handle duplicate calls safely. See [Idempotency & Deduplication](/learn/idempotency-deduplication) for implementation details.

### Cross-Database Writes (2PC)

When you need to write to two databases atomically -- not two services, but two databases within the same system.

```
Example: Transfer money between two bank accounts on different database shards

Coordinator (Transaction Manager)
  |
  |--- PREPARE: debit $100 from Account A -----> Shard 1
  |<-- VOTE YES --------------------------------|
  |
  |--- PREPARE: credit $100 to Account B ------> Shard 2
  |<-- VOTE YES --------------------------------|
  |
  |--- COMMIT ---------------------------------> Shard 1
  |--- COMMIT ---------------------------------> Shard 2
```

This works because both participants are databases that speak XA, the operations are fast (milliseconds), and the coordinator is a dedicated transaction manager, not an application service.

Distributed SQL databases like Google Spanner and CockroachDB implement 2PC internally. You write a regular SQL transaction, and the database handles the two-phase protocol across its shards. You get strong consistency without managing the protocol yourself.

### Order Fulfillment Pipeline (Choreography Saga)

For simpler workflows with loosely coupled services:

```
Order placed
  -> publishes: OrderCreated

Payment Service (listens: OrderCreated)
  -> charges card
  -> publishes: PaymentProcessed

Warehouse Service (listens: PaymentProcessed)
  -> picks and packs items
  -> publishes: ItemsShipped

Notification Service (listens: ItemsShipped)
  -> sends shipping confirmation email
```

Each service reacts to events independently. The [message queue](/learn/message-queues) guarantees at-least-once delivery. Each service is idempotent. If the warehouse fails to ship, it publishes a `ShipmentFailed` event, and the payment service listens for it and issues a refund.

---

## Handling Edge Cases

Sagas introduce complexity that you should be prepared to discuss in interviews.

### Intermediate States Are Visible

Unlike 2PC, a saga doesn't hold locks across services. This means other operations can see intermediate states.

```
Timeline:
  T1: Payment charged (committed)
  T2: Inventory reservation in progress...

  Meanwhile: User checks order status -> sees "Payment received, awaiting fulfillment"

  T3: Inventory fails -> compensation starts
  T4: Refund issued

  User refreshes: "Order cancelled, refund issued"
```

This is fine for most systems. The user sees a brief intermediate state, which you handle with clear status messaging. If you truly need isolation (no one sees partial state), you need 2PC or a different approach entirely.

### Compensating Transactions Can Fail Too

What if the refund call to the payment service fails? Now you've got a charged customer with no order and a failed compensation.

The solution: **retry compensating transactions with exponential backoff**. Compensating transactions must be [idempotent](/learn/idempotency-deduplication) so retries are safe. If retries are exhausted, the saga enters a FAILED state and alerts trigger for manual intervention.

```
Compensation retry strategy:

1. Attempt refund            -> timeout
2. Wait 1s, retry refund     -> timeout
3. Wait 2s, retry refund     -> timeout
4. Wait 4s, retry refund     -> success!

If all retries fail:
  -> move to COMPENSATION_FAILED state
  -> alert operations team
  -> manual resolution required
```

### Concurrent Sagas

Two users try to buy the last item at the same time. Both sagas charge payment, but only one can reserve inventory.

```
Saga A: charge $49.99 -> reserve item -> success
Saga B: charge $49.99 -> reserve item -> FAILURE (out of stock)
         -> compensate: refund $49.99
```

The inventory service handles this with normal database-level concurrency control (optimistic locking or SELECT FOR UPDATE). The saga pattern doesn't change how individual services manage their local data.

---

## Common Interview Mistakes

### Mistake 1: "We'll use distributed transactions across all microservices"

> "I'll use 2PC to ensure the payment, inventory, and shipping are all atomic."

**Problem:** 2PC is a database-level protocol. Your microservices communicate over HTTP/gRPC, not XA. Implementing 2PC across application services means building a custom transaction manager, handling participant timeouts, dealing with a coordinator SPOF, and holding locks across network boundaries. It's fragile, slow, and almost nobody does this in production.

**Better:** "Since these are independent microservices with their own databases, I'll use the saga pattern. Each service commits locally, and if a downstream step fails, we run compensating transactions. For example, if shipping fails, we release the inventory reservation and refund the payment."

### Mistake 2: "Compensating transactions just delete the previous record"

> "If inventory reservation fails, we just DELETE the payment record."

**Problem:** You can't un-charge a credit card by deleting a database row. The charge already happened in the real world. Deleting the record destroys audit history and doesn't actually reverse the side effect. This tells the interviewer you haven't thought about what "undo" means in a distributed system.

**Better:** "Compensating transactions are new forward actions that logically reverse the effect. Instead of deleting the payment record, we issue a refund. The original charge stays in the audit log, and the refund is a new transaction. The customer sees both on their statement."

### Mistake 3: Not addressing what happens when compensation fails

> "If step 3 fails, we roll back steps 2 and 1."

**Problem:** You said "roll back" as if it's automatic. But compensating transactions are network calls to other services. They can fail too. What if the refund API times out? What if the inventory service is down? The interviewer is waiting for you to address this.

**Better:** "Compensating transactions are retried with exponential backoff. Each compensation must be idempotent so retries are safe. If all retries are exhausted, the saga moves to a COMPENSATION_FAILED state. We alert the operations team, and the failed compensation is logged for manual resolution. In practice, this is rare, but the system needs to handle it gracefully."

### Mistake 4: Using choreography for complex multi-step workflows

> "Each service publishes events and the others react. No coordinator needed."

**Problem:** For a 6-step saga with 6 compensating transactions, choreography becomes a nightmare. The flow is scattered across 6 services. Debugging requires tracing events through Kafka topics. There's no single place to answer "what state is this order in?" The interviewer will push on how you track and debug this.

**Better:** "For a workflow this complex, I'd use an orchestrated saga. The order service acts as the orchestrator with an explicit state machine. It sends commands to each service in sequence and handles failures by running compensations in reverse order. The state machine makes it easy to see where any given order is in the process and to debug failures."

---

## Summary: What to Remember

- Distributed transactions arise when a single operation spans multiple services or databases, and you need to keep them consistent
- **Two-Phase Commit (2PC)** provides strong consistency: coordinator asks participants to prepare, then tells them all to commit or abort. Best for cross-database writes, not for microservices
- 2PC downsides: blocking protocol, coordinator is a single point of failure, holds locks during the prepare phase, poor performance under load
- **Saga pattern** breaks a distributed transaction into local transactions + compensating transactions. If step N fails, run compensations for steps N-1 through 1
- Compensating transactions are not "undo" -- they are new forward actions that logically reverse the effect (refund instead of deleting a charge)
- **Choreography** (event-driven) works for simple sagas with 2-3 steps. **Orchestration** (central coordinator) is better for complex workflows with 4+ steps
- Each step in a saga must be [idempotent](/learn/idempotency-deduplication) because the orchestrator or [message queue](/learn/message-queues) may retry
- Plan for compensation failures: retry with backoff, alert on exhausted retries, support manual resolution
- Use 2PC inside distributed databases (Spanner, CockroachDB). Use Sagas between microservices

**Interview golden rule:**

```
Don't say "we use transactions" when services have separate
databases. Explain whether you need strong consistency (2PC,
within a database) or eventual consistency (saga, across
services), describe the compensation strategy, and address
what happens when the compensation itself fails.
```
