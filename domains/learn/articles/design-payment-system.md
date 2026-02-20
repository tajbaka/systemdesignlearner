## Introduction

The interviewer says: "Design a payment system."

You think, "Just call the Stripe API." Then they follow up: "What happens if Stripe confirms the charge but your database write fails? How do you prevent a customer from being charged twice? How do you know your books are correct at the end of the day?"

And now you realize this isn't about calling an API. It's about [idempotency](/learn/idempotency-deduplication), data integrity, and financial correctness. A payment system combines double-entry bookkeeping, webhook-driven async flows, and careful [distributed transaction](/learn/distributed-transactions) handling into one of the most precision-demanding system design problems.

Here's how to design a payment system that's correct, resilient, and auditable.

---

## Functional Requirements

**1. Process payments**

- Merchants submit a charge request with an amount, currency, and customer payment method
- The system routes the charge to a Payment Service Provider (PSP) like Stripe or PayPal
- The system does NOT process cards directly -- PCI compliance is delegated to the PSP
- Each payment transitions through states: PENDING, PROCESSING, SUCCEEDED, FAILED
- The system returns a payment ID immediately; final status arrives asynchronously via webhook

**2. Handle refunds**

- Merchants can issue a full or partial refund against a completed payment
- Refunds are routed back through the PSP
- Each refund is tracked as a separate record linked to the original payment
- Refund status follows its own state machine: PENDING, SUCCEEDED, FAILED

**3. Reconciliation & ledger**

- Every payment and refund produces double-entry ledger records (debit and credit)
- The internal ledger must match PSP settlement reports at end-of-day
- Discrepancies are flagged for manual review
- The ledger is the source of truth for financial reporting

That's the core. A payment system answers: "Did the money move?", "Is our record correct?", and "Can we prove it?"

---

## Non-Functional Requirements

**Exactly-once semantics (idempotency)**

- A network timeout must never result in a double charge
- Every state-changing API call requires a client-supplied idempotency key
- The system deduplicates retries using the idempotency key before reaching the PSP
- See [Idempotency & Deduplication](/learn/idempotency-deduplication) for implementation patterns

**Data integrity (ACID)**

- Ledger writes and payment status updates must be atomic -- either both succeed or neither does
- A SQL database with transactions guarantees this. No eventual consistency for financial records
- Every ledger entry follows double-entry bookkeeping: total debits always equal total credits
- See [Databases & Caching](/learn/database-caching) for SQL vs NoSQL trade-offs

**Availability**

- The payment API must be highly available. Downtime means lost revenue
- Graceful degradation: if the PSP is down, queue the request and retry
- Use [message queues](/learn/message-queues) to buffer requests during PSP outages
- Horizontal scaling of stateless payment services behind a load balancer

---

## API Design

**Create a charge**

```
POST /api/v1/payments

Headers:
  Idempotency-Key: "order-abc-123-payment"

Request Body:
{
  "amount": 4999,
  "currency": "USD",
  "paymentMethod": "pm_card_visa_4242",
  "merchantId": "merchant-88f1",
  "metadata": {
    "orderId": "order-abc-123",
    "description": "Pro plan subscription"
  }
}

Response:
{
  "paymentId": "pay-7f3a",
  "status": "PENDING",
  "amount": 4999,
  "currency": "USD",
  "createdAt": "2026-03-01T14:00:01Z"
}

Status: 201 Created
```

The client must supply an `Idempotency-Key` header. If the same key is sent again, the system returns the original response without creating a new charge.

**Receive webhook**

```
POST /api/v1/webhooks/stripe

Headers:
  Stripe-Signature: "t=1234567890,v1=abc..."

Request Body:
{
  "id": "evt_1abc",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_3xyz",
      "amount": 4999,
      "currency": "usd",
      "status": "succeeded",
      "metadata": {
        "paymentId": "pay-7f3a"
      }
    }
  }
}

Response:
Status: 200 OK
```

The webhook endpoint verifies the PSP signature before processing. It must be idempotent -- Stripe may deliver the same event multiple times.

**Process refund**

```
POST /api/v1/payments/pay-7f3a/refund

Headers:
  Idempotency-Key: "refund-order-abc-123"

Request Body:
{
  "amount": 4999,
  "reason": "customer_request"
}

Response:
{
  "refundId": "ref-9b2c",
  "paymentId": "pay-7f3a",
  "amount": 4999,
  "status": "PENDING",
  "createdAt": "2026-03-02T10:30:00Z"
}

Status: 201 Created
```

**Key fields:**

- `paymentId`: Unique identifier for the payment
- `Idempotency-Key`: Client-generated key to prevent duplicate charges
- `amount`: Integer in smallest currency unit (cents for USD) to avoid floating-point errors
- `paymentMethod`: Tokenized reference to the customer's card (PSP-issued token, never raw card data)
- `status`: Current state of the payment (PENDING, PROCESSING, SUCCEEDED, FAILED)
- `metadata`: Arbitrary key-value pairs linking the payment to business entities (order ID, subscription ID)

