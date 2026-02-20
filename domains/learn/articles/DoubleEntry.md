## Introduction

You're designing a payment system for an e-commerce marketplace. You explain that when a user pays for an order, you update their balance in the database. The interviewer nods.

Then they ask: "A user pays $100 for an order. Your server debits the user's balance, but crashes before crediting the merchant. Now the $100 is gone. Where did it go? How do you detect this? How do you prevent it?"

And now you realize that updating balances one at a time is a recipe for lost money, undetectable errors, and audit nightmares. Every serious financial system, from banks to Stripe to marketplace payouts, uses **double-entry bookkeeping** to make sure every dollar is accounted for.

Here's how it works, how to implement it in software, and how to talk about it in interviews.

---

## What Is Double-Entry Bookkeeping?

Double-entry bookkeeping is a 700-year-old accounting principle, and it's the foundation of every modern financial system. The rule is simple:

**Every transaction creates exactly two entries: a debit and a credit, for the same amount.**

Money never appears from thin air and never disappears. If $100 leaves one account, $100 must arrive in another. The system is always balanced.

```
Transaction: User pays $100 for an order

Entry 1 (Debit):   User-Balance     -$100
Entry 2 (Credit):  Merchant-Balance +$100

Net effect on the system: $0  (money moved, not created or destroyed)
```

This is different from single-entry bookkeeping, where you just record "User paid $100." Single-entry tells you _what happened_. Double-entry tells you _where the money went_. That distinction matters enormously when something goes wrong and you need to trace every dollar through the system.

---

## Why It Matters in Payment Systems

In a simple app, you might store a `balance` column on the user table and increment or decrement it directly. That works until it doesn't.

### The Problem with Single-Entry

```
-- Single-entry approach: just update balances
UPDATE users SET balance = balance - 100 WHERE id = 'user-123';
UPDATE merchants SET balance = balance + 100 WHERE id = 'merchant-456';
```

What can go wrong:

1. **Crash between updates.** The first UPDATE succeeds, the second fails. $100 vanishes from the system. Nobody notices until a merchant complains weeks later.
2. **No audit trail.** You know the user's current balance is $400, but how did it get there? Which transactions contributed? You'd have to reconstruct history from scattered logs.
3. **Error detection is manual.** If a bug causes a $100 credit to be recorded as $1,000, there's no built-in mechanism to catch it. You only find out when the numbers don't add up at the end of the month.

### What Double-Entry Gives You

- **Self-balancing.** The sum of all debits must always equal the sum of all credits. If they don't, you have a bug, and you know immediately.
- **Full audit trail.** Every movement of money is recorded as two entries. You can trace any balance to the exact transactions that produced it.
- **Error detection.** Reconciliation is built into the data model. Run `SUM(debits) - SUM(credits)` and if it's not zero, something is wrong.
- **Immutability.** You never update or delete ledger entries. Corrections are made by adding new entries. This makes the system auditable and compliant with financial regulations.

---

## The Fundamental Equation

All of double-entry bookkeeping rests on one equation:

```
Assets = Liabilities + Equity
```

In a software system, think of it this way:

- **Assets:** What the system holds (user balances, escrow accounts, cash in bank)
- **Liabilities:** What the system owes (merchant payouts pending, refunds owed)
- **Equity:** The system's own revenue (fees collected, commissions earned)

Every transaction must keep this equation balanced. If you debit an asset account, you must credit another asset account, or credit a liability or equity account, by the same amount.

For interview purposes, the most important takeaway is: **debits and credits always sum to zero across a transaction.** If they don't, the transaction is invalid.

---

## The Double-Entry Pattern in Software

Here's how you actually implement this. Instead of updating balance columns directly, you write to an append-only **ledger table** where every transaction produces two rows.

### Schema

```sql
CREATE TABLE ledger_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL,          -- groups the two entries together
    account_id      VARCHAR NOT NULL,       -- which account is affected
    entry_type      VARCHAR NOT NULL,       -- 'DEBIT' or 'CREDIT'
    amount          BIGINT NOT NULL,        -- amount in cents (never use floats for money)
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE accounts (
    id              VARCHAR PRIMARY KEY,    -- e.g., 'user-123-balance'
    account_type    VARCHAR NOT NULL,       -- 'USER', 'MERCHANT', 'ESCROW', 'REVENUE'
    created_at      TIMESTAMP DEFAULT NOW()
);
```

A few important design decisions here:

