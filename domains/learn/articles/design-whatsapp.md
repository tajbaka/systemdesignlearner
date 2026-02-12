## Introduction

The interviewer says: "Design WhatsApp."

You think, "Store messages in a database, send them between users." Sounds manageable.

Then they follow up: "Alice is connected to Server A in Virginia. Bob is connected to Server B in Frankfurt. How does Alice's message reach Bob in under 200ms? What about a group chat with 200 people? How do you show who's online without hammering your database?"

And now you realize this isn't a CRUD app. It's a distributed real-time messaging system with stateful connections, fan-out challenges, and presence tracking.

Here's how to design one that actually holds up in an interview.

---

## Functional Requirements

**1. One-on-one messaging**

- Users send text messages to each other in real-time
- Messages are delivered instantly when both users are online
- Messages are stored and delivered when the recipient comes back online
- This requires persistent connections because HTTP polling doesn't work at this scale. Use WebSockets.

**2. Group chat**

- Support groups up to 256 members
- A message sent to a group is delivered to all members
- Server-side fan-out: the client sends one message, the server distributes it to all group members
- Need to track who has received and read each message

**3. Online presence (last seen)**

- Show whether a user is "Online" or their "Last Seen" timestamp
- Dedicated Presence Service using Redis with TTL-based heartbeats
- When a user's heartbeat stops arriving, their TTL expires and they go "offline"

That's the core. A chat application delivers messages in real-time between users, handles offline delivery, and tracks presence.

For a deep dive on WebSockets vs HTTP and how real-time connections work, see [WebSockets & Real-Time Communication](/learn/websockets-realtime).

---

## Non-Functional Requirements

**Low latency**

- Messages must arrive in under 200ms for a conversational experience
- Minimize network hops between sender and receiver
- WebSocket connections eliminate HTTP overhead, with no repeated handshakes

**Message ordering**

- Messages must appear in the exact order they were sent
- If Alice says "Hi" then "How are you?", they can't arrive in reverse order
- Use monotonically increasing IDs (Snowflake IDs) for correct ordering
- Partition messages by chat/conversation to maintain per-conversation ordering

For more on availability vs consistency trade-offs in distributed systems, see [CAP Theorem](/learn/cap-theorem).

---

## API Design

Chat systems use two transport protocols:

**WebSocket Events (Real-time messaging)**

```
Connection: WS /chat/connect?userId={id}&token={authToken}
Response: 101 Switching Protocols

Events:
  sendMessage:    { chatId, content, timestamp }
  receiveMessage: { messageId, chatId, senderId, content, timestamp }
  typing:         { chatId, userId }
  ack:            { messageId, status: "delivered" | "read" }
```

**REST API (Chat history)**

```
GET /api/v1/chats/{chatId}/messages?cursor={timestamp}&limit=20

Response:
{
  "messages": [
    {
      "id": "msg-1",
      "content": "Hello",
      "senderId": "user-1",
      "timestamp": "2024-01-01T12:00:00Z",
      "status": "read"
    }
  ],
  "nextCursor": "2024-01-01T11:00:00Z"
}

Status: 200 OK
```

**Why two protocols?**

- WebSockets for live messaging: instant, bidirectional, low overhead
- REST for history: cursor-based pagination, loads old messages when opening a chat
- Real-time messages go through WebSocket; historical messages are fetched via REST

**Cursor-based pagination:**

- Don't use offset pagination for chat history (inserting new messages shifts offsets)
- Use timestamp or message ID as cursor
- Client sends "give me 20 messages before this cursor"

---

## High Level Design

Here's the overall architecture:

![WhatsApp High-level Design](diagram:whatsapp)

### Key Components

**1. Load Balancer**

- Distributes incoming client connections across WebSocket Gateway instances
- Once a WebSocket connection is established, it stays on that gateway for its lifetime
- Ensures even distribution of connections across available gateways

**2. WebSocket Gateway**

- Manages persistent WebSocket connections
- Each gateway server holds thousands of active connections
- Stateful: Alice's connection is on a specific gateway server
- "Dumb pipe" that just manages connections and routes messages. No business logic here.

**3. Chat Service**