---

## High Level Design

Here's the overall architecture:

![Payment System High-level Design](diagram:payment-system)

### Key Components

**1. Client**

- Submits payment and refund requests via the REST API
- Generates unique idempotency keys per operation (typically derived from the order ID)
- Receives synchronous acknowledgment (PENDING) and polls or subscribes for final status

**2. API Gateway**

- Routes requests to the Payment Service
- Handles authentication, TLS termination, and rate limiting
- Stateless entry point for all client traffic

**3. Payment Service**

- The core orchestrator. Validates requests, enforces idempotency, and coordinates the payment flow
- Checks the idempotency key against the database before creating a new payment
- Writes payment records and ledger entries within a single database transaction
- Sends charge requests to the PSP and updates status based on webhook callbacks
- Stateless and horizontally scalable as a [microservice](/learn/microservices)

**4. Ledger DB (SQL)**

- PostgreSQL database storing payments, refunds, and double-entry ledger records
- ACID transactions ensure that payment status and ledger entries are always consistent
- Every financial operation produces balanced debit/credit entries
- The ledger is append-only -- entries are never modified, only new correcting entries are added
- See [Databases & Caching](/learn/database-caching) for why SQL is the right choice for financial data

**5. PSP (Stripe/PayPal)**

- Handles actual card processing, fraud detection, and bank communication
- The system sends charge/refund requests and receives asynchronous results via webhooks
- Provides settlement reports for end-of-day reconciliation
- The PSP is a third-party dependency -- treat it as unreliable and design around its failures

**6. Reconciliation Job**

- A scheduled batch process that runs daily (or more frequently)
- Compares the internal ledger against PSP settlement reports
- Flags discrepancies: charges the PSP settled that the system doesn't have, or vice versa
- Produces a reconciliation report for the finance team
- See [Consistency Patterns](/learn/consistency-patterns) for reconciliation strategies

### Why This Architecture

**Why double-entry bookkeeping?**

Single-entry tracking ("payment X was $49.99") tells you what happened but not where the money went. Double-entry bookkeeping records every transaction as a debit in one account and a credit in another. If your debits don't equal your credits, something is wrong -- and you'll know immediately. This is how every real financial system works, from banks to Stripe itself. See [Double-Entry Bookkeeping](/learn/double-entry) for details.

**Why a SQL database for the ledger?**

Financial data demands ACID guarantees. When a payment succeeds, you need the payment status update AND the ledger entries to commit atomically. If one fails without the other, your books are wrong. NoSQL databases optimize for availability and scale, but they sacrifice the transactional guarantees that financial systems require. See [Databases & Caching](/learn/database-caching) for a deeper comparison.

**Why webhooks from the PSP?**

Card payments are not instant. When you send a charge request to Stripe, it enters a processing pipeline: fraud checks, bank authorization, and settlement. This can take seconds to days. Rather than holding a connection open, the PSP sends a webhook when the status changes. This is the standard async pattern for third-party integrations. The system must handle webhook retries and out-of-order delivery gracefully.

---

## Detailed Design

### Database Schema

```
Table: payments
  id                UUID PRIMARY KEY
  idempotency_key   VARCHAR UNIQUE NOT NULL
  merchant_id       UUID NOT NULL
  amount            BIGINT NOT NULL           -- cents (smallest currency unit)
  currency          VARCHAR(3) NOT NULL       -- ISO 4217 (USD, EUR)
  payment_method    VARCHAR NOT NULL          -- PSP token (pm_card_visa_...)
  status            VARCHAR NOT NULL          -- PENDING, PROCESSING, SUCCEEDED, FAILED
  psp_reference     VARCHAR                   -- PSP's ID for this charge (pi_3xyz)
  metadata          JSONB
  created_at        TIMESTAMP NOT NULL
  updated_at        TIMESTAMP NOT NULL

Index: idx_payments_idempotency ON payments(idempotency_key)
Index: idx_payments_merchant ON payments(merchant_id, created_at DESC)

Table: ledger_entries
  id                UUID PRIMARY KEY
  payment_id        UUID REFERENCES payments(id)
  account           VARCHAR NOT NULL          -- 'merchant_receivable', 'cash', 'revenue', etc.
  entry_type        VARCHAR NOT NULL          -- 'DEBIT' or 'CREDIT'
  amount            BIGINT NOT NULL
  currency          VARCHAR(3) NOT NULL
  created_at        TIMESTAMP NOT NULL

Index: idx_ledger_payment ON ledger_entries(payment_id)
Index: idx_ledger_account ON ledger_entries(account, created_at DESC)

Constraint: For every payment_id, SUM(DEBIT) = SUM(CREDIT)

Table: refunds
  id                UUID PRIMARY KEY
  payment_id        UUID REFERENCES payments(id)
  idempotency_key   VARCHAR UNIQUE NOT NULL
  amount            BIGINT NOT NULL
  reason            VARCHAR
  status            VARCHAR NOT NULL          -- PENDING, SUCCEEDED, FAILED
  psp_reference     VARCHAR
  created_at        TIMESTAMP NOT NULL
  updated_at        TIMESTAMP NOT NULL

Index: idx_refunds_payment ON refunds(payment_id)
Index: idx_refunds_idempotency ON refunds(idempotency_key)
```