- **Store amounts in cents as integers.** Floating-point arithmetic causes rounding errors. $100.00 is stored as `10000`. This is standard practice in every payment system.
- **Use a `transaction_id` to group entries.** Every transaction has exactly two rows with the same `transaction_id`. This makes it trivial to verify that each transaction balances.
- **No `balance` column.** The current balance of any account is computed by summing its ledger entries. This is slower but guarantees correctness. You can add a materialized balance for performance later.

### Computing a Balance

```sql
SELECT
    SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) -
    SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END)
    AS balance
FROM ledger_entries
WHERE account_id = 'user-123-balance';
```

This is the source of truth. Every dollar in the balance maps to a specific ledger entry, which maps to a specific transaction. Full traceability.

---

## Example: User Pays for an Order

A user pays $100 for an order on a marketplace. The marketplace takes a 10% fee.

### Step 1: User Payment

```
Transaction ID: txn-001

| Entry | Account          | Type   | Amount (cents) |
|-------|------------------|--------|----------------|
| 1     | user-123-balance | DEBIT  | 10000          |
| 2     | escrow-order-789 | CREDIT | 10000          |
```

Money moves from the user's balance into an escrow account. The marketplace holds it until the order is fulfilled.

### Step 2: Order Fulfilled, Merchant Payout

```
Transaction ID: txn-002

| Entry | Account              | Type   | Amount (cents) |
|-------|----------------------|--------|----------------|
| 1     | escrow-order-789     | DEBIT  | 10000          |
| 2     | merchant-456-balance | CREDIT | 9000           |

Transaction ID: txn-003

| Entry | Account              | Type   | Amount (cents) |
|-------|----------------------|--------|----------------|
| 1     | escrow-order-789     | DEBIT  | 0              |
| 2     | platform-revenue     | CREDIT | 1000           |
```

Wait, that doesn't balance. Let me fix that. When the marketplace takes a fee, the escrow splits into two transactions:

```
Transaction ID: txn-002

| Entry | Account              | Type   | Amount (cents) |
|-------|----------------------|--------|----------------|
| 1     | escrow-order-789     | DEBIT  | 10000          |
| 2     | merchant-456-balance | CREDIT | 9000           |
| 3     | platform-revenue     | CREDIT | 1000           |
```

The escrow is debited $100. The merchant receives $90 and the platform keeps $10. Total debits ($100) equal total credits ($90 + $10 = $100). Balanced.

Note: This transaction has three entries, not two. That's fine. The rule is that debits equal credits within a transaction, not that every transaction has exactly two rows. Two is the minimum.

---

## Example: Handling Refunds

A user requests a refund for the $100 order. Here's the critical rule: **you never delete or update existing ledger entries.** You create new entries that reverse the original.

```
Transaction ID: txn-004 (refund)

| Entry | Account              | Type   | Amount (cents) |
|-------|----------------------|--------|----------------|
| 1     | merchant-456-balance | DEBIT  | 9000           |
| 2     | platform-revenue     | DEBIT  | 1000           |
| 3     | user-123-balance     | CREDIT | 10000          |
```

The merchant's balance is debited $90, the platform gives back its $10 fee, and the user's balance is credited $100. The refund is a mirror image of the original payout.

After this refund, if you sum up all ledger entries for `user-123-balance`:

```
txn-001: DEBIT  10000  (payment)
txn-004: CREDIT 10000  (refund)
Balance: 0  (back to where they started)
```

The full history is preserved. An auditor can see exactly what happened: the user paid, the order was fulfilled, money was distributed, and then everything was reversed. No data was lost or overwritten.

---

## Ledger Immutability

This is one of the most important principles and one of the easiest to explain in an interview.

**The ledger is append-only. You never UPDATE or DELETE a row.**

```
-- NEVER do this
UPDATE ledger_entries SET amount = 9000 WHERE id = 'entry-123';
DELETE FROM ledger_entries WHERE transaction_id = 'txn-001';

-- ALWAYS do this instead
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount)
VALUES ('txn-004', 'user-123-balance', 'CREDIT', 10000);  -- reversal entry
```

Why?

1. **Auditability.** Financial regulators require a complete, unmodified history of every transaction. If you delete or modify entries, you can't prove what happened.
2. **Debugging.** When money goes missing, you need the full history to trace it. If entries are mutable, you can't distinguish between "the original transaction was wrong" and "someone modified the record after the fact."
3. **Concurrency safety.** Append-only writes are simpler and safer than updates. No need to worry about lost updates or read-modify-write races on balance fields.

