## Introduction

You're designing a chat application, and you tell the interviewer: "The client sends messages via HTTP POST and polls for new messages every second."

The interviewer stares at you. "You want the client to make 60 HTTP requests per minute per user? For 10 million users, that's 600 million requests per minute just to check for new messages. Most of which return nothing."

And now you realize that HTTP polling doesn't scale for real-time systems. You need a persistent connection.

---

## HTTP vs WebSockets: The Fundamental Difference

These two protocols solve fundamentally different problems.

### HTTP: Request-Response

HTTP is a one-way street initiated by the client. The server sits there passively, only responding when asked. Every request carries its own headers, every interaction is independent. Great for CRUD operations, page loads, and API calls.

### WebSockets: Persistent Bidirectional Connection

WebSockets flip the model. The client opens a connection once, and it stays open. Both the client AND the server can send data at any time. Great for chat, live feeds, collaborative editing, and gaming.

Here's the mental model:

```
HTTP Polling (wasteful):
Client: "Any new messages?" -> Server: "No"     (100ms wasted)
Client: "Any new messages?" -> Server: "No"     (100ms wasted)
Client: "Any new messages?" -> Server: "Yes! Here's a message"
Client: "Any new messages?" -> Server: "No"     (100ms wasted)

WebSocket (efficient):
Client: Opens connection once
...silence...
Server: "Here's a new message"  (instant push)
...silence...
Server: "Here's another message" (instant push)
Client: "I'm sending a message"  (instant send)
```

With HTTP, you're constantly asking "anything new?" and usually getting "no." With WebSockets, data arrives the instant it exists.

---

## How WebSockets Work

The connection starts as a regular HTTP request, then upgrades. This means WebSockets are compatible with existing infrastructure.

```
1. Client sends HTTP request with "Upgrade: websocket" header
2. Server responds with "101 Switching Protocols"
3. Connection is now upgraded -- full-duplex communication
4. Both sides can send messages freely until one closes the connection
```

**Key properties you should mention in an interview:**

- **Full-duplex:** both sides send simultaneously. HTTP is half-duplex.
- **Low overhead:** after the handshake, frames are tiny. 2-6 bytes of header versus ~800 bytes for HTTP headers.
- **Persistent:** the connection stays open for minutes, hours, or indefinitely. No repeated TCP handshakes.
- **Event-driven:** the server pushes data the moment it happens, not when the client asks.

---

## The Polling Alternatives (and Why They Lose)

Before WebSockets, engineers tried several approaches to fake real-time over HTTP. You should know all of them.

### Short Polling

Client sends an HTTP request every N seconds. Dead simple to implement. Devastatingly wasteful at scale. If you poll every 5 seconds, your messages arrive up to 5 seconds late. And 95% of your responses are empty.

### Long Polling

Client sends an HTTP request, and the server holds it open until there's data or a timeout. Better than short polling -- fewer empty responses, lower latency. But it's still one-directional, still has per-request overhead, and the connection must be re-established after every response. It's a clever hack, not a real solution.

### Server-Sent Events (SSE)

Server pushes events to the client over a persistent HTTP connection. One-directional only: server to client. Good for live feeds and notification streams. But you cannot send data from client to server on the same connection.

| Aspect     | Short Polling        | Long Polling     | SSE              | WebSockets    |
| ---------- | -------------------- | ---------------- | ---------------- | ------------- |
| Direction  | Client to Server     | Client to Server | Server to Client | Bidirectional |
| Latency    | High (poll interval) | Medium           | Low              | Very Low      |
| Overhead   | Very High            | Moderate         | Low              | Very Low      |
| Complexity | Simple               | Moderate         | Simple           | Moderate      |
| Best for   | Simple dashboards    | Moderate updates | Live feeds       | Chat, gaming  |

**Interview recommendation:** Default to WebSockets for any real-time bidirectional system. Use SSE for one-way server pushes. Only mention polling as a fallback.

---

## Scaling WebSockets: The Hard Part

Single-server WebSockets are easy. The real challenge is distributing connections across many servers. This is where [horizontal scaling](/learn/scaling) gets interesting.

### The Problem: Stateful Connections

Each WebSocket connection is tied to a specific server. If Alice is connected to Server A and Bob is connected to Server B, how does Alice's message reach Bob?

Unlike HTTP, which is stateless (any server can handle any request), WebSocket servers must coordinate. This is the fundamental scaling challenge.