The `UNIQUE` constraint on `idempotency_key` is the last line of defense against double charges. Even if application-level deduplication fails, the database will reject a duplicate insert.

### Payment Flow

```
1. Client sends POST /api/v1/payments with Idempotency-Key header
2. Payment Service checks idempotency_key in DB:
   - If exists: return existing payment record (no new charge)
   - If not: continue to step 3
3. BEGIN TRANSACTION
   a. INSERT into payments (status = 'PENDING')
   b. INSERT ledger_entries:
      DEBIT  merchant_receivable  $49.99
      CREDIT pending_revenue      $49.99
   c. COMMIT
4. Send charge request to PSP (Stripe):
   stripe.paymentIntents.create({
     amount: 4999,
     currency: 'usd',
     payment_method: 'pm_card_visa_4242',
     metadata: { paymentId: 'pay-7f3a' }
   })
5. UPDATE payments SET status = 'PROCESSING', psp_reference = 'pi_3xyz'
6. Return { paymentId: 'pay-7f3a', status: 'PENDING' } to client
7. (Async) PSP sends webhook when charge completes -- see Webhook Processing
```

**Why write to the DB before calling the PSP?** If the PSP call succeeds but the DB write fails, you've charged the customer with no record of it. By writing first, the worst case is a PENDING record with no PSP charge -- which the reconciliation job will catch and clean up.

### Webhook Processing

```
1. PSP sends POST /api/v1/webhooks/stripe with event payload
2. Verify webhook signature using PSP's signing secret:
   - If invalid: return 401 (prevents spoofed webhooks)
3. Extract paymentId from event metadata
4. Check if this event was already processed (idempotent check on event ID):
   - If already processed: return 200 OK (safe retry)
5. BEGIN TRANSACTION
   a. UPDATE payments SET status = 'SUCCEEDED' WHERE id = paymentId AND status = 'PROCESSING'
      (Status check prevents out-of-order webhooks from reverting a terminal state)
   b. INSERT ledger_entries:
      DEBIT  pending_revenue  $49.99
      CREDIT settled_revenue  $49.99
   c. Record webhook event ID as processed
   d. COMMIT
6. Return 200 OK to PSP
7. If transaction fails: return 500, PSP will retry the webhook
```

**Why record the webhook event ID?** Stripe retries webhooks for up to 3 days if it doesn't receive a 200. Without deduplication on the event ID, a retry after a slow 200 response could process the same event twice.

### Refund Flow

```
1. Client sends POST /api/v1/payments/{id}/refund with Idempotency-Key
2. Payment Service validates:
   - Payment exists and status = 'SUCCEEDED'
   - Refund amount <= remaining refundable amount (original - previous refunds)
   - Idempotency key not already used
3. BEGIN TRANSACTION
   a. INSERT into refunds (status = 'PENDING')
   b. INSERT ledger_entries:
      DEBIT  settled_revenue        $49.99
      CREDIT merchant_payable       $49.99
   c. COMMIT
4. Send refund request to PSP:
   stripe.refunds.create({
     payment_intent: 'pi_3xyz',
     amount: 4999
   })
5. UPDATE refunds SET status = 'PROCESSING', psp_reference = 're_abc'
6. (Async) PSP sends webhook when refund completes
7. On webhook: UPDATE refunds SET status = 'SUCCEEDED'
   INSERT ledger_entries:
     DEBIT  merchant_payable  $49.99
     CREDIT cash              $49.99
```

The refund flow mirrors the payment flow: write locally first, then call the PSP, then finalize on webhook. This ensures the ledger is never in an inconsistent state.

### Reconciliation Process

