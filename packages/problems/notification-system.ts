import { buildLinks } from "./article-links";

export const NOTIFICATION_SYSTEM_PROBLEM = {
  slug: "notification-system",
  category: "backend" as const,
  version: {
    versionNumber: 1,
    title: "Notification System",
    description:
      "Design a scalable notification service capable of sending millions of messages across multiple channels (Email, SMS, Push) with prioritization and user preference management.",
    difficulty: "medium" as const,
    timeToComplete: "45 min",
    topic: "System Design",
    links: buildLinks([
      "message-queues",
      "rate-limiting-algorithms",
      "database-caching",
      "idempotency-deduplication",
      "fan-out-strategies",
      "scaling",
      "system-design-structure",
    ]),
    isCurrent: true,
  },
  steps: [
    {
      stepType: "functional" as const,
      order: 0,
      title: "Functional Requirements",
      description: "Define what the Notification System must do",
      required: true,
      data: {
        scoreWeight: 30,
        requirements: [
          {
            id: "multi-channel-support",
            label: "Multi-Channel Support",
            description:
              "Support sending notifications via Email, SMS, and Push Notifications (iOS/Android).",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "System must support pluggable providers for Email (SendGrid/SES), SMS (Twilio), and Push (FCM/APNS).",
              },
            ],
            hints: [
              {
                id: "hint-channels",
                title: "Third-Party Integration",
                text: "We don't build email servers ourselves. How do we integrate with vendors like Twilio or SendGrid?",
                href: "/learn/design-notification-system#functional-requirements",
              },
            ],
            evaluationCriteria:
              "User mentions support for distinct channels and integration with third-party providers.",
            feedbackOnMissing:
              "Are we building our own cell towers? No. We need to integrate with external SMS/Email providers.",
          },
          {
            id: "prioritization",
            label: "Notification Prioritization",
            description:
              "Distinguish between critical alerts (OTP, 2FA) and low-priority messages (Marketing, Newsletters).",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Categorize messages as High (OTP) vs Low (Promo) priority. High priority must be delivered immediately.",
              },
            ],
            hints: [
              {
                id: "hint-priority",
                title: "Critical Path",
                text: "If a user is waiting for a 2FA code, can it wait behind a queue of 1 million marketing emails?",
                href: "/learn/message-queues#priority-queues",
              },
            ],
            evaluationCriteria:
              "User explicitly mentions handling High vs. Low priority messages differently to prevent blocking.",
            feedbackOnMissing:
              "What happens if we send a 2FA code during a massive marketing blast? The user can't log in.",
          },
          {
            id: "user-preferences",
            label: "User Preferences & Opt-out",
            description:
              "Respect user settings for Do-Not-Disturb (DND) and channel preferences (e.g., 'Email only').",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Check user preferences before sending. Allow users to opt-out or set DND hours.",
              },
            ],
            hints: [
              {
                id: "hint-compliance",
                title: "User Control",
                text: "Can we legally or ethically spam users? We need to check their settings before sending.",
                href: "/learn/design-notification-system#functional-requirements",
              },
            ],
            evaluationCriteria:
              "User mentions a mechanism to filter messages based on user consent or settings.",
            feedbackOnMissing:
              "Users get annoyed if they can't turn off notifications. We need a preference check.",
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
            id: "reliability-durability",
            label: "Reliability & No Data Loss",
            description:
              "Notifications should not be lost. Retry mechanisms must be in place for failed deliveries.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "At-least-once delivery using durable queues (Kafka/RabbitMQ). Failed requests to 3rd parties must be retried with exponential backoff.",
              },
            ],
            hints: [
              {
                id: "hint-retry",
                title: "Failure Handling",
                text: "If Twilio is down for 5 seconds, do we drop the SMS? We need a retry queue.",
                href: "/learn/message-queues#dead-letter-queues-dlq",
              },
            ],
            evaluationCriteria:
              "User specifies retry logic and durable queues (Kafka) to prevent data loss.",
            feedbackOnMissing:
              "If the external provider fails, do we just lose the notification? We need retries.",
          },
          {
            id: "scalability-throughput",
            label: "High Throughput & Rate Limiting",
            description: "Handle millions of requests without overwhelming third-party APIs.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Horizontal scaling of workers. Internal rate limiting to respect 3rd party quotas.",
              },
            ],
            hints: [
              {
                id: "hint-throttling-3rdparty",
                title: "Vendor Limits",
                text: "Third-party APIs have rate limits. If we send too fast, they will block us. How do we control our send rate?",
                href: "/learn/rate-limiting-algorithms#token-bucket",
              },
            ],
            evaluationCriteria:
              "User mentions protecting downstream services (3rd parties) using rate limiters or controlled worker pool size.",
            feedbackOnMissing:
              "We can process faster than Twilio can send. How do we stop from getting banned by our vendors?",
          },
        ],
      },
    },
    {
      stepType: "api" as const,
      order: 2,
      title: "API Design",
      description: "Design the API Interface for sending notifications",
      required: true,
      data: {
        scoreWeight: 20,
        requirements: [
          {
            id: "send-notification-endpoint",
            scope: "endpoint",
            label: "Send Notification Endpoint",
            description: "Internal API used by other services to trigger a notification.",
            weight: 20,
            required: true,
            method: "POST",
            correctPath: "/api/v1/notifications",
            solutions: [
              {
                overview: "POST endpoint to trigger a notification (async processing)",
                request:
                  '{ "userId": "user-123", "channel": "email", "content": "Your order has shipped!", "priority": "high" }',
                response: {
                  statusCode: "202",
                  text: '{ "notificationId": "notif-456", "status": "queued" }',
                },
                errors: [
                  {
                    statusCode: "400",
                    text: "Invalid request body or missing required fields",
                  },
                  {
                    statusCode: "404",
                    text: "User not found or preferences not set",
                  },
                  {
                    statusCode: "429",
                    text: "Rate limit exceeded for this user/channel",
                  },
                ],
              },
            ],
            hints: [
              {
                id: "hint-api-payload",
                title: "Request Body",
                text: "What essential data do we need? Who is it for? How do we send it? Is it urgent?",
                href: "/learn/system-design-structure#api-design",
              },
              {
                id: "hint-async-response",
                title: "Response Type",
                text: "Should the client wait for the email to actually send? Or just get a '202 Accepted'?",
                href: "/learn/system-design-structure#api-design",
              },
            ],
            evaluationCriteria:
              "Endpoint description must include: " +
              "1) Request body format (accepts userId, channel, content, and priority), " +
              "2) Response format (returns a notification ID and queued status), " +
              "3) Status code 202 Accepted for async processing, " +
              "4) Error cases (e.g., 400 Invalid request, 404 User not found, 429 Rate limited).",
            feedbackOnMissing:
              "How does the Order Service tell the Notification Service to send an email?",
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
              { id: "Service-A", type: "client", name: "Client", icon: "client" },
              {
                id: "Notif-Service",
                type: "notification-service",
                name: "Notification Service",
                icon: "service",
              },
              { id: "DB-Prefs", type: "user-prefs-db", name: "User Prefs DB", icon: "sql" },
              { id: "Queue-Kafka", type: "message-queue", name: "Kafka/RabbitMQ", icon: "queue" },
              {
                id: "Workers",
                type: "notification-workers",
                name: "Notification Workers",
                icon: "service",
              },
              {
                id: "Third-Party",
                type: "third-party-service",
                name: "Twilio/SendGrid",
                icon: "service",
              },
              {
                id: "DLQ",
                type: "dead-letter-queue",
                name: "Dead Letter Queue",
                icon: "queue",
              },
            ],
            edges: [
              {
                id: "Client-NotifSvc",
                from: "Service-A",
                to: "Notif-Service",
                description:
                  "Internal services trigger notifications via API (e.g., 'Order Placed').",
                weight: 4,
                hints: [
                  {
                    id: "hint-ingestion",
                    title: "Ingestion",
                    text: "The entry point for all notification requests.",
                    href: "/learn/design-notification-system#delivery-pipeline",
                  },
                ],
              },
              {
                id: "NotifSvc-DB",
                from: "Notif-Service",
                to: "DB-Prefs",
                description:
                  "Service validates request and checks User Preferences (Opt-in/out) before processing.",
                weight: 4,
                hints: [
                  {
                    id: "hint-filtering",
                    title: "Filtering",
                    text: "Check if the user actually wants this notification before queuing it.",
                    href: "/learn/database-caching#the-standard-pattern-cache-aside",
                  },
                ],
              },
              {
                id: "NotifSvc-Queue",
                from: "Notif-Service",
                to: "Queue-Kafka",
                description:
                  "Valid requests are pushed to a Message Queue to decouple ingestion from sending.",
                weight: 8,
                hints: [
                  {
                    id: "hint-decoupling",
                    title: "Decoupling",
                    text: "Use a queue to handle bursts and ensure durability. Ideally separate topics for High/Low priority.",
                    href: "/learn/message-queues#the-core-concept-decouple-producers-from-consumers",
                  },
                ],
              },
              {
                id: "Queue-Workers",
                from: "Queue-Kafka",
                to: "Workers",
                description:
                  "Workers pull messages, format content (templates), and prepare for sending.",
                weight: 4,
                hints: [
                  {
                    id: "hint-processing",
                    title: "Async Workers",
                    text: "Scalable workers process the backlog independently of the API.",
                    href: "/learn/scaling#horizontal-scaling-scale-out",
                  },
                ],
              },
              {
                id: "Workers-ThirdParty",
                from: "Workers",
                to: "Third-Party",
                description:
                  "Workers call external APIs (Twilio, SendGrid) to deliver the message. Handles retries.",
                weight: 4,
                hints: [
                  {
                    id: "hint-external-call",
                    title: "Final Delivery",
                    text: "The actual transmission happens via external vendors.",
                    href: "/learn/design-notification-system#provider-failover",
                  },
                ],
              },
              {
                id: "Workers-DLQ",
                from: "Workers",
                to: "DLQ",
                description:
                  "Messages that fail after max retries are moved to the Dead Letter Queue for inspection and replay.",
                weight: 4,
                hints: [
                  {
                    id: "hint-dlq-worker",
                    title: "Dead Letter Queue",
                    text: "After exhausting retries, failed messages go to a DLQ instead of being lost. Operations can inspect and replay them.",
                    href: "/learn/design-notification-system#retry-and-failure-handling",
                  },
                ],
              },
              {
                id: "Queue-DLQ",
                from: "Queue-Kafka",
                to: "DLQ",
                description:
                  "Poison messages that can't be processed are routed from Kafka to the Dead Letter Queue.",
                weight: 2,
                hints: [
                  {
                    id: "hint-dlq-kafka",
                    title: "Poison Messages",
                    text: "Messages that repeatedly fail processing are moved to the DLQ to prevent them from blocking the queue.",
                    href: "/learn/design-notification-system#retry-and-failure-handling",
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