### Solution 1: Pub/Sub for Cross-Server Communication

```
Alice -> Server A -> Redis Pub/Sub -> Server B -> Bob
```

When Server A receives Alice's message, it publishes to a [Redis](/learn/database-caching) channel. Server B subscribes to that channel and pushes the message to Bob. Redis Pub/Sub is lightweight and built for exactly this pattern.

### Solution 2: Connection Registry

Store a mapping of `userId -> serverId` in Redis. When a message needs to reach a specific user, look up which server holds their connection and route directly. More targeted than broadcasting, but requires maintaining the registry.

### Sticky Sessions

Your load balancer must route the same user to the same server for WebSocket connections. Use IP-based or cookie-based affinity. If the server goes down, the client must reconnect -- potentially to a different server. This is expected behavior, and your client should handle it gracefully.

---

## Presence Systems: Is the User Online?

This comes up in every chat system design interview. The interviewer wants a specific, practical answer.

```
1. User connects via WebSocket -> mark as "online" in Redis (SET user:123 online EX 60)
2. Client sends heartbeat every 30 seconds -> refresh TTL in Redis
3. If no heartbeat for 60 seconds -> TTL expires -> user is "offline"
4. On explicit disconnect -> immediately mark as "offline"
```

**Why Redis?** TTL handles the "user crashed without disconnecting" case automatically. No cleanup jobs, no stale data. Checking if a user is online is a single Redis GET. And presence is ephemeral data that doesn't belong in your primary database. For more on consistency tradeoffs here, see [CAP Theorem](/learn/cap-theorem).

**The fan-out problem** is worth mentioning. If Alice has 500 contacts, do you push 500 presence updates when she comes online? No. Use lazy loading -- only fetch presence when a user opens a specific chat window. For group chats, batch presence queries rather than individual lookups.

---

## Common Interview Mistakes

### Mistake 1: Using HTTP Polling for Real-Time Chat

"The client will poll every second for new messages."

**Problem:** With 10 million users, that's 10 million requests per second just for polling. Most return nothing.

**Better:** WebSocket connections eliminate polling entirely. The server pushes messages instantly when they arrive.

### Mistake 2: Forgetting That WebSocket Connections Are Stateful

"I'll just put a load balancer in front of the WebSocket servers."

**Problem:** A round-robin load balancer routes requests to different servers. The WebSocket connection lives on Server A, but the next request goes to Server B.

**Better:** Use sticky sessions for WebSocket connections and Redis Pub/Sub for cross-server message routing.

### Mistake 3: Not Discussing How to Handle Disconnections

"Users are always connected."

**Problem:** Mobile devices lose connectivity constantly. The interviewer wants to hear your reconnection strategy, not a fairy tale.

**Better:** On disconnect, buffer messages in the message store. On reconnect, the client fetches missed messages via REST API using the last-received message ID as a cursor.

### Mistake 4: Confusing WebSockets with SSE

"I'll use Server-Sent Events for the chat system."

**Problem:** SSE is one-directional -- server to client only. Chat requires bidirectional communication.

**Better:** WebSockets for bidirectional real-time communication. SSE only for one-way server pushes like notification feeds. Know the difference.

---

## Summary: What to Remember

- **HTTP = request-response, WebSockets = persistent bidirectional connection** -- know when each is appropriate
- WebSockets eliminate polling overhead -- the server pushes data the instant it happens
- The handshake upgrades an HTTP connection to WebSocket (101 Switching Protocols)
- Scaling challenge: WebSocket connections are stateful, tied to a specific server
- Cross-server routing: use Redis Pub/Sub or a connection registry to deliver messages across servers
- Presence systems: Redis with TTL for automatic offline detection on heartbeat timeout
- Always plan for disconnections -- buffer messages server-side, fetch missed messages on reconnect via REST
- SSE is for one-way server pushes, WebSockets are for bidirectional real-time communication

**Key numbers to have ready:**

- HTTP header overhead: ~800 bytes per request
- WebSocket frame overhead: 2-6 bytes
- Heartbeat interval: typically 30 seconds
- Presence TTL: typically 60 seconds

---

**Interview golden rule:**

```
Don't just say "I'll use WebSockets." Explain why HTTP
polling fails at scale, how you handle cross-server routing,
what happens when users disconnect, and how you track presence.
```