- Stateless service that handles message processing
- Receives messages from the gateway, persists them, routes to recipients
- Handles group chat fan-out: one incoming message -> N outgoing messages
- Publishes messages to Redis Pub/Sub for cross-server delivery
- Separated from the gateway so it can scale independently

**4. Message Store (Cassandra)**

- Wide-column NoSQL database optimized for write-heavy workloads
- Chat generates billions of small messages, and SQL databases struggle here
- Partition key: `chatId`, so all messages in a conversation are co-located
- Clustering key: `timestamp`, keeping messages sorted chronologically within each partition
- For more on SQL vs NoSQL trade-offs, see [Databases & Caching](/learn/database-caching).

**5. Redis Pub/Sub**

- Handles cross-server message routing between gateways
- Each gateway subscribes to channels for its connected users
- Chat Service publishes to the recipient's channel; the correct gateway receives and pushes to the client
- Solves the core distributed problem: Alice is on Gateway A, Bob is on Gateway B

**6. Presence Service + Redis**

- Tracks which users are online using heartbeat + TTL pattern
- User connects -> SET userId "online" with 60-second TTL in Redis
- Client sends heartbeat every 30 seconds -> refresh TTL
- No heartbeat for 60 seconds -> TTL expires -> user is "offline"
- Fast: checking presence = single Redis GET (~0.1ms)

### Why This Architecture

**Why a Load Balancer in front of the Gateway?**

With multiple gateway instances, clients need a way to connect to one of them. The load balancer distributes connections evenly. Once a WebSocket is established, the connection stays on that gateway for its lifetime, so the LB only matters at connection time.

**Why WebSocket Gateway is separated from Chat Service?**

The gateway is stateful (holds connections), the chat service is stateless (processes messages). Separating them means you can scale each independently. You need more gateways for more connections, and more chat service instances for more message processing.

For more on horizontal vs vertical scaling patterns, see [Scaling](/learn/scaling).

**Why Cassandra (not PostgreSQL)?**

Chat apps are extremely write-heavy. Billions of small messages per day. Cassandra handles this with distributed writes across nodes. PostgreSQL would need aggressive sharding, and single-node writes become a bottleneck. Cassandra is purpose-built for this access pattern.

**Why Redis Pub/Sub for cross-server routing?**

Alice is on Gateway A, Bob is on Gateway B. The Chat Service needs to get Alice's message to Bob's gateway. Redis Pub/Sub provides a lightweight publish/subscribe mechanism where each gateway subscribes to channels for its connected users. When the Chat Service publishes to Bob's channel, Gateway B picks it up and pushes to Bob's WebSocket.

**Why Redis for presence (not the database)?**

Presence is ephemeral. It changes constantly and doesn't need durability. If Redis crashes, presence just rebuilds as users reconnect. Storing presence in a database would add unnecessary write load for data that's stale within seconds anyway.

---

## Detailed Design

### Message Flow (1-on-1)

```
Alice sends "Hello" to Bob:

1. Alice's client sends message via WebSocket to Gateway A
2. Gateway A forwards to Chat Service
3. Chat Service:
   a. Generate message ID (Snowflake ID for ordering)
   b. Persist to Cassandra (chatId partition)
   c. Look up Bob's gateway: Redis -> "Bob is on Gateway B"
   d. Send message to Gateway B
4. Gateway B pushes message to Bob's WebSocket
5. Bob's client sends ACK -> Chat Service marks as "delivered"
6. Bob opens chat -> Chat Service marks as "read"
```

This is the critical path. Every message goes through persist-then-route. If the server crashes between step 3b and 3d, the message is safe in Cassandra and Bob gets it on reconnect.

### Message Flow (Group Chat)

```
Alice sends "Hello" to Group-1 (200 members):

1. Alice's client sends message via WebSocket to Gateway A
2. Gateway A forwards to Chat Service
3. Chat Service:
   a. Persist message once to Cassandra (chatId: Group-1)
   b. Look up all group members' gateway connections
   c. Fan-out: send to each member's gateway
4. Each gateway pushes to its connected members
5. Offline members: message stored in Cassandra, delivered on reconnect
```

**Fan-out optimization:**

- For small groups (< 256 members): server-side fan-out is fine
- Store the message once, deliver to each connected member
- Offline members fetch missed messages via REST API on reconnect