```
1. Reconciliation job runs daily (scheduled via cron or a job scheduler)
2. Fetch PSP settlement report for the previous day:
   - List of all charges and refunds the PSP settled
   - Each entry includes PSP reference, amount, currency, and status
3. Fetch internal ledger entries for the same period:
   SELECT * FROM payments WHERE updated_at BETWEEN :start AND :end
4. Match records by psp_reference:
   a. PSP settled, internal SUCCEEDED: match (no action)
   b. PSP settled, internal PENDING/PROCESSING: flag as "settled but not confirmed"
      (Likely a missed webhook -- re-fetch status from PSP API)
   c. Internal SUCCEEDED, not in PSP settlement: flag as "confirmed but not settled"
      (May settle in next batch, or PSP dispute)
   d. Amount mismatch: flag for manual review
5. Generate reconciliation report with:
   - Total matched amount
   - Number of discrepancies by category
   - List of flagged transactions for manual review
6. For auto-fixable cases (missed webhooks):
   - Re-fetch payment status from PSP
   - Update internal records accordingly
   - Add correcting ledger entries if needed
```

The reconciliation job is the safety net. No matter what goes wrong with webhooks, network failures, or bugs, the daily reconciliation catches discrepancies before they compound. See [Consistency Patterns](/learn/consistency-patterns) for more on eventual consistency and reconciliation.

### Scaling the Payment System

The payment service is stateless -- scale it horizontally behind a load balancer. The database is the bottleneck.

**Read/write separation.** Most payment lookups are reads (status checks, history). Use read replicas for queries and route all writes to the primary. The ledger is append-only, so write contention is low.

**Partitioning by merchant.** At very high scale, shard the payments and ledger tables by `merchant_id`. Each merchant's data stays on one shard, avoiding cross-shard transactions. This works because payments rarely need cross-merchant queries.

**Async processing with queues.** Instead of calling the PSP synchronously in the request path, publish a message to a [message queue](/learn/message-queues) and let a worker handle the PSP call. This decouples the API response time from PSP latency and provides natural retry handling.

**PSP failover.** Support multiple PSPs. If Stripe is down, route charges to PayPal (or a backup provider). This requires abstracting the PSP interface behind a common adapter layer. The [saga pattern](/learn/distributed-transactions) helps coordinate multi-step payment flows that may need compensating actions across providers.

---

## Common Interview Mistakes

### Mistake 1: Building card processing instead of using a PSP

"I'll store the credit card number in an encrypted column and send it to the bank."

**Problem:** You've just taken on PCI DSS Level 1 compliance -- annual audits, quarterly network scans, and massive liability. No startup does this. Even large companies use PSPs to avoid handling raw card data.

**Better:** Delegate card processing to a PSP like Stripe or PayPal. Your system stores tokenized payment method references (like `pm_card_visa_4242`), never raw card numbers. This is both the industry standard and what the interviewer expects.

### Mistake 2: Ignoring idempotency

"The client sends a payment request and we charge the card."

**Problem:** What happens when the network times out? The client retries. Now the customer is charged twice. This is the single most common bug in payment systems and the most expensive.

**Better:** Require an `Idempotency-Key` on every state-changing request. Before processing, check if that key already exists. If it does, return the existing result. Enforce this at both the application layer and the database layer (unique constraint). See [Idempotency & Deduplication](/learn/idempotency-deduplication).

### Mistake 3: No double-entry bookkeeping

"I'll just store the payment amount and status in one table."

**Problem:** Single-entry tracking can't answer "where is the money?" If a refund partially completes, or a PSP settles a different amount than expected, you have no way to detect the inconsistency until a customer complains.

**Better:** Use double-entry bookkeeping. Every payment creates a DEBIT in one account and a CREDIT in another. At any point, total debits must equal total credits. If they don't, you have a bug -- and you'll find it immediately, not months later during an audit.

### Mistake 4: Treating PSP calls as synchronous

"The API calls Stripe, waits for the response, and returns success to the client."

**Problem:** PSP calls can take seconds. If Stripe is slow or down, your API hangs. The client times out, retries, and now you have duplicate in-flight charges. Your API availability is now coupled to Stripe's availability.

**Better:** Return PENDING immediately after writing to the database. Process the PSP call asynchronously (directly or via a [message queue](/learn/message-queues)). Notify the client of the final status through webhooks or polling. This decouples your availability from the PSP's.

### Mistake 5: No reconciliation process

"The webhooks handle everything. If Stripe says it's paid, it's paid."

**Problem:** Webhooks can be lost, delayed, or delivered out of order. Your server might crash after charging but before recording the webhook. Over time, your internal records will drift from reality. You won't know until customers complain or accountants find holes in the books.

**Better:** Run a daily reconciliation job that compares your internal ledger against the PSP's settlement report. Flag and investigate every discrepancy. Reconciliation is the financial safety net that catches everything webhooks miss. See [Consistency Patterns](/learn/consistency-patterns) for reconciliation strategies.

---

**Interview golden rule:**

Don't just say "call the Stripe API." Explain the three guarantees your system provides: idempotency keys prevent double charges, double-entry bookkeeping ensures every dollar is accounted for, and daily reconciliation catches anything that slips through the cracks. Then walk through what happens when the PSP call fails, the webhook is lost, or the database write crashes mid-transaction.
