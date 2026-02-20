import { buildLinks } from "./article-links";

export const PAYMENT_SYSTEM_PROBLEM = {
  slug: "payment-system",
  category: "backend" as const,
  version: {
    versionNumber: 1,
    title: "Design a Payment System",
    description:
      "Design a robust and auditable payment system capable of handling money movement, refunds, and reconciliation with zero tolerance for data loss.",
    difficulty: "hard" as const,
    timeToComplete: "60 min",
    topic: "System Design",
    links: buildLinks([
      "double-entry",
      "idempotency-deduplication",
      "distributed-transactions",
      "system-design-structure",
    ]),
    isCurrent: true,
  },
  steps: [
    {
      stepType: "functional" as const,
      order: 0,
      title: "Functional Requirements",
      description: "Define the core capabilities of the Payment System",
      required: true,
      data: {
        scoreWeight: 30,
        requirements: [
          {
            id: "process-payment",
            label: "Process Payments",
            description:
              "Accept payment requests from users and route them to external Payment Service Providers (PSPs) like Stripe or PayPal.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Integrate with PSPs to charge cards. Handle success, failure, and pending states.",
              },
            ],
            hints: [
              {
                id: "hint-psp",
                title: "External Integration",
                text: "We don't store credit card numbers (PCI DSS). We use vendors like Stripe.",
                href: "/learn/design-payment-system#key-components",
              },
            ],
            evaluationCriteria:
              "User acknowledges using a PSP (Payment Service Provider) rather than building a processor from scratch.",
            feedbackOnMissing:
              "Are we building a bank? No. We need to talk to Visa/Mastercard via a PSP.",
          },
          {
            id: "refunds",
            label: "Handle Refunds",
            description: "Support partial or full refunds for previous transactions.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Trigger refund flows with the PSP and reverse the internal ledger entries.",
              },
            ],
            hints: [
              {
                id: "hint-reverse",
                title: "Reversing Money",
                text: "Refunds aren't just 'deleting' the payment. They are a new transaction in the opposite direction.",
                href: "/learn/double-entry#example-handling-refunds",
              },
            ],
            evaluationCriteria:
              "User mentions a specific flow for refunds that updates the ledger and calls the PSP.",
            feedbackOnMissing: "Users make mistakes. How do we give them their money back?",
          },
          {
            id: "reconciliation",
            label: "Reconciliation & Ledger",
            description:
              "Ensure internal records match the PSP's records. Detect and fix discrepancies.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Daily batch job to compare internal DB vs PSP settlement reports. Alert on mismatch.",
              },
            ],
            hints: [
              {
                id: "hint-audit",
                title: "Finding Bugs",
                text: "What if our DB says 'Paid' but Stripe says 'Failed'? We need a process to catch this.",
                href: "/learn/double-entry#reconciliation",
              },
            ],
            evaluationCriteria:
              "User defines a 'Reconciliation' process (usually async/batch) to verify data integrity.",
            feedbackOnMissing:
              "Money systems have bugs. How do we prove that every penny is accounted for?",
          },
        ],
      },
    },
    {
      stepType: "nonFunctional" as const,
      order: 1,
      title: "Non-Functional Requirements",
      description: "Define system quality attributes and constraints",
      required: true,
      data: {
        scoreWeight: 20,
        requirements: [
          {
            id: "exactly-once",
            label: "Exactly-Once Semantics (Idempotency)",
            description:
              "A user must never be charged twice for the same order, even on network retries.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Strict idempotency using a unique key (Idempotency-Key) for every transaction.",
              },
            ],
            hints: [
              {
                id: "hint-duplicate",
                title: "Double Charge",
                text: "If I click 'Pay' twice, do I pay double? How do we prevent this?",
                href: "/learn/idempotency-deduplication#idempotency-keys",
              },
            ],
            evaluationCriteria:
              "User emphasizes Idempotency Keys as a mandatory requirement for all state-changing APIs.",
            feedbackOnMissing:
              "The network fails and I retry the request. How do you ensure I don't get charged twice?",
          },
          {
            id: "data-integrity",
            label: "Data Integrity (ACID)",
            description: "Financial data must be consistent. Use ACID compliant databases.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Use SQL (Postgres/MySQL) for strong consistency and transactional support.",
              },
            ],
            hints: [
              {
                id: "hint-sql",
                title: "NoSQL vs SQL",
                text: "For money, we generally prefer SQL. Why? (ACID transactions).",
                href: "/learn/database-caching#sql-vs-nosql-the-real-differences",
              },
            ],
            evaluationCriteria:
              "User chooses a Relational Database (SQL) for the Ledger component.",
            feedbackOnMissing:
              "Would you trust your bank account to a database that is 'eventually' consistent?",
          },
        ],
      },
    },
    {
      stepType: "api" as const,
      order: 2,
      title: "API Design",
      description: "Design the API Interface for payments",
      required: true,
      data: {
        scoreWeight: 20,
        requirements: [
          {
            id: "create-charge",
            scope: "endpoint",
            label: "Create Charge",
            description: "Endpoint to initiate a payment.",
            weight: 10,
            required: true,
            method: "POST",
            correctPath: "/api/v1/payments",
            solutions: [
              {
                text: "POST /payments. Header: Idempotency-Key. Body: { amount, currency, source, reference_id }.",
              },
            ],
            hints: [
              {
                id: "hint-headers",
                title: "Critical Headers",
                text: "Don't forget the Idempotency-Key in the header!",
                href: "/learn/idempotency-deduplication#idempotency-keys",
              },
            ],
            evaluationCriteria: "User defines a POST endpoint including an Idempotency Key.",
            feedbackOnMissing: "How does the frontend tell us to charge the user?",
          },
          {
            id: "webhook-handler",
            scope: "endpoint",
            label: "Webhook Handler",
            description:
              "Endpoint to receive async updates from the PSP (e.g., 'Payment Succeeded').",
            weight: 10,
            required: true,
            method: "POST",
            correctPath: "/api/v1/webhooks/stripe",
            solutions: [
              {
                text: "POST /webhooks/{provider}. Verify signature. Update internal status.",
              },
            ],
            hints: [
              {
                id: "hint-async-status",
                title: "Async Updates",
                text: "Payments take time. The PSP will call US back when it's done. We need a listener.",
                href: "/learn/design-payment-system#why-this-architecture",
              },
            ],
            evaluationCriteria:
              "User includes a Webhook endpoint to handle callbacks from the payment provider.",
            feedbackOnMissing:
              "Stripe processes the card 3 seconds later. How do they tell us it worked?",
          },
        ],
      },
    },
    {
      stepType: "highLevelDesign" as const,
      order: 3,
      title: "High-Level Design",
      description: "Design the architecture components and data flow",
      required: true,
      data: {
        scoreWeight: 30,
        requirements: [
          {
            nodes: [
              { id: "Client", type: "Client" },
              { id: "Payment-Svc", type: "Service", label: "Payment Service" },
              { id: "Ledger-DB", type: "Database", label: "Ledger DB (SQL)" },
              { id: "PSP", type: "Service", label: "Stripe/PayPal" },
              { id: "Reconciler", type: "Service", label: "Reconciliation Job" },
            ],
            edges: [
              {
                id: "Client-Payment",
                from: "Client",
                to: "Payment-Svc",
                description: "Initiate payment with Idempotency Key.",
                weight: 5,
                hints: [
                  {
                    id: "hint-start",
                    title: "Entry",
                    text: "User clicks 'Buy'.",
                    href: "/learn/system-design-structure#high-level-design-design-diagram",
                  },
                ],
              },
              {
                id: "Payment-Ledger",
                from: "Payment-Svc",
                to: "Ledger-DB",
                description:
                  "Write 'Pending' transaction. Use Double-Entry (Debit User, Credit PSP).",
                weight: 10,
                hints: [
                  {
                    id: "hint-double-entry",
                    title: "Accounting",
                    text: "Don't just update a balance. Insert two rows: Source and Destination.",
                    href: "/learn/double-entry#the-double-entry-pattern-in-software",
                  },
                ],
              },
              {
                id: "Payment-PSP",
                from: "Payment-Svc",
                to: "PSP",
                description: "Call external API to capture funds.",
                weight: 5,
                hints: [
                  {
                    id: "hint-external",
                    title: "The Actual Charge",
                    text: "This is where the money moves in the real world.",
                    href: "/learn/design-payment-system#key-components",
                  },
                ],
              },
              {
                id: "PSP-Payment",
                from: "PSP",
                to: "Payment-Svc",
                description: "Webhook callback: Status='Succeeded'. Update Ledger to 'Confirmed'.",
                weight: 5,
                hints: [
                  {
                    id: "hint-callback",
                    title: "Closing the Loop",
                    text: "PSP tells us it worked. We update our DB.",
                    href: "/learn/design-payment-system#webhook-processing",
                  },
                ],
              },
              {
                id: "Reconciler-DB",
                from: "Reconciler",
                to: "Ledger-DB",
                description: "Nightly job checks DB against PSP reports.",
                weight: 5,
                hints: [
                  {
                    id: "hint-safety",
                    title: "Safety Net",
                    text: "The Reconciler is the janitor that cleans up any mess left behind.",
                    href: "/learn/double-entry#reconciliation",
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  ],
};