### Cross-Server Message Routing

The key challenge: Alice is on Gateway A, Bob is on Gateway B. How does the message get across?

```
Option 1: Connection Registry (Redis)
  userId -> gatewayServerId mapping in Redis
  Chat Service looks up Bob's gateway, routes directly

Option 2: Redis Pub/Sub
  Each gateway subscribes to channels for its connected users
  Chat Service publishes to Bob's channel
  Bob's gateway receives and pushes to Bob
```

Both work. Connection registry is simpler for small scale. Pub/Sub scales better with many gateways. In an interview, mention both and explain the trade-off. That's what separates strong answers from average ones.

### Offline Message Handling

```
1. Alice sends message to Bob
2. Chat Service checks: Is Bob online? (Redis presence check)
3. Bob is offline:
   a. Message persisted to Cassandra (always happens)
   b. No real-time delivery attempted
4. Bob comes back online:
   a. Client connects via WebSocket
   b. Client sends last-received message ID
   c. REST call: GET /chats/{chatId}/messages?cursor={lastMessageId}
   d. Server returns all messages after that cursor
```

The key insight: messages are always persisted first, regardless of online status. The real-time push is an optimization, not the source of truth. Cassandra is the source of truth.

### Delivery Receipts

```
Message statuses:
  "sent"      -> Server received and persisted the message
  "delivered" -> Recipient's device received the message (ACK)
  "read"      -> Recipient opened the chat (read event)

Flow:
  Alice sends -> Server stores (sent)
  Server pushes to Bob -> Bob's device ACKs (delivered)
  Bob opens chat -> Client sends read event (read)
  Each status update is pushed back to Alice via WebSocket
```

This gives you the double-check-mark behavior. One check for sent, two checks for delivered, blue checks for read. The interviewer will appreciate you explaining the mechanics behind a feature they use every day.

### Data Model (Cassandra)

```
Table: messages
  Partition Key: chat_id
  Clustering Key: message_id (Snowflake, time-ordered)

  chat_id | message_id | sender_id | content | timestamp | status
  chat-1  | 1001       | alice     | "Hello" | 12:00:01  | read
  chat-1  | 1002       | bob       | "Hi!"   | 12:00:02  | delivered
```

All messages for a conversation are stored together (same partition). Reading chat history is a single partition scan, which is extremely fast in Cassandra. This is exactly the access pattern Cassandra was designed for.

For a structured approach to covering these design decisions, see [System Design Structure](/learn/system-design-structure).

---

## Common Interview Mistakes

### Mistake 1: Using HTTP polling for real-time messaging

"Clients poll every second for new messages."

**Problem:** 10 million users polling every second = 10 million requests/second. Most return nothing. This doesn't scale.

**Better:** WebSocket connections. Server pushes messages instantly. Zero wasted requests.

### Mistake 2: Storing messages in a SQL database

"I'll use PostgreSQL for message storage."

**Problem:** Chat apps generate billions of writes per day. A single PostgreSQL instance can't handle this without aggressive sharding.

**Better:** Cassandra or HBase. Purpose-built for write-heavy, time-series-like data with distributed writes.

### Mistake 3: Ignoring the cross-server routing problem

"The WebSocket server receives the message and sends it to the recipient."

**Problem:** Alice and Bob are on different servers. How does Server A send to Server B?

**Better:** Use a connection registry in Redis or Redis Pub/Sub for cross-server message routing.

### Mistake 4: Not handling offline users

"Users are always connected."

**Problem:** Mobile devices lose connectivity constantly. Messages sent to offline users would be lost.

**Better:** Always persist to Cassandra first. On reconnect, client fetches missed messages via REST using cursor-based pagination.

### Mistake 5: Storing presence in the database

"I'll update a 'last_seen' column in the users table."

**Problem:** With 10 million active users sending heartbeats every 30 seconds, that's 330K writes/second to your user table. Your database melts.

**Better:** Redis with TTL. Ephemeral data belongs in ephemeral storage. If Redis crashes, presence rebuilds as users reconnect.

---

**Interview golden rule:**

Don't just say "I'll use WebSockets for chat." Explain the gateway architecture, how messages route across servers, what happens when users are offline, and why you chose Cassandra over SQL for message storage.