If a mistake is made (an incorrect charge, a duplicate transaction), the correction is always a new entry that reverses the error. The mistake and the correction are both visible in the ledger.

---

## Reconciliation

Reconciliation is the process of verifying that your ledger is internally consistent. It's the double-entry system's built-in error detection mechanism.

### Internal Reconciliation

The simplest check: **total debits must equal total credits across the entire system.**

```sql
SELECT
    SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) AS total_debits,
    SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) AS total_credits
FROM ledger_entries;

-- If total_debits != total_credits, something is broken
```

You can also verify individual transactions:

```sql
SELECT
    transaction_id,
    SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) AS debits,
    SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) AS credits
FROM ledger_entries
GROUP BY transaction_id
HAVING SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) !=
       SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END);

-- This query returns transactions that don't balance (should return 0 rows)
```

### External Reconciliation

Your internal ledger should match external systems. At the end of each day, compare:

- Your ledger's total payouts vs. your bank's outgoing transfers
- Your ledger's total charges vs. Stripe's settlement reports
- Your ledger's escrow balance vs. the actual funds held

Discrepancies mean something went wrong: a failed webhook, a race condition, a bug in your code. Catching them early (daily or hourly reconciliation) is far better than discovering a $50,000 discrepancy at the end of the quarter.

---

## Writing Entries Safely

The core operation of a double-entry system is writing both entries atomically. If one entry is written without the other, the ledger is out of balance. This is where database transactions are essential.

```sql
BEGIN;

INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount)
VALUES ('txn-001', 'user-123-balance', 'DEBIT', 10000);

INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount)
VALUES ('txn-001', 'merchant-456-balance', 'CREDIT', 10000);

-- Optional: validate the transaction balances before committing
-- (application-level check or database constraint)

COMMIT;
```

If the server crashes between the two INSERTs, the entire transaction rolls back. Both entries are written or neither is. This eliminates the "money disappears" problem from single-entry systems.

For extra safety, you can add a database constraint that validates balance on every transaction:

```sql
-- Application-level validation before COMMIT
SELECT
    SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) -
    SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END)
FROM ledger_entries
WHERE transaction_id = 'txn-001';

-- If this is not 0, ROLLBACK
```

In distributed systems where the debit and credit touch different databases (e.g., different microservices own different accounts), you'll need to use sagas or two-phase commits to maintain consistency. But within a single database, a standard transaction is sufficient.

Combining this with [Idempotency & Deduplication](/learn/idempotency-deduplication) ensures that retries don't create duplicate ledger entries. Use the `transaction_id` as an idempotency key with a unique constraint, so the same payment can never be recorded twice.

---

## Performance Considerations

Computing balances by summing all ledger entries works perfectly at small scale, but gets slow as the ledger grows. Here are the standard solutions.

### Materialized Balances

Maintain a `balance` column on the accounts table, updated in the same database transaction as the ledger entries.

```sql
BEGIN;

-- Write ledger entries (source of truth)
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount)
VALUES ('txn-001', 'user-123-balance', 'DEBIT', 10000);

INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount)
VALUES ('txn-001', 'merchant-456-balance', 'CREDIT', 10000);

-- Update materialized balances (denormalized for read speed)
UPDATE accounts SET balance = balance - 10000 WHERE id = 'user-123-balance';
UPDATE accounts SET balance = balance + 10000 WHERE id = 'merchant-456-balance';

COMMIT;
```

The ledger entries remain the source of truth. The `balance` column is a performance optimization. If there's ever a discrepancy, you recompute balances from the ledger.

### Periodic Snapshots

Instead of summing from the beginning of time, take periodic snapshots of account balances and only sum entries since the last snapshot.

```sql
-- Balance = last snapshot + entries since snapshot
SELECT s.balance + COALESCE(SUM(
    CASE WHEN e.entry_type = 'CREDIT' THEN e.amount
         WHEN e.entry_type = 'DEBIT' THEN -e.amount
    END
), 0) AS current_balance
FROM balance_snapshots s
LEFT JOIN ledger_entries e
    ON e.account_id = s.account_id
    AND e.created_at > s.snapshot_at
WHERE s.account_id = 'user-123-balance'
ORDER BY s.snapshot_at DESC
LIMIT 1;
```

This keeps queries fast even with millions of ledger entries. For more on database performance optimization, see [Databases & Caching](/learn/database-caching).

