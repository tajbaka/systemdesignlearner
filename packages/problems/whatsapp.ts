import { buildLinks } from "./article-links";

export const WHATSAPP_PROBLEM = {
  slug: "design-whatsapp",
  category: "backend" as const,
  version: {
    versionNumber: 1,
    title: "Design WhatsApp",
    description:
      "Design a real-time chat application like WhatsApp or Messenger that supports one-on-one and group chats, online presence indicators, and persistent message storage.",
    difficulty: "hard" as const,
    timeToComplete: "60 min",
    topic: "System Design",
    links: buildLinks([
      "websockets-realtime",
      "database-caching",
      "wide-column-databases",
      "fan-out-strategies",
      "cap-theorem",
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
      description: "Define the core features of the Chat Application",
      required: true,
      data: {
        scoreWeight: 30,
        requirements: [
          {
            id: "one-on-one-chat",
            label: "1-on-1 Messaging",
            description: "Users should be able to send text messages to another user in real-time.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Real-time delivery of messages between two users using WebSockets (persistent connections).",
              },
            ],
            hints: [
              {
                id: "hint-protocol",
                title: "Communication Protocol",
                text: "HTTP is too slow for real-time chat. What protocol keeps a connection open for instant bi-directional data?",
                href: "/learn/websockets-realtime#websockets-persistent-bidirectional-connection",
              },
            ],
            evaluationCriteria:
              "User identifies WebSockets (or long-polling) as the primary transport mechanism.",
            feedbackOnMissing:
              "If we use standard HTTP, the user has to refresh to get messages. We need WebSockets.",
          },
          {
            id: "group-chat",
            label: "Group Chat",
            description:
              "Support groups (e.g., up to 256 members) where a message sent by one is received by all.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Server-side fan-out of messages to all group members' connected sessions. Handle tracking of who has read the message.",
              },
            ],
            hints: [
              {
                id: "hint-fanout",
                title: "Message Fan-out",
                text: "When a user sends a message to a group of 100 people, does the client send 100 requests, or does the server handle it?",
                href: "/learn/websockets-realtime#scaling-websockets-the-hard-part",
              },
            ],
            evaluationCriteria:
              "User discusses the 'Fan-out' mechanism on the server side (sending the message to multiple connected sessions).",
            feedbackOnMissing:
              "How does a message get from Alice to Bob, Charlie, and Dave simultaneously?",
          },
          {
            id: "presence-system",
            label: "Online Presence (Last Seen)",
            description: "Show whether a user is currently 'Online' or when they were 'Last Seen'.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Dedicated Presence Service tracks heartbeat signals using Redis (ephemeral storage with TTL). Update 'Last Seen' timestamp on disconnect.",
              },
            ],
            hints: [
              {
                id: "hint-heartbeat",
                title: "Heartbeats",
                text: "How do we know a user is still there if they haven't sent a message? They need to send a periodic signal.",
                href: "/learn/websockets-realtime#presence-systems-is-the-user-online",
              },
            ],
            evaluationCriteria:
              "User defines a dedicated Presence Service using ephemeral storage (like Redis) to track active users.",
            feedbackOnMissing:
              "Users want to know if their friends are online. How do we track this status efficiently?",
          },
          {
            id: "receipts",
            label: "Delivery Receipts",
            description:
              "Support Sent (Single Tick), Delivered (Double Tick), and Read (Blue Tick) statuses.",
            weight: 0,
            required: false,
            solutions: [
              {
                text: "Update message metadata when the recipient's device acknowledges receipt or the user opens the chat.",
              },
            ],
            hints: [
              {
                id: "hint-ack",
                title: "Acknowledgments",
                text: "The server needs to know when the device received the data to update the status in the DB.",
                href: "/learn/design-whatsapp#delivery-receipts",
              },
            ],
            evaluationCriteria:
              "User mentions updating the message status based on client acknowledgments (ACKs).",
            feedbackOnMissing: "How does Alice know Bob actually got the message?",
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
            id: "low-latency",
            label: "Low Latency",
            description:
              "Messages must be delivered in near real-time (<200ms) for a conversational experience.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Minimize hops; use persistent WebSocket connections to avoid handshake overhead.",
              },
            ],
            hints: [
              {
                id: "hint-latency",
                title: "Real-time Expectations",
                text: "Chat feels broken if there's a delay. Optimizing the connection path is critical.",
                href: "/learn/websockets-realtime#how-websockets-work",
              },
            ],
            evaluationCriteria:
              "User emphasizes low latency and explains how WebSockets help achieve this.",
            feedbackOnMissing:
              "Chat needs to feel instant. What latency targets are we aiming for?",
          },
          {
            id: "consistency-ordering",
            label: "Message Ordering",
            description: "Messages must appear in the exact order they were sent.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Ensure messages are stored and retrieved using a monotonic ID or timestamp (e.g., Snowflake ID).",
              },
            ],
            hints: [
              {
                id: "hint-sequencing",
                title: "Sequence Consistency",
                text: "If I say 'Hi' then 'How are you', they shouldn't arrive as 'How are you' then 'Hi'.",
                href: "/learn/cap-theorem#consistency-c",
              },
            ],
            evaluationCriteria:
              "User mentions using timestamps or sequence IDs (Snowflake/ULID) to sort messages correctly.",
            feedbackOnMissing: "How do we prevent messages from showing up out of order?",
          },
        ],
      },
    },
    {
      stepType: "api" as const,
      order: 2,
      title: "API Design",
      description: "Design the API Interface (HTTP & WebSocket)",
      required: true,
      data: {
        scoreWeight: 20,
        requirements: [
          {
            id: "fetch-history",
            scope: "endpoint",
            label: "Fetch Chat History",
            description: "REST API to load previous messages when opening a chat window.",
            weight: 20,
            required: true,
            method: "GET",
            correctPath: "/api/v1/chats/{chatId}/messages",
            solutions: [
              {
                overview: "GET endpoint to fetch paginated chat history",
                request: "GET /api/v1/chats/{chatId}/messages?cursor={timestamp}&limit=20",
                response: {
                  statusCode: "200",
                  text: '{ "messages": [{ "id": "msg-1", "content": "Hello", "senderId": "user-1", "timestamp": "2024-01-01T12:00:00Z" }], "nextCursor": "2024-01-01T11:00:00Z" }',
                },
                errors: [
                  {
                    statusCode: "404",
                    text: "Chat not found",
                  },
                  {
                    statusCode: "403",
                    text: "Not a participant in this chat",
                  },
                ],
              },
            ],
            hints: [
              {
                id: "hint-pagination",
                title: "Pagination Strategy",
                text: "Chats can have thousands of messages. We shouldn't load them all at once. Use Cursor-based pagination.",
                href: "/learn/database-caching#sql-vs-nosql-the-real-differences",
              },
            ],
            evaluationCriteria:
              "Endpoint description must include: " +
              "1) Takes chatId as path parameter and pagination params (cursor/limit), " +
              "2) Returns a list of messages with nextCursor for pagination, " +
              "3) Success status code (200), " +
              "4) Error cases (e.g., 404 Chat not found, 403 Not authorized).",
            feedbackOnMissing:
              "When I open a chat, I need to see the last 20 messages. How do I fetch them?",
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
              { id: "Client", type: "client", name: "Client", icon: "client" },
              { id: "LB", type: "load-balancer", name: "Load Balancer", icon: "load-balancer" },
              {
                id: "WS-Gateway",
                type: "websocket-gateway",
                name: "WebSocket Gateway",
                icon: "service",
              },
              { id: "Chat-Svc", type: "chat-service", name: "Chat Service", icon: "service" },
              {
                id: "Presence-Svc",
                type: "presence-service",
                name: "Presence Service",
                icon: "service",
              },
              { id: "Redis-Cache", type: "redis-cache", name: "Redis (Presence)", icon: "cache" },
              { id: "Redis-PubSub", type: "redis-pubsub", name: "Redis Pub/Sub", icon: "cache" },
              { id: "Msg-Store", type: "message-store", name: "Cassandra", icon: "nosql" },
            ],
            edges: [
              {
                id: "Client-LB",
                from: "Client",
                to: "LB",
                description:
                  "Client connects through a Load Balancer that routes to the appropriate WebSocket Gateway instance.",
                weight: 5,
                hints: [
                  {
                    id: "hint-lb",
                    title: "Load Balancing WebSockets",
                    text: "A load balancer distributes incoming connections across gateway instances. Once a WebSocket connection is established, it stays on that gateway.",
                    href: "/learn/scaling#horizontal-scaling-scale-out",
                  },
                ],
              },
              {
                id: "LB-Gateway",
                from: "LB",
                to: "WS-Gateway",
                description:
                  "Load Balancer routes the connection to a WebSocket Gateway. The gateway manages long-lived, stateful connections.",
                weight: 5,
                hints: [
                  {
                    id: "hint-stateful",
                    title: "Stateful Connection",
                    text: "Since this server holds the open connection, we need to know exactly which server the user is connected to.",
                    href: "/learn/websockets-realtime#the-problem-stateful-connections",
                  },
                ],
              },
              {
                id: "Gateway-ChatSvc",
                from: "WS-Gateway",
                to: "Chat-Svc",
                description:
                  "Gateway passes incoming messages to the Chat Service for processing/persistence.",
                weight: 5,
                hints: [
                  {
                    id: "hint-stateless-logic",
                    title: "Separation of Concerns",
                    text: "Keep the Gateway dumb (just connections). Move logic (storage, grouping) to a stateless Chat Service.",
                    href: "/learn/scaling#horizontal-scaling-scale-out",
                  },
                ],
              },
              {
                id: "ChatSvc-DB",
                from: "Chat-Svc",
                to: "Msg-Store",
                description:
                  "Persist messages. Uses Wide-Column Store (Cassandra) for extremely high write throughput.",
                weight: 5,
                hints: [
                  {
                    id: "hint-write-heavy",
                    title: "Database Choice",
                    text: "Chat apps generate billions of small messages. SQL struggles here. Wide-column stores (Cassandra) are optimized for this.",
                    href: "/learn/database-caching#sql-vs-nosql-the-real-differences",
                  },
                ],
              },
              {
                id: "ChatSvc-PubSub",
                from: "Chat-Svc",
                to: "Redis-PubSub",
                description:
                  "Chat Service publishes messages to Redis Pub/Sub for cross-server routing. Each gateway subscribes to channels for its connected users.",
                weight: 5,
                hints: [
                  {
                    id: "hint-cross-server",
                    title: "Cross-Server Routing",
                    text: "Alice is on Gateway A, Bob is on Gateway B. Redis Pub/Sub lets the Chat Service publish to Bob's channel, which Gateway B subscribes to.",
                    href: "/learn/websockets-realtime#scaling-websockets-the-hard-part",
                  },
                ],
              },
              {
                id: "Gateway-Presence",
                from: "WS-Gateway",
                to: "Presence-Svc",
                description: "Gateway sends 'Heartbeats' to Presence Service when user is active.",
                weight: 5,
                hints: [
                  {
                    id: "hint-status-update",
                    title: "Updating Status",
                    text: "When the socket connects or sends data, mark the user as 'Online' in Redis.",
                    href: "/learn/database-caching#cache-speed",
                  },
                ],
              },
              {
                id: "Presence-Redis",
                from: "Presence-Svc",
                to: "Redis-Cache",
                description:
                  "Stores UserID -> Status mapping with a TTL (Time To Live). If no heartbeat, TTL expires -> User Offline.",
                weight: 5,
                hints: [
                  {
                    id: "hint-ttl",
                    title: "Auto-Expiry",
                    text: "Use Redis TTL features to automatically set a user to offline if the app crashes.",
                    href: "/learn/database-caching#cache-eviction-lru-vs-lfu",
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