---

## When to Use Double-Entry (and When Not To)

### Use Double-Entry When:

- **Payment systems.** Any system that moves real money between accounts. Stripe, PayPal, and every bank in the world use double-entry internally.
- **Marketplace payouts.** Platforms like Uber, Airbnb, or Etsy that hold money in escrow and distribute it to sellers.
- **E-commerce platforms.** Order payments, refunds, partial refunds, credits, gift cards -- all of these are financial movements that need traceability.
- **Wallet systems.** Any system where users have a stored balance (gaming credits, loyalty points, prepaid accounts).
- **Compliance-heavy industries.** Healthcare payments, insurance claims, lending -- anywhere regulators will audit your records.

### Don't Use Double-Entry When:

- **Simple apps with no financial component.** A blog platform or a chat app doesn't need a ledger.
- **One-way charges with no refunds or splits.** If you just charge a credit card via Stripe and never handle refunds, payouts, or internal balances, Stripe's own ledger handles the bookkeeping.
- **Prototypes and MVPs.** The overhead of a ledger system isn't worth it when you're validating product-market fit. You can add it later.

**Rule of thumb:** If money moves _between_ accounts in your system (not just in and out via a payment processor), you need double-entry.

---

## Common Interview Mistakes

### Mistake 1: Updating balances directly without a ledger

> "I'll just have a `balance` column on the users table and increment or decrement it."

**Problem:** You have no audit trail. If a balance is wrong, you can't trace which transaction caused the error. You also have no way to detect bugs that create or destroy money. This approach fails every financial audit and makes debugging production issues nearly impossible.

**Better:** "Every movement of money is recorded as two ledger entries -- a debit and a credit. The current balance is derived from the ledger. This gives us a full audit trail and built-in error detection through reconciliation."

### Mistake 2: Deleting or updating ledger entries for corrections

> "If there's a mistake, I'll update the entry to fix the amount."

**Problem:** Modifying historical records destroys auditability. You can no longer prove what actually happened. Financial regulators require immutable records, and mutating the ledger makes it impossible to distinguish legitimate corrections from fraud.

**Better:** "The ledger is append-only. To correct an error, we create a reversal entry that cancels out the original, then create a new entry with the correct amount. Both the mistake and the correction are visible in the history."

### Mistake 3: Not wrapping both entries in a database transaction

> "I'll insert the debit entry, then insert the credit entry."

**Problem:** If the server crashes between the two inserts, you have a debit without a matching credit. Money has vanished from the system. The ledger is out of balance, and detecting which transaction caused the imbalance requires manual investigation.

**Better:** "Both entries are written inside a single database transaction. Either both succeed or neither does. This guarantees the ledger stays balanced even if the server crashes mid-operation."

### Mistake 4: Using floating-point numbers for money

> "I'll store the amount as a DECIMAL or FLOAT -- $100.50."

**Problem:** Floating-point arithmetic introduces rounding errors. `0.1 + 0.2 = 0.30000000000000004` in most languages. Over millions of transactions, these errors compound. Your reconciliation will never balance perfectly, and you'll spend days hunting phantom discrepancies.

**Better:** "All monetary amounts are stored as integers in the smallest currency unit -- cents for USD. $100.50 is stored as `10050`. Arithmetic on integers is exact. No rounding, no surprises."

---

## Summary: What to Remember

- **Double-entry bookkeeping** means every financial transaction creates at least two entries: a debit and a credit that sum to zero
- The **fundamental equation** is Assets = Liabilities + Equity, and every transaction must keep it balanced
- **Never update or delete** ledger entries. The ledger is append-only. Corrections are new reversal entries
- **Refunds are reverse entries**, not deletions. Debit the merchant, credit the user. The full history is preserved
- **Reconciliation** is built-in error detection: sum all debits, sum all credits, and they must be equal
- **Wrap both entries in a database transaction** to guarantee atomicity. Partial writes break the ledger
- **Store money as integers in cents.** Never use floats. $100.00 = `10000` cents
- Use **materialized balances** for read performance, but derive them from the ledger as the source of truth
- Combine with [Idempotency & Deduplication](/learn/idempotency-deduplication) to prevent duplicate transactions from retries

**Interview golden rule:**

```
Don't just say "I'll update the user's balance." Show that
every movement of money creates two ledger entries, explain
why the ledger is append-only, and mention reconciliation
as your built-in safety net.
```
